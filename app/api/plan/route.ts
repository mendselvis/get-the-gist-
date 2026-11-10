import { NextResponse } from "next/server";
import { sameAnswer } from "@/lib/answers";
import { generatePlan } from "@/lib/providers";
import type { Approach, SlideInput } from "@/lib/providers/shared";
import { MAX_INSTRUCTION_CHARS, type Plan, type Verification } from "@/lib/schema";
import { checkQuestion, isCheckable } from "@/lib/verify";

const APPROACHES: Approach[] = ["solve", "explain", "hint"];
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim() : "");

// marks each question's answer scene (the i-th answer scene belongs to the i-th question)
function applyVerification(plan: Plan, verification: Verification[]): Plan {
  let answerIndex = 0;
  const scenes = plan.scenes.map((s) => {
    if (s.visual.type !== "answer") return s;
    const index = answerIndex++;
    const v = verification.find((x) => x.question === index);
    const status = v?.status === "verified" || v?.status === "corrected" ? v.status : undefined;
    return { ...s, visual: { ...s.visual, verified: status } };
  });
  return { ...plan, scenes, verification };
}

// hint scenes belong only to "Give me a hint first"; a model that adds them unasked would hide the solution
function dropUnaskedHints(plan: Plan, approach?: Approach): Plan {
  if (approach === "hint") return plan;
  const scenes = plan.scenes.filter((s) => s.visual.type !== "hint");
  return scenes.length ? { ...plan, scenes } : plan;
}

// Solve mode: check computational answers by running code; if one disagrees, redo the solution once
// with the computed value, then mark which answers code confirmed.
async function verifyPlan(input: SlideInput, plan: Plan, started: number): Promise<{ plan: Plan; ms: number; provider: string } | null> {
  const checkable = plan.questions.map((q, i) => ({ q, i })).filter(({ q }) => isCheckable(q));
  if (plan.mode !== "solve" || checkable.length === 0) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75000);
  try {
    const results = await Promise.all(checkable.map(async ({ q, i }) => ({ i, q, r: await checkQuestion(q, ctrl.signal, plan.slideText) })));
    // timing and outcome only: never question text, answers or keys
    console.log(`[verify] ${results.map(({ i, r }) => `q${i + 1}:${r.status}${r.status === "unchecked" ? ` (${r.reason.slice(0, 80)})` : ""}`).join(" ")}`);

    const verification: Verification[] = results.map(({ i, r }) =>
      r.status === "match" ? { question: i, status: "verified", computed: r.computed } : { question: i, status: "unverified", ...("computed" in r ? { computed: r.computed } : {}) }
    );
    const wrong = results.filter(({ r }) => r.status === "mismatch") as { i: number; q: (typeof results)[number]["q"]; r: { computed: string } }[];
    if (wrong.length === 0) return { plan: applyVerification(plan, verification), ms: Date.now() - started, provider: "otari" };

    // redo once, telling the model what the code computed
    const redoResult = await generatePlan({ ...input, corrections: wrong.map(({ q, r }) => ({ question: q.text, computed: r.computed })) });
    const redo = { ...redoResult, plan: dropUnaskedHints(redoResult.plan, input.approach) };
    const fixed: Verification[] = verification.map((v) => {
      const w = wrong.find((x) => x.i === v.question);
      if (!w) return v;
      const newAnswer = redo.plan.questions[w.i]?.answer ?? "";
      return sameAnswer(newAnswer, w.r.computed, w.q.kind)
        ? { question: w.i, status: "corrected", computed: w.r.computed }
        : { question: w.i, status: "unverified", computed: w.r.computed };
    });
    console.log(`[verify] redo: ${fixed.map((v) => `q${v.question + 1}:${v.status}`).join(" ")}`);
    return { plan: applyVerification(redo.plan, fixed), ms: Date.now() - started, provider: redo.provider };
  } catch (err) {
    console.warn(`[verify] failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const { image, mediaType, instruction, approach, focus } = await req.json();

  if (
    typeof image !== "string" ||
    image.length > 4_000_000 ||
    !["image/jpeg", "image/png"].includes(mediaType)
  ) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  if (instruction !== undefined && typeof instruction !== "string") {
    return NextResponse.json({ error: "Invalid instruction" }, { status: 400 });
  }
  // drop control characters; the instruction is never logged
  const cleaned = clean(instruction);
  if (cleaned.length > MAX_INSTRUCTION_CHARS) {
    return NextResponse.json(
      { error: `Keep your request under ${MAX_INSTRUCTION_CHARS} characters.` },
      { status: 400 }
    );
  }
  if (approach !== undefined && !APPROACHES.includes(approach)) {
    return NextResponse.json({ error: "Invalid approach" }, { status: 400 });
  }
  const focusText = clean(focus).slice(0, 300);

  const input: SlideInput = { image, mediaType, instruction: cleaned || undefined, approach, focus: focusText || undefined };
  const started = Date.now();
  try {
    const generated = await generatePlan(input);
    const result = { ...generated, plan: dropUnaskedHints(generated.plan, input.approach) };
    const checked = await verifyPlan(input, result.plan, started);
    return NextResponse.json(checked ?? result);
  } catch {
    return NextResponse.json({ error: "Could not build the video. Try again." }, { status: 502 });
  }
}
