import type { VisualOf } from "@/lib/schema";
import { CONTENT, CONTENT_W, Content, PASTELS, SANS, appear, enter, revealFrame, type SceneProps } from "./shared";

// ordered events on a line that draws from left to right
export function TimelineScene({ visual, local, duration, theme }: SceneProps<VisualOf<"timeline">>) {
  const n = visual.events.length;
  const slot = CONTENT_W / n;
  const axisY = (CONTENT.bottom - CONTENT.top) / 2;
  const reveals = visual.events.map((_, i) => revealFrame(i, n, duration));
  // the line grows from dot to dot as each event appears
  const lineEnd = slot / 2 + visual.events.slice(1).reduce((len, _, i) => len + slot * appear(local, reveals[i + 1]), 0);

  return (
    <Content>
      <div style={{ position: "absolute", left: slot / 2, right: slot / 2, top: axisY - 3, height: 6, borderRadius: 3, background: theme.line }} />
      <div style={{ position: "absolute", left: slot / 2, top: axisY - 3, height: 6, borderRadius: 3, width: Math.max(0, lineEnd - slot / 2), background: theme.ink }} />
      {visual.events.map((e, i) => {
        const p = appear(local, reveals[i]);
        const cx = slot * (i + 0.5);
        const above = i % 2 === 0;
        return (
          <div key={i} style={{ opacity: p }}>
            <div
              style={{
                position: "absolute",
                left: cx - 18,
                top: axisY - 18,
                width: 36,
                height: 36,
                borderRadius: 999,
                background: PASTELS[i % PASTELS.length],
                border: `4px solid ${theme.ink}`,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            />
            {/* alternate above and below the line so neighbouring labels never collide */}
            <div
              style={{
                position: "absolute",
                left: cx - slot / 2 + 8,
                width: slot - 16,
                textAlign: "center",
                fontFamily: SANS,
                ...(above ? { bottom: CONTENT.bottom - CONTENT.top - axisY + 40 } : { top: axisY + 40 }),
                ...enter(p, above ? 14 : -14),
              }}
            >
              <div style={{ color: theme.ink, fontSize: Math.min(30, (slot - 16) / 6), fontWeight: 700, lineHeight: 1.15 }}>{e.label}</div>
              {e.detail && <div style={{ marginTop: 8, color: theme.muted, fontSize: Math.min(24, (slot - 16) / 7.5), lineHeight: 1.25 }}>{e.detail}</div>}
            </div>
          </div>
        );
      })}
    </Content>
  );
}
