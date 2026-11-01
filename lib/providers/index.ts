import { PlanSchema } from "@/lib/schema";
import { callAnthropic } from "./anthropic";
import { callGemini } from "./gemini";
import { callGroq } from "./groq";
import { extractJson, type SlideInput } from "./shared";

type ProviderName = "gemini" | "groq" | "anthropic";

const callers: Record<ProviderName, (i: SlideInput, s: AbortSignal) => Promise<string>> = {
  gemini: callGemini,
  groq: callGroq,
  anthropic: callAnthropic,
};

const TIMEOUT_MS = 15000;

function providerOrder(): ProviderName[] {
  const first = (process.env.MODEL_PROVIDER || "anthropic").trim();
  const rest = (process.env.FALLBACK_PROVIDERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([first, ...rest])].filter((p): p is ProviderName => p in callers);
}

export async function generatePlan(input: SlideInput) {
  for (const name of providerOrder()) {
    const started = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const text = await callers[name](input, ctrl.signal);
      const plan = PlanSchema.parse(extractJson(text));
      const ms = Date.now() - started;
      console.log(`[plan] ${name} ok ${ms}ms`);
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
