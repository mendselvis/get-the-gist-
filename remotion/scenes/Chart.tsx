import type { VisualOf } from "@/lib/schema";
import { CONTENT_H, CONTENT_W, Content, PASTELS, SANS, appear, revealFrame, type SceneProps } from "./shared";

function formatValue(v: number, unit?: string) {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1).replace(/\.?0+$/, "");
  return unit ? `${s} ${unit}` : s;
}

// a simple bar or line chart of numbers taken from the slide
export function ChartScene({ visual, local, duration, theme }: SceneProps<VisualOf<"chart">>) {
  const pad = { top: 50, right: 30, bottom: 70, left: 30 };
  const w = CONTENT_W - pad.left - pad.right;
  const h = CONTENT_H - pad.top - pad.bottom;
  const values = visual.data.map((d) => d.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(...values, lo + 1);
  const y = (v: number) => pad.top + h - ((v - lo) / (hi - lo)) * h;
  const slot = w / visual.data.length;
  const x = (i: number) => pad.left + slot * (i + 0.5);
  const n = visual.data.length;
  const labelSize = Math.min(26, (slot - 10) / 5);

  const points = visual.data.map((d, i) => ({ x: x(i), y: y(d.value), p: appear(local, revealFrame(i, n, duration * 0.8), 18) }));
  const linePath = points.map((pt, i) => `${i ? "L" : "M"} ${pt.x} ${pt.y}`).join(" ");
  const lineProgress = appear(local, 8, Math.max(20, duration * 0.5));

  return (
    <Content>
      <svg width={CONTENT_W} height={CONTENT_H} style={{ fontFamily: SANS, overflow: "visible" }}>
        <line x1={pad.left} x2={pad.left + w} y1={y(0)} y2={y(0)} stroke={theme.line} strokeWidth={3} />

        {visual.kind === "bar"
          ? visual.data.map((d, i) => {
              const p = points[i].p;
              const barW = Math.min(140, slot * 0.6);
              // a tiny non-zero value still gets a visible sliver
              const full = d.value === 0 ? 0 : Math.sign(y(d.value) - y(0)) * Math.max(8, Math.abs(y(d.value) - y(0)));
              const top = y(0) + full * p;
              return (
                <g key={i}>
                  <rect
                    x={x(i) - barW / 2}
                    y={Math.min(top, y(0))}
                    width={barW}
                    height={Math.abs(y(0) - top)}
                    rx={12}
                    fill={PASTELS[i % PASTELS.length]}
                    stroke={theme.ink}
                    strokeWidth={2.5}
                  />
                  <text x={x(i)} y={Math.min(top, y(0)) - 14} textAnchor="middle" fill={theme.ink} fontSize={labelSize} fontWeight={700} opacity={p}>
                    {formatValue(d.value, visual.unit)}
                  </text>
                </g>
              );
            })
          : (
            <g>
              <path d={linePath} pathLength={1} fill="none" stroke={theme.ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - lineProgress} />
              {points.map((pt, i) => {
                const shown = lineProgress >= i / Math.max(1, n - 1) - 0.001 ? 1 : 0;
                return (
                  <g key={i} opacity={shown}>
                    <circle cx={pt.x} cy={pt.y} r={11} fill={PASTELS[i % PASTELS.length]} stroke={theme.ink} strokeWidth={3} />
                    <text x={pt.x} y={pt.y - 22} textAnchor="middle" fill={theme.ink} fontSize={labelSize} fontWeight={700}>
                      {formatValue(visual.data[i].value, visual.unit)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

        {visual.data.map((d, i) => (
          <text key={i} x={x(i)} y={pad.top + h + 42} textAnchor="middle" fill={theme.muted} fontSize={labelSize} fontWeight={600}>
            {d.label}
          </text>
        ))}
      </svg>
    </Content>
  );
}
