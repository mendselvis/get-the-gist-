"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { LogoMark } from "@/components/landing/Logo";
import { AppProviders } from "./AppContext";
import { ConfirmProvider } from "./Confirm";
import { Sidebar } from "./Sidebar";

const COLLAPSED_KEY = "gist-sidebar-collapsed";

// remembering the collapsed sidebar is a per-browser convenience; storage may be unavailable
const collapsedListeners = new Set<() => void>();
const collapsedStore = {
  subscribe(listener: () => void) {
    collapsedListeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      collapsedListeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  get() {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  },
  set(next: boolean) {
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
    collapsedListeners.forEach((l) => l());
  },
};

function SidebarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 4.5v15" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

// sidebar on the left (collapsible on desktop, a slide-out drawer on mobile), the page on the right
export default function AppShell({ children }: { children: ReactNode }) {
  // the server render always shows the sidebar; the browser then applies the saved choice
  const collapsed = useSyncExternalStore(collapsedStore.subscribe, collapsedStore.get, () => false);
  const setCollapsedSaved = collapsedStore.set;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <AppProviders>
      <ConfirmProvider>
        <div className="flex h-dvh w-full bg-white text-[#111]">
          {/* desktop sidebar */}
          {!collapsed && (
            <aside className="hidden w-72 shrink-0 border-r border-line lg:block">
              <Sidebar onClose={() => setCollapsedSaved(true)} closeLabel="Collapse sidebar" onNavigate={() => {}} />
            </aside>
          )}

          {/* mobile drawer */}
          <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
            <div
              onClick={() => setDrawerOpen(false)}
              className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
            />
            <aside
              className={`absolute inset-y-0 left-0 w-[86%] max-w-80 shadow-2xl transition-transform duration-200 ${
                drawerOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              {...(!drawerOpen ? { inert: true } : {})}
            >
              <Sidebar onClose={() => setDrawerOpen(false)} closeLabel="Close menu" onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>

          <div id="app-scroll" className="relative min-w-0 flex-1 overflow-y-auto">
            {/* mobile top bar */}
            <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-[rgba(255,255,255,0.92)] px-3 backdrop-blur-sm lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open history"
                aria-expanded={drawerOpen}
                className="grid h-10 w-10 place-items-center rounded-full text-[#111] hover:bg-black/5"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <LogoMark className="h-5 w-5" />
              <span className="font-semibold tracking-tight">Get the Gist</span>
            </div>

            {/* desktop: reopen a collapsed sidebar */}
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsedSaved(false)}
                aria-label="Open sidebar"
                className="absolute left-4 top-4 z-30 hidden h-10 w-10 place-items-center rounded-full border border-line bg-white text-[#111] shadow-sm hover:border-[#111] lg:grid"
              >
                <SidebarIcon />
              </button>
            )}

            {children}
          </div>
        </div>
      </ConfirmProvider>
    </AppProviders>
  );
}
