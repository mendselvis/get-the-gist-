import { z } from "zod";

export const PlanSchema = z.object({
  title: z.string(),
  nodes: z.array(z.object({ id: z.string(), label: z.string() })).min(2).max(9),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
  steps: z
    .array(
      z.object({
        highlight: z.array(z.string()),
        narration: z.string(),
      })
    )
    .min(1)
    .max(8),
});

export type Plan = z.infer<typeof PlanSchema>;
