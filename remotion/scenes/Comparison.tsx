import type { VisualOf } from "@/lib/schema";
import { CONTENT_H, Content, PASTELS, SANS, appear, enter, revealFrame, type SceneProps } from "./shared";

// two or three columns side by side; rows appear one at a time
export function ComparisonScene({ visual, local, duration, theme }: SceneProps<VisualOf<"comparison">>) {
  const hasLabels = visual.rows.some((r) => r.label);
  const template = `${hasLabels ? "220px " : ""}repeat(${visual.columns.length}, 1fr)`;
  const headerH = 76;
  const rowH = Math.min(96, (CONTENT_H - headerH - 12 * visual.rows.length) / visual.rows.length);
  const fontSize = Math.min(28, rowH * 0.36);
  const cell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "0 22px",
    borderRadius: 16,
    lineHeight: 1.2,
    fontFamily: SANS,
  };

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: template, gap: 12, height: headerH, ...enter(appear(local, 0)) }}>
        {hasLabels && <div />}
        {visual.columns.map((c, i) => (
          <div key={i} style={{ ...cell, justifyContent: "center", background: PASTELS[i], color: "#111", fontSize: 32, fontWeight: 700 }}>
            {c}
          </div>
        ))}
      </div>
      {visual.rows.map((row, r) => {
        const p = appear(local, revealFrame(r + 1, visual.rows.length + 1, duration));
        return (
          <div key={r} style={{ display: "grid", gridTemplateColumns: template, gap: 12, height: rowH, ...enter(p) }}>
            {hasLabels && (
              <div style={{ ...cell, color: theme.muted, fontSize: fontSize * 0.9, fontWeight: 700 }}>{row.label}</div>
            )}
            {row.cells.map((c, i) => (
              <div
                key={i}
                style={{ ...cell, justifyContent: "center", textAlign: "center", background: theme.card, border: `2px solid ${theme.line}`, color: theme.ink, fontSize }}
              >
                {c}
              </div>
            ))}
          </div>
        );
      })}
    </Content>
  );
}
