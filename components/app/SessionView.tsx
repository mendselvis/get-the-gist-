"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { renderForModel } from "@/lib/pdfRender";
import type { Plan } from "@/lib/schema";
import { createSession, getSession, updateSession, type Session, type StoredMessage } from "@/lib/sessions";
import { useDeck, useSessions } from "./AppContext";
import { Explanation } from "./Explanation";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function EditableTitle({ session }: { session: Session }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [draft, setDraft] = useState(session.title);

  async function save() {
    const next = draft.trim().slice(0, 120);
    setEditing(false);
    if (!next || next === title) return setDraft(title);
    setTitle(next);
    await updateSession(session.id, { title: next }, { touch: false });
  }

  if (editing) {
    return (
      <input
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        aria-label="Explanation title"
        className="w-full rounded-2xl border border-[#111] bg-white px-3 py-1 font-serif text-4xl leading-tight text-[#111] focus:outline-none sm:text-5xl"
      />
    );
  }
  return (
    <div className="flex items-start gap-2">
      <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] sm:text-5xl">{title}</h1>
      <button
        type="button"
        onClick={() => {
          setDraft(title);
          setEditing(true);
        }}
        aria-label="Rename"
        className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#111] hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// /app/[id]: a saved session with its video and chat restored, ready to keep asking
export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { deck } = useDeck();
  const { setActiveId } = useSessions();
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "ready"; session: Session }>({ status: "loading" });

  useEffect(() => {
    setActiveId(id);
    let alive = true;
    getSession(id)
      .then((s) => alive && setState(s ? { status: "ready", session: s } : { status: "missing" }))
      .catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
      setActiveId(null);
    };
  }, [id, setActiveId]);

  const saveMessages = useCallback((messages: StoredMessage[]) => void updateSession(id, { messages }), [id]);
  const [solving, setSolving] = useState<{ question: string } | { error: string } | null>(null);

  // solve one of the slide's extra questions as its own explanation (needs the same PDF still open)
  async function solveQuestion(session: Session, question: string) {
    if (!deck || deck.fileName !== session.pdfName) return;
    setSolving({ question });
    try {
      const image = await renderForModel(deck.pdf, session.pageNumber);
      if (!image) throw new Error("That slide is too detailed to send.");
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg", approach: "solve", focus: question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const plan = data.plan as Plan;
      const next = await createSession({
        title: plan.title,
        pdfName: session.pdfName,
        pageNumber: session.pageNumber,
        slideThumbnail: session.slideThumbnail,
        plan,
        meta: `${data.provider}, ${(data.ms / 1000).toFixed(1)}s`,
      });
      setSolving(null);
      router.push(`/app/${next.id}`);
    } catch (err) {
      setSolving({ error: err instanceof Error ? err.message : "Couldn’t solve that question." });
    }
  }

  if (state.status === "loading") {
    return <div className="mx-auto max-w-5xl px-6 pt-16 text-muted" role="status">Opening your explanation…</div>;
  }
  if (state.status === "missing") {
    return (
      <main className="mx-auto max-w-xl px-6 pt-20 text-center">
        <h1 className="font-serif text-4xl">This explanation isn’t here</h1>
        <p className="mt-3 text-muted">It may have been deleted, or it was saved in a different browser.</p>
        <Link href="/app/new" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#111] px-5 font-medium text-white hover:bg-black/80">
          + New explanation
        </Link>
      </main>
    );
  }

  const { session } = state;
  const sameDeckOpen = deck?.fileName === session.pdfName;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:pl-16">
      {/* keyed by title too: this page is kept alive while hidden, and the sidebar may rename it meanwhile */}
      <EditableTitle key={`${session.id}:${session.title}`} session={session} />
      <p className="mt-2 text-sm text-muted">
        Slide {session.pageNumber} of {session.pdfName} · {dateFormat.format(session.createdAt)}
      </p>

      <Explanation
        key={session.id}
        plan={session.plan}
        meta={session.meta}
        initialMessages={session.messages}
        onMessagesChange={saveMessages}
        onSolveQuestion={(q) => solveQuestion(session, q)}
        solveUnavailable={
          solving && "question" in solving
            ? "Solving that question…"
            : sameDeckOpen
              ? undefined
              : `To solve these, open ${session.pdfName} again with New explanation, then come back.`
        }
        actions={
          sameDeckOpen ? (
            <button
              type="button"
              onClick={() => router.push("/app/new")}
              className="h-11 rounded-full border border-[#111] bg-white px-5 text-[15px] font-medium text-[#111] hover:bg-[#111]/5"
            >
              Explain another slide from this deck
            </button>
          ) : null
        }
      />
      {solving && "error" in solving && (
        <p role="alert" className="mt-4 rounded-2xl bg-blush px-5 py-3 font-medium">
          {solving.error}
        </p>
      )}
    </main>
  );
}
