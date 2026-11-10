"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";
import { GITHUB_URL, NAV_LINKS } from "./links";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu with Escape, or when the screen grows to desktop width
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-[rgba(255,255,255,0.92)] text-[#111] backdrop-blur-sm transition-colors ${
        scrolled || open ? "border-[#eee]" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 text-[#111]">
          <LogoMark />
          <span className="text-[17px] font-semibold tracking-tight">Get the Gist</span>
        </Link>

        <ul className="hidden items-center gap-8 text-[15px] font-medium text-[#111] md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="underline-offset-4 hover:underline">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-[15px] font-medium text-[#111] underline-offset-4 hover:underline md:inline"
          >
            GitHub
          </a>
          <Link
            href="/app"
            className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-[15px] font-medium text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
          >
            Try it free
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#e5e5e5] bg-white text-[#111] md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-[#eee] bg-white md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-3 text-[17px] font-medium text-[#111]">
            {[...NAV_LINKS, { href: GITHUB_URL, label: "GitHub" }].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="block rounded-xl px-3 py-3 hover:bg-[#f5f5f5]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
