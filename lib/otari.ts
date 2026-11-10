import OpenAI from "openai";

// Shared Otari access. Keys stay on the server and are never logged.
export const OTARI_BASE_URL = "https://otari.ai/api/v1";
const DEFAULT_CHAT_MODEL = "mistralai/ministral-3-8b";

export function otariClient() {
  const key = process.env.OTARI_API_KEY;
  if (!key) throw new Error("OTARI_API_KEY missing");
  // Retries cover connections that can't be opened in time (Node's fetch gives up after 10s, which a slow
  // network hits) and temporary gateway errors. Budget refusals (403) are never retried, and every call
  // is still bounded by its caller's own timeout.
  return new OpenAI({ apiKey: key, baseURL: OTARI_BASE_URL, defaultHeaders: { "Otari-Key": key }, maxRetries: 2 });
}

// slide reading and plan building: main model, then its fallback
export function planModels() {
  return [process.env.OTARI_MODEL, process.env.OTARI_FALLBACK_MODEL]
    .map((m) => m?.trim())
    .filter((m): m is string => !!m);
}

// follow-up questions are a separate role on a smaller open-weight model
export function chatModel() {
  return process.env.OTARI_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL;
}

export type WebSource = { url: string; title: string };
export type SearchResult = { sources: WebSource[] } | { error: string };

// what Otari adds to a chat completion when it ran a gateway tool
type OtariToolCall = {
  type: string;
  status: string;
  sources?: { url: string; title?: string | null }[];
};

// Runs Otari's web search through the chat model. Only URLs that come back in
// otari_tool_calls are returned, never anything the model writes itself.
export async function searchSources(topic: string, signal?: AbortSignal): Promise<SearchResult> {
  try {
    const res = await otariClient().chat.completions.create(
      {
        model: chatModel(),
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content: `Search the web for 2 to 4 reliable sources (textbooks, university pages, official documentation) about this topic, then reply with only the word done.\nTopic: ${topic}`,
          },
        ],
        // a gateway tool, not in the OpenAI SDK's types
        tools: [{ type: "otari_web_search", max_uses: 2 } as unknown as OpenAI.Chat.ChatCompletionTool],
      },
      { signal, timeout: 45000 }
    );
    const calls = ((res as unknown as { otari_tool_calls?: OtariToolCall[] }).otari_tool_calls ?? []).filter(
      (c) => c.type === "web_search" && c.status === "completed"
    );
    const seen = new Set<string>();
    const sources: WebSource[] = [];
    for (const s of calls.flatMap((c) => c.sources ?? [])) {
      if (!/^https?:\/\//.test(s.url) || seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push({ url: s.url, title: (s.title || new URL(s.url).hostname).slice(0, 140) });
    }
    if (sources.length === 0) return { error: "the search found no sources" };
    return { sources: sources.slice(0, 4) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (/web search is not enabled/i.test(detail)) return { error: "web search isn't switched on for this app yet" };
    return { error: "the web search didn't work" };
  }
}
