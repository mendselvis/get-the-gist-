import type OpenAI from "openai";
import { otariClient, planModels } from "@/lib/otari";
import { PlanSchema, type Plan } from "@/lib/schema";
import { buildPrompt, extractJson, reviewPlan, type SlideInput } from "./shared";

// plans include the slide transcript, suggested questions and, when solving, worked steps, so replies run long
const CALL_TIMEOUT_MS = 45000;

type UserContent = OpenAI.Chat.ChatCompletionUserMessageParam["content"];

// valid: the reply parses as a plan. problem: a short reason for the retry prompt, or null if it's fine
type Check = { valid: boolean; problem: string | null };
export type PlanReview = (plan: Plan) => string | null;

function checkPlan(text: string, review?: PlanReview): Check {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return { valid: false, problem: "the reply was not parseable JSON" };
  }
  const result = PlanSchema.safeParse(json);
  if (result.success) return { valid: true, problem: review?.(result.data) ?? null };
  const problem = result.error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join("; ");
  return { valid: false, problem };
}

// Asks the plan models for a plan. A reply that is invalid, or that `review` finds a problem with, gets one
// retry with the same model, told what was wrong. Invalid twice moves on to the next model; a valid reply
// that still has a review problem is kept, since the next model is a fallback, not a better solver.
export async function otariPlan(content: UserContent, signal: AbortSignal, label = "plan", review?: PlanReview) {
  const models = planModels();
  if (models.length === 0) throw new Error("OTARI_MODEL missing");
  const client = otariClient();

  async function ask(model: string, messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
    const res = await client.chat.completions.create(
      { model, temperature: 0.2, messages },
      { signal: AbortSignal.any([signal, AbortSignal.timeout(CALL_TIMEOUT_MS)]) }
    );
    return res.choices?.[0]?.message?.content ?? "";
  }

  const failures: string[] = [];
  for (const model of models) {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "user", content }];
      const first = await ask(model, messages);
      const one = checkPlan(first, review);
      if (!one.problem) {
        console.log(`[${label}] otari model ${model} ok`);
        return first;
      }
      // the problem text describes the plan's shape, never the slide's content
      console.log(`[${label}] otari model ${model} retrying: ${one.valid ? "review" : "invalid"}: ${one.problem.slice(0, 200)}`);

      // one retry with the same model, telling it what was wrong
      messages.push(
        { role: "assistant", content: first },
        {
          role: "user",
          content: one.valid
            ? `That plan has problems: ${one.problem}. Fix them and return the whole plan again as JSON only.`
            : `That was not valid JSON for the required shape: ${one.problem}. Return only the JSON.`,
        }
      );
      const second = await ask(model, messages);
      const two = checkPlan(second, review);
      if (!two.problem) {
        console.log(`[${label}] otari model ${model} ok after retry`);
        return second;
      }
      if (two.valid || one.valid) {
        console.log(`[${label}] otari model ${model} kept after retry, still: ${(two.problem ?? "").slice(0, 200)}`);
        return two.valid ? second : first;
      }
      failures.push(`${model}: invalid JSON twice`);
    } catch (err) {
      if (signal.aborted) throw err;
      failures.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Otari failed (${failures.join(" | ")})`);
}

export function callOtari({ image, mediaType, ...opts }: SlideInput, signal: AbortSignal) {
  return otariPlan(
    [
      { type: "text", text: buildPrompt(opts) },
      { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
    ],
    signal,
    "plan",
    (plan) => reviewPlan(plan, opts.approach)
  );
}
