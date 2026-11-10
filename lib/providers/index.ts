import { PlanSchema } from "@/lib/schema";
import { callAnthropic } from "./anthropic";
import { callGemini } from "./gemini";
import { callGroq } from "./groq";
import { callOtari } from "./otari";
import { extractJson, type SlideInput } from "./shared";

type ProviderName = "otari" | "gemini" | "groq" | "anthropic";

const callers: Record<ProviderName, (i: SlideInput, s: AbortSignal) => Promise<string>> = {
  otari: callOtari,
  gemini: callGemini,
  groq: callGroq,
  anthropic: callAnthropic,
};

const TIMEOUT_MS = 15000;
// otari can make up to 4 calls (2 models x 1 JSON retry), each capped at 45s inside otari.ts
const TIMEOUT_MS_BY_PROVIDER: Partial<Record<ProviderName, number>> = { otari: 100000 };

const DEFAULT_FALLBACKS = "anthropic,gemini,groq";

// a provider is only tried when its key is set, so the app runs with the Otari variables alone
const KEY_VARS: Record<ProviderName, string> = {
  otari: "OTARI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};
const isProvider = (p: string): p is ProviderName => p in callers;

function providerOrder(): ProviderName[] {
  // MODEL_PROVIDER is the older name for LLM_PROVIDER
  const wanted = (process.env.LLM_PROVIDER || process.env.MODEL_PROVIDER || "otari").trim();
  if (!isProvider(wanted)) console.warn("[plan] LLM_PROVIDER is not one of otari, anthropic, gemini, groq; using otari");
  const first = isProvider(wanted) ? wanted : "otari";
  const rest = (process.env.FALLBACK_PROVIDERS || DEFAULT_FALLBACKS)
    .split(",")
    .map((s) => s.trim())
    .filter(isProvider);
  return [...new Set([first, ...rest])].filter((p) => !!process.env[KEY_VARS[p]]?.trim());
}

// deadline: a Date.now() time every provider call must finish by, so the route answers before the host's limit
export async function generatePlan(input: SlideInput, deadline = Infinity) {
  const order = providerOrder();
  if (order.length === 0) throw new Error("No model provider is configured: set OTARI_API_KEY");
  for (const name of order) {
    const started = Date.now();
    const budget = Math.min(TIMEOUT_MS_BY_PROVIDER[name] ?? TIMEOUT_MS, deadline - started);
    if (budget <= 0) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), budget);
    try {
      const text = await callers[name](input, ctrl.signal);
      const plan = PlanSchema.parse(extractJson(text));
      const ms = Date.now() - started;
      const repaired = plan.scenes.filter((s) => s.repaired).length;
      console.log(`[plan] ${name} ok ${ms}ms, mode ${plan.mode}, ${plan.scenes.length} scenes${repaired ? `, ${repaired} salvaged` : ""}`);
      return { plan, provider: name, ms };
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      console.warn(`[plan] ${name} failed after ${Date.now() - started}ms: ${why}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("All providers failed");
}
