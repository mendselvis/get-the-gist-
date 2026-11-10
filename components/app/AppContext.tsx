"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { listSessions, onSessionsChanged, type SessionSummary } from "@/lib/sessions";

/* ---------- the open PDF or image ---------- */

// lives above the routes, so "Explain another slide from this deck" can reuse the file without re-uploading it.
// An image (screenshot or photo) is one slide, already prepared for sending.
export type Deck =
  | { kind: "pdf"; pdf: PDFDocumentProxy; fileName: string; numPages: number; ratio: number }
  | { kind: "image"; image: string; thumbnail: string; fileName: string; numPages: 1; ratio: number };

type DeckState = {
  deck: Deck | null;
  setDeck: (deck: Deck | null) => void;
  thumbs: Record<number, string>;
  setThumb: (index: number, url: string) => void;
  requested: React.RefObject<Set<number>>;
};

const DeckContext = createContext<DeckState | null>(null);

export function useDeck() {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck outside AppProviders");
  return ctx;
}

/* ---------- saved sessions ---------- */

type SessionsState = {
  sessions: SessionSummary[];
  loaded: boolean;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const SessionsContext = createContext<SessionsState | null>(null);

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions outside AppProviders");
  return ctx;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [deck, setDeckState] = useState<Deck | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const requested = useRef(new Set<number>());
  const deckRef = useRef<Deck | null>(null);

  // a new deck frees the old PDF and starts its thumbnails from scratch
  const setDeck = useCallback((next: Deck | null) => {
    const old = deckRef.current;
    if (old?.kind === "pdf" && old !== next) void old.pdf.loadingTask.destroy();
    deckRef.current = next;
    requested.current = new Set();
    setThumbs({});
    setDeckState(next);
  }, []);
  const setThumb = useCallback((index: number, url: string) => setThumbs((t) => ({ ...t, [index]: url })), []);
  useEffect(
    () => () => {
      if (deckRef.current?.kind === "pdf") void deckRef.current.pdf.loadingTask.destroy();
    },
    []
  );

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listSessions()
        .then((s) => alive && setSessions(s))
        .catch(() => alive && setSessions([]))
        .finally(() => alive && setLoaded(true));
    load();
    const off = onSessionsChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <DeckContext.Provider value={{ deck, setDeck, thumbs, setThumb, requested }}>
      <SessionsContext.Provider value={{ sessions, loaded, activeId, setActiveId }}>{children}</SessionsContext.Provider>
    </DeckContext.Provider>
  );
}
