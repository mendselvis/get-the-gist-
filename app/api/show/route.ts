import { z } from "zod";
import { otariPlan } from "@/lib/providers/otari";
import { buildMiniPrompt, extractJson } from "@/lib/providers/shared";
import { PlanSchema } from "@/lib/schema";

const MAX_MINI_SCENES = 3;

const ShowSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  title: z.string().max(300),
  slideText: z.string().max(4000).optional(),
});

// "Show me": turns one chat answer into a 1-3 scene mini video, from text only
export async function POST(req: Request) {
  const parsed = ShowSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { answer, title, slideText } = parsed.data;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  req.signal.addEventListener("abort", () => ctrl.abort());
  try {
    const text = await otariPlan(buildMiniPrompt(answer, title, slideText), ctrl.signal, "show");
    const plan = PlanSchema.parse(extractJson(text));
    return Response.json({ plan: { ...plan, scenes: plan.scenes.slice(0, MAX_MINI_SCENES) } });
  } catch (err) {
    console.warn(`[show] failed: ${err instanceof Error ? err.message : String(err)}`);
    return Response.json({ error: "Couldn't make a video of that answer. Try again." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
