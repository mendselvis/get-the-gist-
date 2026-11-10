import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "./Logo";
import { Pill } from "./Pill";

const SUBJECTS = [
  "Computer Architecture",
  "Data Structures",
  "Calculus",
  "Operating Systems",
  "Networking",
  "Databases",
  "Biology",
  "Economics",
];

export function SubjectMarquee() {
  return (
    <section aria-label="Subjects it works for" className="bg-white py-10 text-[#111] sm:py-14">
      <div className="mx-auto max-w-6xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <ul className="flex w-max animate-marquee gap-12 whitespace-nowrap pr-12 font-serif text-2xl text-label sm:text-3xl motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-3">
          {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
            // the second copy makes the loop seamless; screen readers only need the first
            <li key={i} aria-hidden={i >= SUBJECTS.length} className={i >= SUBJECTS.length ? "motion-reduce:hidden" : ""}>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-[#111] text-4xl leading-[1.05] tracking-[-0.01em] sm:text-6xl">{title}</h2>
      {children && <p className="mt-4 text-[17px] leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

/* ---------- How it works ---------- */

function DropIllustration() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true">
      <rect x="20" y="14" width="120" height="82" rx="12" fill="#fff" stroke="#111" strokeWidth="1.5" strokeDasharray="5 5" />
      <rect x="62" y="28" width="36" height="46" rx="5" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <path d="M86 28v10h12" fill="none" stroke="#111" strokeWidth="1.5" />
      <rect x="68" y="56" width="24" height="10" rx="3" fill="#f9d4f2" />
      <text x="80" y="64" textAnchor="middle" fontSize="7" fontWeight="700" fill="#111">PDF</text>
      <g transform="translate(104 64)">
        <rect width="22" height="18" rx="4" fill="#111" />
        <path d="M6 0v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#111" strokeWidth="2" />
      </g>
    </svg>
  );
}

function TapIllustration() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => {
          const on = c === 1 && r === 0;
          return (
            <rect
              key={`${c}${r}`}
              x={22 + c * 42}
              y={16 + r * 42}
              width="34"
              height="34"
              rx="7"
              fill={on ? "#fce38a" : "#fff"}
              stroke="#111"
              strokeWidth={on ? 2.5 : 1.2}
            />
          );
        })
      )}
      <path
        d="M86 44c0-3 4-3 4 0v-6c0-3 4-3 4 0v8c0-3 4-3 4 0v3c0-3 4-3 4 0v8c0 8-5 12-11 12s-9-3-11-8l-4-9c-1-3 3-4 5-2z"
        fill="#fff"
        stroke="#111"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WatchIllustration() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true">
      <rect x="14" y="12" width="132" height="76" rx="10" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <rect x="26" y="34" width="30" height="20" rx="5" fill="#dce8fb" stroke="#111" strokeWidth="1.2" />
      <rect x="66" y="34" width="30" height="20" rx="5" fill="#fce38a" stroke="#111" strokeWidth="1.8" />
      <rect x="106" y="34" width="30" height="20" rx="5" fill="#fff" stroke="#111" strokeWidth="1.2" />
      <path d="M56 44h8M96 44h8" stroke="#111" strokeWidth="1.5" />
      <rect x="26" y="64" width="80" height="5" rx="2.5" fill="#111" opacity="0.15" />
      <rect x="14" y="94" width="132" height="5" rx="2.5" fill="#e8e8ee" />
      <rect x="14" y="94" width="58" height="5" rx="2.5" fill="#111" />
    </svg>
  );
}

