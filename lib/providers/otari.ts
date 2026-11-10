import type OpenAI from "openai";
import { otariClient, planModels } from "@/lib/otari";
import { PlanSchema } from "@/lib/schema";
import { buildPrompt, extractJson, type SlideInput } from "./shared";

// plans include the slide transcript, suggested questions and, when solving, worked steps, so replies run long
const CALL_TIMEOUT_MS = 45000;

type UserContent = OpenAI.Chat.ChatCompletionUserMessageParam["content"];

// returns null if the reply is a valid plan, otherwise a short reason for the retry prompt
function checkPlan(text: string): string | null {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return "the reply was not parseable JSON";
  }
  const result = PlanSchema.safeParse(json);
  if (result.success) return null;
  return result.error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join("; ");
}

// asks the plan models for a plan: one retry per model if the JSON is invalid, then the next model
export async function otariPlan(content: UserContent, signal: AbortSignal, label = "plan") {
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
      const problem = checkPlan(first);
      if (!problem) {
        console.log(`[${label}] otari model ${model} ok`);
        return first;
      }

      // one retry with the same model, telling it what was wrong
      messages.push(
        { role: "assistant", content: first },
        {
          role: "user",
          content: `That was not valid JSON for the required shape: ${problem}. Return only the JSON.`,
        }
      );
      const second = await ask(model, messages);
      if (!checkPlan(second)) {
        console.log(`[${label}] otari model ${model} ok after retry`);
        return second;
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
    signal
  );
}
