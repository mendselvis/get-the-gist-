import type { VisualOf } from "@/lib/schema";
import { ACCENT, Content, MINT, SANS, SERIF, appear, enter, type SceneProps } from "./shared";

// the solved answer, clearly highlighted, with one idea to remember; the badge only when code confirmed it
export function AnswerScene({ visual, local, theme }: SceneProps<VisualOf<"answer">>) {
  const answerSize = Math.min(84, 2000 / Math.max(14, visual.answer.length));

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 22, fontFamily: SANS }}>
      {visual.question && (
        <div style={{ ...enter(appear(local, 0)), color: theme.muted, fontSize: 26, lineHeight: 1.25 }}>{visual.question}</div>
      )}
      <div
        style={{
          ...enter(appear(local, 8), 24),
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "26px 34px",
          borderRadius: 28,
          background: MINT,
          border: "3px solid #111",
          color: "#111",
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0 }}>Answer</span>
        <span style={{ fontFamily: SERIF, fontSize: answerSize, lineHeight: 1.05 }}>{visual.answer}</span>
      </div>
      {visual.keyIdea && (
        <div
          style={{
            ...enter(appear(local, 22)),
            display: "flex",
            gap: 14,
            alignItems: "baseline",
            padding: "16px 24px",
            borderRadius: 20,
            background: ACCENT,
            color: "#111",
            fontSize: 28,
            lineHeight: 1.3,
          }}
        >
          <strong style={{ flexShrink: 0 }}>Key idea:</strong>
          <span>{visual.keyIdea}</span>
        </div>
      )}
      {visual.verified && (
        <div
          style={{
            ...enter(appear(local, 32)),
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            borderRadius: 999,
            border: `2px solid ${theme.ink}`,
            color: theme.ink,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">✓</span>
          {visual.verified === "corrected" ? "Answer corrected and checked by running code" : "Answer checked by running code"}
        </div>
      )}
    </Content>
  );
}