const STEPS = [
  {
    title: "Drop your PDF",
    body: "It stays on your device. Only the one page you pick is sent to be explained.",
    art: <DropIllustration />,
    bg: "bg-sky",
  },
  {
    title: "Tap the slide that confuses you",
    body: "Scroll through your deck and pick the page you keep rereading.",
    art: <TapIllustration />,
    bg: "bg-blush",
  },
  {
    title: "Watch it explained, scene by scene",
    body: "A short animated diagram builds up the idea, with a caption and voice for each scene.",
    art: <WatchIllustration />,
    bg: "bg-butter",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white px-4 py-20 text-[#111] sm:px-6 sm:py-28">
      <SectionHeading eyebrow="How it works" title="Three taps from confused to clear" />
      <ol className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-[28px] border border-line bg-white p-6">
            <div className={`${s.bg} relative mb-6 aspect-[16/11] rounded-[20px] p-4`}>
              <span className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-ink font-serif text-lg text-white">
                {i + 1}
              </span>
              {s.art}
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-[#111]">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Features ---------- */

function MiniFlow() {
  return (
    <svg viewBox="0 0 300 90" className="mt-6 w-full max-w-md" aria-hidden="true">
      <defs>
        <marker id="feat-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#111" />
        </marker>
      </defs>
      {["Input", "Process", "Output"].map((l, i) => (
        <g key={l}>
          <rect x={4 + i * 102} y="24" width="78" height="40" rx="10" fill={i === 1 ? "#fce38a" : "#fff"} stroke="#111" strokeWidth="1.5" />
          <text x={43 + i * 102} y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="#111">
            {l}
          </text>
        </g>
      ))}
      <path d="M82 44h22M184 44h22" stroke="#111" strokeWidth="1.6" markerEnd="url(#feat-arrow)" />
    </svg>
  );
}

function RouteChips() {
  const chips = [
    { label: "GLM", sub: "main" },
    { label: "Ministral", sub: "fallback" },
    { label: "Other providers", sub: "last resort" },
  ];
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <div key={c.label} className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#111]">
            {c.label} <span className="font-normal text-label">· {c.sub}</span>
          </span>
          {i < chips.length - 1 && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-label" aria-hidden="true">
              <path d="M5 12h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

const FEATURES: { title: string; body: string; className: string; extra?: ReactNode }[] = [
  {
    title: "Visual diagrams, not walls of text",
    body: "Each slide becomes boxes and arrows that build up one idea at a time, so you see how the parts connect.",
    className: "bg-sky md:col-span-2",
    extra: <MiniFlow />,
  },
  {
    title: "Works with any lecture PDF",
    body: "Export your slides from PowerPoint, Keynote or Google Slides and drop them in.",
    className: "bg-blush",
  },
  {
    title: "Fast",
    body: "A slide explained in seconds, so you can keep studying instead of waiting.",
    className: "bg-butter",
  },
  {
    title: "Model-flexible",
    body: "Powered by the Otari open-source AI gateway, routing between open-weight models with automatic fallback.",
    className: "bg-peach md:col-span-2",
    extra: <RouteChips />,
  },
  {
    title: "Privacy-minded",
    body: "Your full PDF never leaves your browser. Only the page you choose is sent, as an image.",
    className: "bg-mint md:col-span-2",
  },
  {
    title: "Narration for every scene",
    body: "Each scene has a caption and is read aloud by your browser. Mute it any time.",
    className: "border border-line bg-white",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-[#fafafa] px-4 py-20 text-[#111] sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Features" title="Made for the slide you keep rereading" />
      <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className={`${f.className} flex flex-col rounded-[28px] p-7 sm:p-8`}>
            <h3 className="font-serif text-3xl leading-tight text-[#111]">{f.title}</h3>
            <p className="mt-3 max-w-prose leading-relaxed text-muted">{f.body}</p>
            {f.extra}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- For students + footer ---------- */

export function ForStudents() {
  return (
    <section id="for-students" className="relative scroll-mt-24 overflow-hidden bg-white px-4 py-24 text-center text-[#111] sm:px-6 sm:py-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#fff3b8_0%,#ffe3cc_50%,rgba(255,227,204,0)_100%)] sm:w-[70%]"
      />
      <div className="relative">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-label">For students</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-[1] tracking-[-0.02em] sm:text-8xl">
          Stop rereading. Start seeing.
        </h2>
        <div className="mt-10">
          <Pill href="/app" size="lg">
            Explain your first slide
          </Pill>
        </div>
      </div>
    </section>
  );
}

const OTARI_URL = "https://otari.ai";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Try it free", href: "/app" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
    ],
  },
  {
    title: "Built with",
    links: [
      { label: "Otari", href: OTARI_URL, external: true },
      { label: "Open-weight models", href: "#features" },
    ],
  },
  {
    title: "Contact",
    links: [{ label: "Send feedback", href: "mailto:mendselvis@gmail.com?subject=Get%20the%20Gist%20feedback" }],
  },
];

const SOCIAL_LINKS = [
  {
    label: "Elvis Mends on LinkedIn",
    href: "https://www.linkedin.com/in/elvis-mends-3834b0243",
    path: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  },
  {
    label: "Elvis Mends on X",
    href: "https://x.com/ElvisMends1",
    path: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z",
  },
];

const footerLink = "text-label transition-colors hover:text-[#111]";

export function Footer() {
  return (
    <footer className="bg-white px-4 text-[#111] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 py-16 md:flex-row md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 text-[#111]">
            <LogoMark className="h-7 w-7" />
            <span className="text-[17px] font-semibold tracking-tight">Get the Gist</span>
          </Link>
          <p className="mt-3 text-sm text-label">Any slide, explained in seconds.</p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3 md:gap-x-16">
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-[#111]">{col.title}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className={footerLink}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className={footerLink} {...(l.external ? external : {})}>
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-[#eee] py-6 text-xs text-label sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <p>© 2026 Get the Gist</p>
          <div className="flex items-center gap-3">
            <p>Made by Elvis Mends</p>
            {SOCIAL_LINKS.map((s) => (
              <a key={s.href} href={s.href} aria-label={s.label} className={footerLink} {...external}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
        <a
          href={OTARI_URL}
          {...external}
          className="self-start rounded-full bg-[#f3f4f6] px-3 py-1.5 font-medium text-label transition-colors hover:text-[#111] sm:self-auto"
        >
          Powered by Otari
        </a>
      </div>
    </footer>
  );
}
