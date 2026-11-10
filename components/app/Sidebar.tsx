"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/landing/Logo";
import { clearSessions, deleteSession, updateSession, type SessionSummary } from "@/lib/sessions";
import { useSessions } from "./AppContext";
import { useConfirm } from "./Confirm";

const DAY = 86_400_000;

function groupByDate(sessions: SessionSummary[]) {
  // sessions only exist in the browser, so prerendering never reads the clock
  if (sessions.length === 0) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  const groups: { label: string; items: SessionSummary[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const s of sessions) {
    const g = s.updatedAt >= t ? 0 : s.updatedAt >= t - DAY ? 1 : s.updatedAt >= t - 7 * DAY ? 2 : 3;
    groups[g].items.push(s);
  }
  return groups.filter((g) => g.items.length > 0);
}

// closes a popover on an outside click or Escape
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

function SessionItem({ s, active, onNavigate }: { s: SessionSummary; active: boolean; onNavigate: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(s.title);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuOpen, () => setMenuOpen(false), menuRef);

  async function saveTitle() {
    const title = draft.trim().slice(0, 120);
    setRenaming(false);
    if (title && title !== s.title) await updateSession(s.id, { title }, { touch: false });
    else setDraft(s.title);
  }

  async function remove() {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Delete this explanation?",
      body: `"${s.title}" and its chat will be removed from this browser. This can't be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await deleteSession(s.id);
    if (active) router.push("/app/new");
  }

  return (
    <li
      className={`group relative flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors ${
        active ? "bg-butter/70" : "hover:bg-[#f3f3f5]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails are data URLs stored in this browser */}
      <img src={s.slideThumbnail} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-line bg-white object-cover" />
      {renaming ? (
        <input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              setDraft(s.title);
              setRenaming(false);
            }
          }}
          aria-label="Explanation title"
          className="min-w-0 flex-1 rounded-lg border border-[#111] bg-white px-2 py-1 text-sm text-[#111] focus:outline-none"
        />
      ) : (
        <Link
          href={`/app/${s.id}`}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl"
        >
          <span className="block truncate text-sm font-medium text-[#111]">{s.title}</span>
          <span className="block truncate text-xs text-label">
            Slide {s.pageNumber} · {s.pdfName}
          </span>
        </Link>
      )}

      <div ref={menuRef} className="relative z-10">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={`Options for ${s.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`grid h-8 w-8 place-items-center rounded-full text-[#111] hover:bg-black/5 focus-visible:opacity-100 ${
            menuOpen || active ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="19" cy="12" r="1.8" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-9 z-20 w-36 rounded-2xl border border-line bg-white p-1 shadow-[0_16px_40px_-16px_rgba(17,17,17,0.35)]">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDraft(s.title);
                setRenaming(true);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#111] hover:bg-[#f3f3f5]"
            >
              Rename
            </button>
            <button role="menuitem" type="button" onClick={remove} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#b42318] hover:bg-[#fdecea]">
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// onClose is the header button (collapse on desktop, close the drawer on mobile);
// onNavigate runs after picking a session or New explanation (closes the mobile drawer, nothing on desktop)
export function Sidebar({ onClose, closeLabel, onNavigate }: { onClose: () => void; closeLabel: string; onNavigate: () => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { sessions, loaded, activeId } = useSessions();
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useDismiss(settingsOpen, () => setSettingsOpen(false), settingsRef);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupByDate(q ? sessions.filter((s) => s.title.toLowerCase().includes(q)) : sessions);
  }, [sessions, query]);

  async function clearAll() {
    setSettingsOpen(false);
    const ok = await confirm({
      title: "Clear all history?",
      body: `All ${sessions.length} saved explanation${sessions.length === 1 ? "" : "s"} and their chats will be removed from this browser. This can't be undone.`,
      confirmLabel: "Clear all",
    });
    if (!ok) return;
    await clearSessions();
    router.push("/app/new");
  }

  return (
    <div className="flex h-full flex-col bg-[#fbfbfc] text-[#111]">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6" />
          <span className="text-[16px] font-semibold tracking-tight">Get the Gist</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid h-9 w-9 place-items-center rounded-full text-[#111] hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 4.5v15" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>

      <div className="px-4">
        <Link
          href="/app/new"
          onClick={onNavigate}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111] text-[15px] font-medium text-white transition-colors hover:bg-black/80"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span> New explanation
        </Link>
        <label className="relative mt-3 block">
          <span className="sr-only">Search explanations</span>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-label" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm text-[#111] placeholder:text-label focus:border-[#111] focus:outline-none"
          />
        </label>
      </div>

      <nav aria-label="Saved explanations" className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loaded && sessions.length === 0 && (
          <div className="mx-2 mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
            <p className="font-medium">Your explained slides will appear here</p>
            <p className="mt-1 text-sm text-muted">They’re saved in this browser only.</p>
          </div>
        )}
        {sessions.length > 0 && groups.length === 0 && <p className="mx-2 mt-4 text-sm text-muted">No explanations match “{query}”.</p>}
        {groups.map((g) => (
          <section key={g.label} className="mt-3 first:mt-0">
            <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-label">{g.label}</h3>
            <ul className="space-y-0.5">
              {g.items.map((s) => (
                <SessionItem key={s.id} s={s} active={s.id === activeId} onNavigate={onNavigate} />
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div ref={settingsRef} className="relative border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={settingsOpen}
          className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-[#111] hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          Settings
        </button>
        {settingsOpen && (
          <div role="menu" className="absolute bottom-14 left-4 z-20 w-56 rounded-2xl border border-line bg-white p-1 shadow-[0_16px_40px_-16px_rgba(17,17,17,0.35)]">
            <p className="px-3 pb-1 pt-2 text-xs text-label">History is saved in this browser only.</p>
            <button
              role="menuitem"
              type="button"
              onClick={clearAll}
              disabled={sessions.length === 0}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#b42318] hover:bg-[#fdecea] disabled:cursor-not-allowed disabled:text-label disabled:hover:bg-transparent"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
