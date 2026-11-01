import Anthropic from "@anthropic-ai/sdk";
import { PROMPT, type SlideInput } from "./shared";

export async function callAnthropic({ image, mediaType }: SlideInput, signal: AbortSignal) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  const client = new Anthropic();

  const msg = await client.messages.create(
    {
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/png" | "image/jpeg", data: image },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    },
    { signal }
  );

  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
