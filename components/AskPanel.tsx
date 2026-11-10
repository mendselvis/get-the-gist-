"use client";

import { useEffect, useRef, useState } from "react";
import VideoPanel from "@/components/VideoPanel";
import { MAX_HISTORY_MESSAGES, MAX_QUESTION_CHARS, askContext, type Plan } from "@/lib/schema";
import type { WebSource } from "@/lib/otari";
import type { StoredMessage } from "@/lib/sessions";

type Mini = { status: "loading" } | { status: "ready"; plan: Plan } | { status: "error"; text: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  status?: string;
  notice?: string;
  sources?: WebSource[];
  error?: string;
  streaming?: boolean;
  mini?: Mini;
};

const SCENE_MARKER = /\s*\[\[\s*scene\s+(\d+)\s*\]\]/gi;
// a URL never ends on punctuation, so the sentence keeps its full stop
const URL_PATTERN = /https?:\/\/[^\s)\]>]*[^\s)\]>.,;:!?]/g;

// pulls the [[scene N]] markers out of an answer, and removes any URL that search didn't return
function cleanAnswer(text: string, sceneCount: number, sources: WebSource[] = []) {
  const scenes = new Set<number>();
  for (const m of text.matchAll(SCENE_MARKER)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= sceneCount) scenes.add(n);
  }
  const allowed = new Set(sources.map((s) => s.url));
  const body = text
    .replace(SCENE_MARKER, "")
    // a markdown link keeps its words; its URL survives only if search returned it
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, u: string) => (allowed.has(u) ? `${label} (${u})` : label))
    .replace(URL_PATTERN, (u) => (allowed.has(u) ? u : "[link removed]"))
    .trim();
  return { body, scenes: [...scenes].sort((a, b) => a - b) };
}

// **bold** and *italic* are the only formatting the tutor uses
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
          <em key={j}>{part.slice(1, -1)}</em>
        ) : (
          part
        )
      )}
    </>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="mt-2 first:mt-0 whitespace-pre-wrap">
            <Inline text={p} />
          </p>
        ))}
    </>
  );
}

// what gets saved: finished messages only, never streaming state or a mini video still loading
function toStored(messages: Message[]): StoredMessage[] {
  return messages.map((m) => {
    const stored: StoredMessage = { role: m.role, content: m.content };
    if (m.notice) stored.notice = m.notice;
    if (m.sources?.length) stored.sources = m.sources;
    if (m.error) stored.error = m.error;
    if (m.mini && m.mini.status !== "loading") stored.mini = m.mini;
    return stored;
  });
}

