import type { VisualOf } from "@/lib/schema";
import { ACCENT, CONTENT_H, Content, MONO, SANS, appear, currentStep, enter, type SceneProps } from "./shared";

// a code snippet on its own panel; each step highlights its lines and shows a note beside them
export function CodeScene({ visual, local, duration, theme }: SceneProps<VisualOf<"code">>) {
  const lines = visual.code.split("\n");
  const longest = Math.max(...lines.map((l) => l.length), 20);
  const panelW = 800;
  const fontSize = Math.min(30, (panelW - 110) / (longest * 0.6), (CONTENT_H - 60) / (lines.length * 1.45));
  const lineH = fontSize * 1.45;
  const current = currentStep(visual.steps.length, local, duration);
  const step = visual.steps[current];
  const on = new Set(step.lines);
  const per = Math.max(1, (duration - 8) / visual.steps.length);

  return (
    <Content style={{ display: "flex", gap: 28, alignItems: "center" }}>
      <div
        style={{
          ...enter(appear(local, 0)),
          width: panelW,
          flexShrink: 0,
          padding: "26px 0",
          borderRadius: 24,
          background: "#0b1220",
          border: "2px solid #334155",
          fontFamily: MONO,
          fontSize,
        }}
      >
        {visual.language && (
          <div style={{ padding: "0 26px 12px", color: "#94a3b8", fontFamily: SANS, fontSize: 18, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {visual.language}
          </div>
        )}
        {lines.map((line, i) => {
          const lit = on.has(i + 1);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                height: lineH,
                alignItems: "center",
                background: lit ? `${ACCENT}33` : "transparent",
                boxShadow: lit ? `inset 6px 0 0 ${ACCENT}` : "none",
                color: lit ? "#ffffff" : on.size ? "#94a3b8" : "#e2e8f0",
                whiteSpace: "pre",
              }}
            >
              <span style={{ width: 64, flexShrink: 0, textAlign: "right", paddingRight: 20, color: "#64748b" }}>{i + 1}</span>
              <span>{line || " "}</span>
            </div>
          );
        })}
      </div>

      {/* the notes, current one in full colour */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {visual.steps.map((s, i) => {
          if (!s.note) return null;
          const p = appear(local, 4 + i * per);
          return (
            <div
              key={i}
              style={{
                ...enter(p),
                opacity: p * (i === current ? 1 : 0.45),
                padding: "16px 20px",
                borderRadius: 18,
                background: i === current ? ACCENT : theme.card,
                color: i === current ? "#111" : theme.ink,
                fontFamily: SANS,
                fontSize: 24,
                lineHeight: 1.25,
              }}
            >
              {s.note}
            </div>
          );
        })}
      </div>
    </Content>
  );
}
