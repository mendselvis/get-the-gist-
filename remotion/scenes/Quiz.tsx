import type { VisualOf } from "@/lib/schema";
import { CONTENT_H, Content, MINT, SANS, SERIF, appear, enter, type SceneProps } from "./shared";

const LETTERS = ["A", "B", "C", "D"];

// one multiple-choice question; the answer is revealed after a pause to think
export function QuizScene({ visual, local, duration, theme }: SceneProps<VisualOf<"quiz">>) {
  const revealAt = Math.round(duration * 0.6);
  const revealed = appear(local, revealAt, 12);
  const optH = Math.min(78, (CONTENT_H - 170) / visual.options.length - 12);
  const qSize = Math.min(46, 2300 / Math.max(40, visual.question.length));

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
      <div style={{ ...enter(appear(local, 0)), fontFamily: SERIF, fontSize: qSize, lineHeight: 1.1, color: theme.ink, marginBottom: 10 }}>
        {visual.question}
      </div>
      {visual.options.map((opt, i) => {
        const correct = i === visual.answer;
        const p = appear(local, 10 + i * 8);
        return (
          <div
            key={i}
            style={{
              ...enter(p),
              opacity: p * (correct ? 1 : 1 - 0.55 * revealed),
              display: "flex",
              alignItems: "center",
              gap: 18,
              height: optH,
              padding: "0 22px",
              borderRadius: 18,
              border: `2px solid ${correct && revealed > 0.5 ? "#111" : theme.line}`,
              background: correct && revealed > 0 ? MINT : theme.card,
              color: correct && revealed > 0 ? "#111" : theme.ink,
              fontFamily: SANS,
              fontSize: Math.min(28, optH * 0.4),
            }}
          >
            <span style={{ display: "grid", placeItems: "center", width: optH * 0.6, height: optH * 0.6, borderRadius: 999, flexShrink: 0, border: "2px solid currentColor", fontWeight: 700 }}>
              {correct && revealed > 0.5 ? "✓" : LETTERS[i]}
            </span>
            <span style={{ fontWeight: 600 }}>{opt}</span>
          </div>
        );
      })}
      <div style={{ minHeight: 48, marginTop: 6, fontFamily: SANS, fontSize: 26, color: theme.ink }}>
        {revealed > 0 ? (
          visual.explanation && <span style={enter(revealed, 10)}>{visual.explanation}</span>
        ) : (
          // a countdown while the viewer thinks
          <span style={{ color: theme.muted }}>Think about it… {Math.max(1, Math.ceil((revealAt - local) / 30))}</span>
        )}
      </div>
    </Content>
  );
}
