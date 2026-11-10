"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { listSessions, onSessionsChanged, type SessionSummary } from "@/lib/sessions";

/* ---------- the open PDF ---------- */

// lives above the routes, so "Explain another slide from this deck" can reuse the file without re-uploading it
export type Deck = { pdf: PDFDocumentProxy; fileName: string; numPages: number; ratio: number };

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
    if (deckRef.current && deckRef.current !== next) void deckRef.current.pdf.loadingTask.destroy();
    deckRef.current = next;
    requested.current = new Set();
    setThumbs({});
    setDeckState(next);
  }, []);
  const setThumb = useCallback((index: number, url: string) => setThumbs((t) => ({ ...t, [index]: url })), []);
  useEffect(() => () => void deckRef.current?.pdf.loadingTask.destroy(), []);

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
