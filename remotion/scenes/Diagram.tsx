import { spring, useVideoConfig } from "remotion";
import type { VisualOf } from "@/lib/schema";
import { layoutPlan, wrapLabel } from "../layout";
import { H, W, type SceneProps } from "./shared";

// boxes and arrows for a process or system; highlighted nodes pop
export function DiagramScene({ visual, local }: SceneProps<VisualOf<"diagram">>) {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: local, fps, config: { damping: 12 } });
  const active = new Set(visual.highlight);
  const { boxes, edges } = layoutPlan(visual);

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <marker id="arrow-dim" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L10,5 L0,10 z" fill="#c9c9d3" />
        </marker>
        <marker id="arrow-on" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L12,6 L0,12 z" fill="#111" />
        </marker>
      </defs>

      {/* dim edges first so highlighted ones draw on top */}
      {[...edges]
        .map((e) => ({ ...e, on: active.has(e.from) && active.has(e.to) }))
        .sort((a, b) => Number(a.on) - Number(b.on))
        .map((e) => (
          <path
            key={`${e.from}>${e.to}`}
            d={e.d}
            fill="none"
            stroke={e.on ? "#111" : "#c9c9d3"}
            strokeWidth={e.on ? 4 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#${e.on ? "arrow-on" : "arrow-dim"})`}
          />
        ))}

      {boxes.map((b) => {
        const on = active.has(b.id);
        const scale = on ? 1 + 0.05 * pop : 1;
        const lines = wrapLabel(b.label);
        const longest = Math.max(...lines.map((l) => l.length));
        const fontSize = Math.min(28, (b.w - 28) / (longest * 0.56), (b.h - 20) / (lines.length * 1.2));
        return (
          <g
            key={b.id}
            transform={`translate(${b.x + b.w / 2} ${b.y + b.h / 2}) scale(${scale}) translate(${-b.w / 2} ${-b.h / 2})`}
          >
            <rect
              width={b.w}
              height={b.h}
              rx={18}
              fill={on ? "#fce38a" : "#ffffff"}
              stroke={on ? "#111" : "#e3e3ea"}
              strokeWidth={on ? 3 : 2.5}
            />
            <text textAnchor="middle" fill="#111" fontSize={fontSize} fontWeight={600}>
              {lines.map((l, i) => (
                <tspan key={i} x={b.w / 2} y={b.h / 2 + (i - (lines.length - 1) / 2) * fontSize * 1.2 + fontSize * 0.35}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
