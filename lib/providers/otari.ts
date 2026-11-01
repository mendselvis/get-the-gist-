import OpenAI from "openai";
import { PlanSchema } from "@/lib/schema";
import { PROMPT, extractJson, type SlideInput } from "./shared";

const BASE_URL = "https://otari.ai/api/v1";
const CALL_TIMEOUT_MS = 15000;

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

export async function callOtari({ image, mediaType }: SlideInput, signal: AbortSignal) {
  const key = process.env.OTARI_API_KEY;
  if (!key) throw new Error("OTARI_API_KEY missing");
  const models = [process.env.OTARI_MODEL, process.env.OTARI_FALLBACK_MODEL]
    .map((m) => m?.trim())
    .filter((m): m is string => !!m);
  if (models.length === 0) throw new Error("OTARI_MODEL missing");

  const client = new OpenAI({ apiKey: key, baseURL: BASE_URL, defaultHeaders: { "Otari-Key": key } });

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
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } },
          ],
        },
      ];
      const first = await ask(model, messages);
      const problem = checkPlan(first);
      if (!problem) {
        console.log(`[plan] otari model ${model} ok`);
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
        console.log(`[plan] otari model ${model} ok after retry`);
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
