import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Plan } from "@/lib/schema";

export const FPS = 30;
export const STEP_FRAMES = 120; // 4 seconds per step

const W = 1280;
const H = 720;
const COLS = 3;
const BW = 300;
const BH = 110;
const TOP = 120;
const BOTTOM = 170; // room for the caption

type Pt = { x: number; y: number };

function boxPos(i: number, n: number): Pt {
  const rows = Math.ceil(n / COLS);
  const cellW = W / COLS;
  const cellH = (H - TOP - BOTTOM) / rows;
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: cellW * col + (cellW - BW) / 2,
    y: TOP + cellH * row + (cellH - BH) / 2,
  };
}

// point on the border of a box centred at c, in the direction of o
function edgePoint(c: Pt, o: Pt, gap = 6): Pt {
  const dx = o.x - c.x;
  const dy = o.y - c.y;
  const t = Math.min((BW / 2 + gap) / Math.abs(dx || 1e-6), (BH / 2 + gap) / Math.abs(dy || 1e-6));
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export const FlowVideo: React.FC<{ plan: Plan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIdx = Math.min(Math.floor(frame / STEP_FRAMES), plan.steps.length - 1);
  const step = plan.steps[stepIdx];
  const local = frame - stepIdx * STEP_FRAMES;
  const pop = spring({ frame: local, fps, config: { damping: 12 } });
  const active = new Set(step.highlight);

  const centers: Record<string, Pt> = {};
  plan.nodes.forEach((n, i) => {
    const p = boxPos(i, plan.nodes.length);
    centers[n.id] = { x: p.x + BW / 2, y: p.y + BH / 2 };
  });

  return (
    <AbsoluteFill style={{ background: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "absolute", top: 36, left: 48, right: 48, color: "#e2e8f0", fontSize: 40, fontWeight: 700 }}>
        {plan.title}
      </div>

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="arrow-dim" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#475569" />
          </marker>
          <marker id="arrow-on" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#38bdf8" />
          </marker>
        </defs>

        {plan.edges.map((e, i) => {
          const a = centers[e.from];
          const b = centers[e.to];
          if (!a || !b) return null;
          const p1 = edgePoint(a, b);
          const p2 = edgePoint(b, a);
          const on = active.has(e.from) && active.has(e.to);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={on ? "#38bdf8" : "#475569"}
              strokeWidth={on ? 5 : 3}
              markerEnd={`url(#${on ? "arrow-on" : "arrow-dim"})`}
            />
          );
        })}

        {plan.nodes.map((n, i) => {
          const p = boxPos(i, plan.nodes.length);
          const on = active.has(n.id);
          const scale = on ? 1 + 0.06 * pop : 1;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x + BW / 2} ${p.y + BH / 2}) scale(${scale}) translate(${-BW / 2} ${-BH / 2})`}
            >
              <rect width={BW} height={BH} rx={16} fill={on ? "#0369a1" : "#1e293b"} stroke={on ? "#38bdf8" : "#334155"} strokeWidth={3} />
              <text x={BW / 2} y={BH / 2 + 10} textAnchor="middle" fill="#f1f5f9" fontSize={30} fontWeight={600}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 40,
          color: "#f8fafc",
          fontSize: 34,
          lineHeight: 1.35,
          opacity: Math.min(1, local / 10),
        }}
      >
        {step.narration}
      </div>
    </AbsoluteFill>
  );
};
