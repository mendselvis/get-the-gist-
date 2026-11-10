// Looping hero demo, pure CSS/SVG: a dense slide is scanned on the left,
// and the same idea is drawn as boxes and arrows on the right, like our Remotion videos.

const BOXES = [
  { x: 10, y: 34, label: "Fetch" },
  { x: 112, y: 34, label: "Decode" },
  { x: 214, y: 34, label: "Execute" },
  { x: 61, y: 132, label: "Memory" },
  { x: 163, y: 132, label: "Write back" },
];
const BW = 76;
const BH = 40;

// left-to-right rows; the row change runs through the gap between rows
const ARROWS = [
  `M ${10 + BW} 54 L 112 54`,
  `M ${112 + BW} 54 L 214 54`,
  `M ${214 + BW / 2} ${34 + BH} L ${214 + BW / 2} 104 L ${61 + BW / 2} 104 L ${61 + BW / 2} 132`,
  `M ${61 + BW} 152 L 163 152`,
];

function DenseSlide() {
  const widths = ["92%", "85%", "97%", "78%", "88%", "94%", "70%", "90%", "83%", "96%", "74%", "87%"];
  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-white p-[6%] shadow-[0_1px_0_#e8e8ee]">
      <div className="mb-[6%] h-[7%] w-3/4 rounded-sm bg-ink/85" />
      <div className="space-y-[3.2%]">
        {widths.map((w, i) => (
          <div key={i} className="h-[2.4%] min-h-[3px] rounded-full bg-ink/15" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-[6%] grid grid-cols-3 gap-[3%]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-3 rounded-sm bg-ink/10" />
        ))}
      </div>
      <div className="demo-scan pointer-events-none absolute inset-x-0 top-0 h-[16%] bg-butter/60 mix-blend-multiply" />
    </div>
  );
}

function Diagram() {
  return (
    <svg viewBox="0 0 300 190" className="h-full w-full" role="img" aria-label="Animated diagram of a CPU pipeline">
      <defs>
        <marker id="demo-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#111" />
        </marker>
      </defs>
      <text x="10" y="18" fontSize="12" fill="#111" style={{ fontFamily: "var(--font-serif)" }}>
        The instruction cycle
      </text>
      {ARROWS.map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          fill="none"
          stroke="#111"
          strokeWidth="1.6"
          strokeLinejoin="round"
          markerEnd="url(#demo-arrow)"
          className="demo-draw"
          style={{ animationDelay: `${0.45 + i * 0.6}s` }}
        />
      ))}
      {BOXES.map((b, i) => (
        <g key={b.label} className="demo-pop" style={{ animationDelay: `${i * 0.6}s` }}>
          <rect
            x={b.x}
            y={b.y}
            width={BW}
            height={BH}
            rx="9"
            fill="#f4f4f7"
            stroke="#111"
            strokeWidth="1.4"
            className={i === 1 ? "demo-glow" : undefined}
          />
          <text x={b.x + BW / 2} y={b.y + BH / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#111">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DemoMockup() {
  return (
    <div className="relative mx-auto w-full" aria-hidden="false">
      {/* screen */}
      <div className="rounded-t-[22px] border-[9px] border-b-[14px] border-ink bg-ink shadow-[0_30px_80px_-30px_rgba(17,17,17,0.45)] sm:border-[12px] sm:border-b-[18px]">
        <div className="overflow-hidden rounded-[10px] bg-[#f7f7fa]">
          {/* app chrome */}
          <div className="flex items-center gap-1.5 border-b border-line bg-white px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate text-[10px] text-muted sm:text-xs">Get the Gist · Slide 2</span>
          </div>

          <div className="grid aspect-[16/8.4] grid-cols-[0.8fr_auto_1.2fr] items-center gap-2 p-3 sm:gap-4 sm:p-5">
            <div className="h-full">
              <DenseSlide />
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-label sm:h-6 sm:w-6" aria-hidden="true">
              <path d="M5 12h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="h-full rounded-lg bg-white p-1 sm:p-2">
              <Diagram />
            </div>
          </div>

          <div className="mx-3 mb-3 rounded-lg bg-white px-3 py-2 text-[9px] text-muted leading-snug text-muted sm:mx-5 sm:mb-5 sm:text-xs">
            <span className="font-semibold text-ink">Scene 2 of 4 · </span>
            Decode works out what the instruction is asking the CPU to do.
          </div>
        </div>
      </div>
      {/* base */}
      <div className="relative mx-auto h-3 w-[112%] -translate-x-[5.4%] rounded-b-2xl bg-gradient-to-b from-[#d9d9e0] to-[#b9b9c4] sm:h-4">
        <div className="absolute left-1/2 top-0 h-1.5 w-1/6 -translate-x-1/2 rounded-b-md bg-[#a9a9b4]" />
      </div>
    </div>
  );
}
