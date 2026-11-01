export type SlideInput = { image: string; mediaType: string };

export const PROMPT = `You explain computer architecture slides to a student who finds dense text hard to follow.
Look at the slide image and return ONLY JSON, with no markdown, in exactly this shape:
{"title": string,
 "nodes": [{"id": string, "label": string}],
 "edges": [{"from": nodeId, "to": nodeId}],
 "steps": [{"highlight": [nodeId], "narration": string}]}

Rules:
- 3 to 9 nodes. Labels are short (3 words max).
- Edges show the flow of data or control between nodes.
- 3 to 8 steps. Each step highlights the nodes it talks about.
- Each narration is 1 or 2 plain spoken sentences that explain why it happens, not just what.
- Only use ids that exist in nodes.
- If the slide has a fact you are unsure about, leave it out instead of guessing.`;

export function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}