export default function AskPanel({
  plan,
  onJump,
  initialMessages,
  onMessagesChange,
}: {
  plan: Plan;
  onJump: (sceneIndex: number) => void;
  initialMessages?: StoredMessage[];
  onMessagesChange?: (messages: StoredMessage[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages ?? []);

  // report the conversation whenever it settles, skipping no-op saves (such as on first render)
  const lastSaved = useRef(JSON.stringify(toStored(initialMessages ?? [])));
  useEffect(() => {
    if (!onMessagesChange || messages.some((m) => m.streaming || m.mini?.status === "loading")) return;
    const stored = toStored(messages);
    const json = JSON.stringify(stored);
    if (json === lastSaved.current) return;
    lastSaved.current = json;
    onMessagesChange(stored);
  }, [messages, onMessagesChange]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const update = (i: number, patch: Partial<Message> | ((m: Message) => Partial<Message>)) =>
    setMessages((ms) => ms.map((m, k) => (k === i ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)));

  async function ask(question: string) {
    const q = question.trim().slice(0, MAX_QUESTION_CHARS);
    if (!q || busy) return;
    // history the server sees: the last 10 finished messages, markers stripped
    const history = messages
      .filter((m) => m.content && !m.error)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.role === "assistant" ? cleanAnswer(m.content, 0).body : m.content }));
    const index = messages.length + 1;
    setMessages((ms) => [...ms, { role: "user", content: q }, { role: "assistant", content: "", streaming: true, status: "Thinking…" }]);
    setInput("");
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history, context: askContext(plan) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sorry, I couldn't answer that just now.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.t === "delta") update(index, (m) => ({ content: m.content + ev.text, status: undefined }));
          else if (ev.t === "status") update(index, { status: ev.text });
          else if (ev.t === "notice") update(index, { notice: ev.text });
          else if (ev.t === "sources") update(index, { sources: ev.items });
          else if (ev.t === "error") update(index, { error: ev.text });
        }
      }
    } catch (err) {
      if (!ctrl.signal.aborted) update(index, { error: err instanceof Error ? err.message : "Sorry, something went wrong." });
    } finally {
      update(index, { streaming: false, status: undefined });
      setBusy(false);
    }
  }

  async function showMe(i: number) {
    const answer = cleanAnswer(messages[i].content, plan.scenes.length).body;
    update(i, { mini: { status: "loading" } });
    try {
      const res = await fetch("/api/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, title: plan.title, slideText: plan.slideText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      update(i, { mini: { status: "ready", plan: data.plan } });
    } catch (err) {
      update(i, { mini: { status: "error", text: err instanceof Error && err.message ? err.message : "Couldn't make that video." } });
    }
  }

  const left = MAX_QUESTION_CHARS - input.length;

  return (
    <section aria-label="Ask about this slide" className="mt-8 rounded-[28px] border border-line bg-white p-5 text-[#111] sm:p-7">
      <h2 className="font-serif text-3xl leading-tight">Ask about this slide</h2>
      <p className="mt-1 text-muted">Questions are answered from your slide and the video above.</p>

      {plan.suggestions && plan.suggestions.length > 0 && messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {plan.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={busy}
              className="rounded-full border border-line bg-sky/50 px-4 py-2 text-left text-sm font-medium text-[#111] transition-colors hover:border-[#111]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <ol className="mt-5 space-y-4" aria-live="polite">
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <li key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#111] px-4 py-3 text-white">
                  {m.content}
                </li>
              );
            }
            const { body, scenes } = cleanAnswer(m.content, plan.scenes.length, m.sources);
            return (
              <li key={i} className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#fafafa] px-4 py-3 leading-relaxed">
                {m.notice && <p className="mb-2 rounded-xl bg-butter/60 px-3 py-2 text-sm">{m.notice}</p>}
                {body ? <Paragraphs text={body} /> : m.status && <p className="text-muted">{m.status}</p>}
                {m.error && <p className="mt-2 rounded-xl bg-blush px-3 py-2 text-sm font-medium">{m.error}</p>}

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold">Sources found by web search</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {m.sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            {s.title}
                          </a>{" "}
                          <span className="text-muted">({new URL(s.url).hostname})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!m.streaming && body && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scenes.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onJump(n - 1)}
                        className="h-9 rounded-full border border-[#111] bg-white px-3.5 text-sm font-medium hover:bg-[#111]/5"
                      >
                        Jump to scene {n}
                      </button>
                    ))}
                    {(!m.mini || m.mini.status === "error") && (
                      <button
                        type="button"
                        onClick={() => showMe(i)}
                        className="h-9 rounded-full bg-[#111] px-3.5 text-sm font-medium text-white hover:bg-black/80"
                      >
                        Show me
                      </button>
                    )}
                  </div>
                )}

                {m.mini?.status === "loading" && <p className="mt-3 text-sm text-muted">Making a short video of this answer…</p>}
                {m.mini?.status === "error" && <p className="mt-2 text-sm font-medium">{m.mini.text}</p>}
                {m.mini?.status === "ready" && (
                  <div className="mt-4">
                    <VideoPanel plan={m.mini.plan} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            maxLength={MAX_QUESTION_CHARS}
            rows={2}
            placeholder="Ask a follow-up question…"
            className="block min-h-12 flex-1 resize-y rounded-2xl border border-line bg-[#fafafa] px-4 py-3 text-[16px] text-[#111] placeholder:text-label focus:border-[#111] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-12 shrink-0 rounded-full bg-[#111] px-5 font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-[#a1a1aa]"
          >
            {busy ? "Answering…" : "Ask"}
          </button>
        </div>
        <p className="mt-1.5 text-sm text-label">{left} characters left · Enter to send, Shift+Enter for a new line</p>
      </form>
    </section>
  );
}
