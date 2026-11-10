import { DemoMockup } from "./DemoMockup";
import { FloatingCards } from "./FloatingCards";
import { Pill } from "./Pill";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pt-14 text-[#111] sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-serif text-[#111] text-[3.25rem] leading-[0.98] tracking-[-0.02em] sm:text-7xl lg:text-[6.25rem]">
          Any slide.
          <br />
          Explained in seconds.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted sm:text-lg">
          Upload your lecture slides, tap a page, and watch it turn into a short animated explainer. Built for
          students who learn by seeing.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Pill href="/app" size="lg">
            Explain a slide
          </Pill>
          <Pill href="#how-it-works" variant="outline" size="lg">
            See how it works
          </Pill>
        </div>
      </div>

      {/* stage: arc glow, laptop, floating cards */}
      <div className="relative mx-auto mt-16 max-w-6xl pb-6 sm:mt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[8%] aspect-square w-[150%] -translate-x-1/2 rounded-full border border-line sm:w-[110%] xl:w-[88%]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[18%] aspect-square w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#fff3b8_0%,#ffe3cc_45%,rgba(255,227,204,0)_100%)] opacity-90 sm:w-[95%] xl:w-[72%]"
        />
        <div className="relative xl:mx-auto xl:w-[60%]">
          <DemoMockup />
        </div>
        <FloatingCards />
      </div>
    </section>
  );
}
