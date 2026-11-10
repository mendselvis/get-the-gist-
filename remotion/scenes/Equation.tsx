import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import type { VisualOf } from "@/lib/schema";
import { ACCENT, CONTENT_H, Content, SANS, appear, currentStep, enter, type SceneProps } from "./shared";

const MAX_PREVIOUS = 2;

// shrink long formulas so they stay inside the frame; fractions, roots and sums are about twice as tall
function fontFor(latex: string, big: boolean) {
  const len = latex.replace(/\\[a-zA-Z]+/g, "x").length;
  const tall = /\\(frac|dfrac|sqrt|sum|int|prod|binom|over)/.test(latex);
  const base = (big ? 64 : 38) * (tall ? 0.78 : 1);
  return Math.max(big ? 30 : 22, Math.min(base, base * (28 / Math.max(28, len))));
}

// a formula built up step by step; earlier steps stay above, dimmed
export function EquationScene({ visual, local, duration, theme }: SceneProps<VisualOf<"equation">>) {
  const n = visual.steps.length;
  const current = currentStep(n, local, duration);
  const html = useMemo(
    () => visual.steps.map((s) => katex.renderToString(s.latex, { throwOnError: false, displayMode: true, output: "html" })),
    [visual.steps]
  );
  const per = Math.max(1, (duration - 8) / n);
  const step = visual.steps[current];
  const noteP = appear(local, 4 + current * per + 8);

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, color: theme.ink }}>
      {/* anchored to the bottom, so if anything is cut it is the oldest step, never the current one */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          maxHeight: CONTENT_H - 90,
          overflow: "hidden",
        }}
      >
        {visual.steps.map((s, i) => {
          if (i > current || i < current - MAX_PREVIOUS) return null;
          const isCurrent = i === current;
          const p = appear(local, 4 + i * per);
          return (
            <div
              key={i}
              style={{
                ...enter(p, 20),
                opacity: p * (isCurrent ? 1 : 0.4),
                fontSize: fontFor(s.latex, isCurrent),
                padding: isCurrent ? "4px 28px" : 0,
                borderRadius: 20,
                background: isCurrent ? `${ACCENT}55` : "transparent",
              }}
              dangerouslySetInnerHTML={{ __html: html[i] }}
            />
          );
        })}
      </div>
      {step.explanation && (
        <div
          style={{
            ...enter(noteP, 12),
            maxWidth: 1000,
            padding: "12px 26px",
            borderRadius: 999,
            background: theme.card,
            border: `2px solid ${theme.line}`,
            color: theme.ink,
            fontFamily: SANS,
            fontSize: 28,
            textAlign: "center",
          }}
        >
          {step.explanation}
        </div>
      )}
    </Content>
  );
}
