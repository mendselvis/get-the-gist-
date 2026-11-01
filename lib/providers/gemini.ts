import { PROMPT, type SlideInput } from "./shared";

export async function callGemini({ image, mediaType }: SlideInput, signal: AbortSignal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          { parts: [{ inline_data: { mime_type: mediaType, data: image } }, { text: PROMPT }] },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
}
