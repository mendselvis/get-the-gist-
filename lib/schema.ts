import katex from "katex";
import { z } from "zod";

export const MAX_INSTRUCTION_CHARS = 300;
const MAX_SOURCE_WORDS = 10;
const MAX_SCENES = 8;

// keep the slide citation short even if a model ignores the word limit
function capWords(text: string | undefined, max = MAX_SOURCE_WORDS) {
  if (!text) return undefined;
  const words = text.replace(/^["'“”]+|["'“”]+$/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return words.length > max ? `${words.slice(0, max).join(" ")}…` : words.join(" ");
}

// arrays are trimmed rather than rejected when a model sends a few too many items
const upTo = <T extends z.ZodTypeAny>(item: T, min: number, max: number) =>
  z.array(item).min(min).transform((a) => a.slice(0, max));

const text = z.string().trim().min(1);

// a missing, null or malformed list becomes [], and non-string items are dropped
const stringList = z
  .array(z.unknown())
  .nullish()
  .catch([])
  .transform((a) => (a ?? []).filter((s): s is string => typeof s === "string"));

/* ---------- one schema per scene type ---------- */

const DiagramVisual = z
  .object({
    type: z.literal("diagram"),
    nodes: upTo(z.object({ id: text, label: text }), 2, 9),
    edges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
    highlight: z.array(z.string()).default([]),
  })
  .transform((v) => {
    const ids = new Set(v.nodes.map((n) => n.id));
    return {
      ...v,
      edges: v.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
      highlight: v.highlight.filter((id) => ids.has(id)),
    };
  });

const ListVisual = z.object({
  type: z.literal("list"),
  points: upTo(text, 1, 5),
});

const ComparisonVisual = z
  .object({
    type: z.literal("comparison"),
    columns: upTo(text, 2, 3),
    rows: upTo(z.object({ label: z.string().trim().optional(), cells: z.array(z.string()) }), 1, 5),
  })
  // every row gets exactly one cell per column
  .transform((v) => ({
    ...v,
    rows: v.rows.map((r) => ({
      label: r.label || undefined,
      cells: v.columns.map((_, i) => (r.cells[i] ?? "").trim()),
    })),
  }));

const TimelineVisual = z.object({
  type: z.literal("timeline"),
  events: upTo(z.object({ label: text, detail: z.string().trim().optional() }), 2, 6),
});

// a formula that KaTeX can't render counts as bad data, so the scene falls back instead of showing an error
const latex = text.refine((s) => {
  try {
    katex.renderToString(s, { throwOnError: true, displayMode: true });
    return true;
  } catch {
    return false;
  }
}, "invalid LaTeX");

const EquationVisual = z.object({
  type: z.literal("equation"),
  steps: upTo(z.object({ latex, explanation: z.string().trim().default("") }), 1, 5),
});

const CodeVisual = z
  .object({
    type: z.literal("code"),
    language: z.string().trim().default(""),
    code: text,
    steps: upTo(z.object({ lines: z.array(z.coerce.number().int()), note: z.string().trim().default("") }), 1, 5),
  })
  .transform((v) => {
    const lines = v.code.replace(/\t/g, "  ").split("\n").slice(0, 16);
    return {
      ...v,
      code: lines.join("\n"),
      steps: v.steps.map((s) => ({ ...s, lines: s.lines.filter((n) => n >= 1 && n <= lines.length) })),
    };
  });

const DefinitionVisual = z.object({
  type: z.literal("definition"),
  term: text,
  meaning: text,
  analogy: z.string().trim().optional(),
});

const ChartVisual = z.object({
  type: z.literal("chart"),
  kind: z.enum(["bar", "line"]).catch("bar"),
  unit: z.string().trim().optional(),
  data: upTo(z.object({ label: text, value: z.coerce.number().finite() }), 2, 8),
});

const QuizVisual = z
  .object({
    type: z.literal("quiz"),
    question: text,
    options: upTo(text, 2, 4),
    answer: z.coerce.number().int(),
    explanation: z.string().trim().optional(),
  })
  .refine((v) => v.answer >= 0 && v.answer < v.options.length, "answer out of range");

// the final scene of a solved question; `verified` is set only by the server after running code
const AnswerVisual = z
  .object({
    type: z.literal("answer"),
    question: z.string().trim().optional(),
    answer: text,
    keyIdea: z.string().trim().default(""),
    verified: z.unknown().optional(),
  })
  .transform(({ verified: _ignored, ...v }) => ({ ...v, verified: undefined as undefined | "verified" | "corrected" }));

// a nudge shown before the full solution when the student asks for a hint first
const HintVisual = z.object({
  type: z.literal("hint"),
  hint: text,
});

export const VisualSchema = z.discriminatedUnion("type", [
  AnswerVisual,
  HintVisual,
  DiagramVisual,
  ListVisual,
  ComparisonVisual,
  TimelineVisual,
  EquationVisual,
  CodeVisual,
  DefinitionVisual,
  ChartVisual,
  QuizVisual,
]);

export type Visual = z.infer<typeof VisualSchema>;
export type VisualOf<T extends Visual["type"]> = Extract<Visual, { type: T }>;
export const SCENE_TYPES = ["diagram", "list", "comparison", "timeline", "equation", "code", "definition", "chart", "quiz", "answer", "hint"] as const;

/* ---------- solve mode ---------- */

export const QUESTION_KINDS = ["numeric", "mcq", "code", "open"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

// a question the video solves; numeric, mcq and code answers can be checked by running code
const QuestionSchema = z.object({
  text: text,
  kind: z.enum(QUESTION_KINDS).catch("open"),
  answer: z.string().trim().default(""),
  options: z
    .array(z.string())
    .optional()
    .transform((o) => o?.slice(0, 6)),
});

export type Question = z.infer<typeof QuestionSchema>;

// set by the server after the code check: verified (matched), corrected (redone to match), unverified (couldn't check)
export type Verification = { question: number; status: "verified" | "corrected" | "unverified"; computed?: string };

/* ---------- scenes and plan ---------- */

// turns narration into 1-5 short points, for a scene whose visual was unusable
function listFromNarration(narration: string): VisualOf<"list"> {
  const sentences = narration
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const points = (sentences.length ? sentences : [narration]).slice(0, 5).map((s) => capWords(s.replace(/[.!?]$/, ""), 14)!);
  return { type: "list", points };
}

const SceneShell = z.object({
  narration: text,
  source: z.string().optional().transform((s) => capWords(s)),
  heading: z.string().optional().transform((s) => capWords(s, 8)),
  visual: z.unknown(),
});

export type Scene = z.infer<typeof SceneShell> & { visual: Visual; repaired?: true };

// one bad scene never sinks the video: a scene with an unknown type or bad data becomes a list
// built from its narration; a scene without narration is dropped
const ScenesSchema = z.array(z.unknown()).transform((raw, ctx) => {
  const scenes: Scene[] = [];
  for (const item of raw.slice(0, MAX_SCENES)) {
    const shell = SceneShell.safeParse(item);
    if (!shell.success) continue;
    const visual = VisualSchema.safeParse(shell.data.visual);
    scenes.push(
      visual.success
        ? { ...shell.data, visual: visual.data }
        : { ...shell.data, visual: listFromNarration(shell.data.narration), repaired: true }
    );
  }
  if (scenes.length === 0) {
    ctx.addIssue({ code: "custom", message: "no usable scenes: each scene needs a narration string" });
    return z.NEVER;
  }
  return scenes;
});

export const PlanSchema = z.object({
  title: text,
  // "solve" when the slide has questions or exercises; a slide that mixes both is solved
  mode: z.enum(["explain", "solve"]).catch("explain").default("explain"),
  questions: z
    .array(z.unknown())
    .nullish()
    .catch([])
    .transform((qs) =>
      (qs ?? [])
        .map((q) => QuestionSchema.safeParse(q))
        .filter((r) => r.success)
        .map((r) => r.data as Question)
        .slice(0, 3)
    ),
  // questions on the slide beyond the 3 solved here, offered as chips to solve next
  moreQuestions: stringList.transform((a) => a.map((q) => q.trim()).filter(Boolean).slice(0, 10)),
  verification: z.unknown().optional().transform(() => undefined as Verification[] | undefined),
  scenes: ScenesSchema,
  // a text transcript of the slide, so follow-up questions never need the image again
  slideText: z.string().nullish().catch(undefined).transform((s) => capWords(s ?? undefined, 320)),
  // questions a student might ask next, offered as chips under the player
  suggestions: stringList.transform((a) => a.map((q) => capWords(q, 15)).filter((q): q is string => !!q).slice(0, 3)),
});

// Plans saved before a field existed (or by an older schema) can be missing it. Fills the gaps without
// re-running PlanSchema, which would drop the server-set verification and verified badges.
export function normalizePlan(raw: Plan): Plan {
  const list = <T,>(a: T[] | undefined | null) => (Array.isArray(a) ? a : []);
  return {
    ...raw,
    mode: raw.mode === "solve" ? "solve" : "explain",
    questions: list(raw.questions),
    moreQuestions: list(raw.moreQuestions).filter((q): q is string => typeof q === "string"),
    suggestions: list(raw.suggestions).filter((q): q is string => typeof q === "string"),
    scenes: list(raw.scenes),
    verification: Array.isArray(raw.verification) ? raw.verification : undefined,
    slideText: typeof raw.slideText === "string" ? raw.slideText : undefined,
  };
}

/* ---------- follow-up chat ---------- */

export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY_MESSAGES = 10;

export const AskSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .default([])
    .transform((h) => h.slice(-MAX_HISTORY_MESSAGES)),
  context: z.object({
    title: z.string().max(300),
    slideText: z.string().max(4000).optional(),
    scenes: z.array(z.object({ heading: z.string().max(200).optional(), narration: z.string().max(1000), type: z.string().max(20) })).max(8),
  }),
});

export type AskInput = z.infer<typeof AskSchema>;

// what the chat sends about the current video: text only, never the image
export function askContext(plan: Plan): AskInput["context"] {
  return {
    title: plan.title,
    slideText: plan.slideText,
    scenes: plan.scenes.map((s) => ({ heading: s.heading, narration: s.narration, type: s.visual.type })),
  };
}

export type Plan = z.infer<typeof PlanSchema>;
