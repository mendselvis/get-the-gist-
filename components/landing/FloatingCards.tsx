// Pastel cards around the hero mockup. Below xl they sit in a wrapped row under it,
// unrotated, so nothing overlaps on smaller screens.

const card =
  "animate-float text-[#111] rounded-[22px] shadow-[0_18px_40px_-18px_rgba(17,17,17,0.28)] xl:absolute xl:pointer-events-auto";

export function FloatingCards() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 xl:pointer-events-none xl:absolute xl:inset-0 xl:mt-0 xl:block">
      {/* pale blue: mini slide */}
      <div
        className={`${card} hidden w-44 bg-sky p-3 sm:block xl:left-0 xl:top-4 xl:[--r:-5deg]`}
        style={{ animationDelay: "0s" }}
      >
        <span className="mb-2 inline-block rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold">Slide 2</span>
        <div className="space-y-1.5 rounded-xl bg-white/80 p-3">
          <div className="h-2 w-3/4 rounded-full bg-ink/70" />
          <div className="h-1.5 w-full rounded-full bg-ink/15" />
          <div className="h-1.5 w-5/6 rounded-full bg-ink/15" />
          <div className="h-1.5 w-11/12 rounded-full bg-ink/15" />
          <div className="h-1.5 w-2/3 rounded-full bg-ink/15" />
        </div>
      </div>

      {/* pink pill: explainer length */}
      <div
        className={`${card} flex items-center gap-2 rounded-full bg-blush py-2.5 pl-2.5 pr-4 xl:left-[7%] xl:top-[50%] xl:[--r:4deg]`}
        style={{ animationDelay: "-2s" }}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        <span className="text-sm font-semibold">24s explainer</span>
      </div>

      {/* yellow: build time */}
      <div
        className={`${card} flex items-center gap-3 bg-butter px-4 py-3.5 xl:bottom-14 xl:left-0 xl:[--r:-2deg]`}
        style={{ animationDelay: "-4s" }}
      >
        <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
          <rect x="3" y="16" width="6" height="13" rx="1.5" fill="#111" />
          <rect x="13" y="7" width="6" height="22" rx="1.5" fill="#111" />
          <rect x="23" y="12" width="6" height="17" rx="1.5" fill="#111" />
        </svg>
        <div>
          <p className="text-[11px] text-muted">Video ready</p>
          <p className="text-lg font-semibold leading-tight">Built in ~7s</p>
        </div>
      </div>

      {/* mint: models */}
      <div
        className={`${card} bg-mint px-4 py-3.5 xl:right-0 xl:top-6 xl:w-52 xl:[--r:4deg]`}
        style={{ animationDelay: "-1s" }}
      >
        <p className="font-serif text-2xl leading-none">Open-weight AI</p>
        <p className="mt-1.5 text-xs text-muted">GLM, Mistral via Otari</p>
      </div>

      {/* white: narration */}
      <div
        className={`${card} flex items-center gap-3 border border-line bg-white px-4 py-3 xl:bottom-20 xl:right-[2%] xl:[--r:-3deg]`}
        style={{ animationDelay: "-3s" }}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-peach">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#111" />
            <path
              d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
              fill="none"
              stroke="#111"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="text-sm font-semibold">Narrated scenes</span>
      </div>
    </div>
  );
}
