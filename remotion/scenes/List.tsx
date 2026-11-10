import type { VisualOf } from "@/lib/schema";
import { CONTENT_H, Content, PASTELS, SANS, appear, enter, revealFrame, type SceneProps } from "./shared";

// key points revealed one by one
export function ListScene({ visual, local, duration, theme }: SceneProps<VisualOf<"list">>) {
  const n = visual.points.length;
  const gap = 18;
  const rowH = Math.min(96, (CONTENT_H - gap * (n - 1)) / n);
  const fontSize = Math.min(36, rowH * 0.42);

  return (
    <Content style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap }}>
      {visual.points.map((point, i) => {
        const p = appear(local, revealFrame(i, n, duration));
        return (
          <div
            key={i}
            style={{
              ...enter(p, 24),
              display: "flex",
              alignItems: "center",
              gap: 22,
              minHeight: rowH,
              padding: "0 28px",
              borderRadius: 22,
              background: theme.card,
              border: `2px solid ${theme.line}`,
              fontFamily: SANS,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                width: rowH * 0.55,
                height: rowH * 0.55,
                borderRadius: 999,
                background: PASTELS[i % PASTELS.length],
                color: "#111",
                fontWeight: 700,
                fontSize: fontSize * 0.8,
              }}
            >
              {i + 1}
            </span>
            <span style={{ color: theme.ink, fontSize, fontWeight: 600, lineHeight: 1.2 }}>{point}</span>
          </div>
        );
      })}
    </Content>
  );
}
