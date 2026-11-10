"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WebSource } from "@/lib/otari";
import { normalizePlan, type Plan } from "@/lib/schema";

// Explained slides are kept only in this browser's IndexedDB. The PDF itself is never stored.

export type StoredMini = { status: "ready"; plan: Plan } | { status: "error"; text: string };
export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  notice?: string;
  sources?: WebSource[];
  error?: string;
  mini?: StoredMini;
};

export type Session = {
  id: string;
  title: string;
  pdfName: string; // the PDF's or image's file name
  source?: "pdf" | "image"; // missing on sessions saved before images were supported, which are PDFs
  pageNumber: number;
  slideThumbnail: string; // small JPEG data URL, about 240px wide
  plan: Plan;
  sources: WebSource[];
  messages: StoredMessage[];
  meta?: string; // which provider built it, and how long it took
  createdAt: number;
  updatedAt: number;
};

// what the sidebar needs, without loading every plan into memory
export type SessionSummary = Pick<Session, "id" | "title" | "slideThumbnail" | "pdfName" | "source" | "pageNumber" | "updatedAt">;

// where the slide came from, for the sidebar and the session header
export function sessionOrigin(s: Pick<Session, "pdfName" | "source" | "pageNumber">) {
  return s.source === "image" ? s.pdfName : `Slide ${s.pageNumber} of ${s.pdfName}`;
}

interface GistDB extends DBSchema {
  sessions: { key: string; value: Session; indexes: { updatedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<GistDB>> | null = null;
function db() {
  dbPromise ??= openDB<GistDB>("get-the-gist", 1, {
    upgrade(d) {
      const store = d.createObjectStore("sessions", { keyPath: "id" });
      store.createIndex("updatedAt", "updatedAt");
    },
  });
  return dbPromise;
}

// tells every open tab (and this one) that the list changed
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("gist-sessions") : null;
const listeners = new Set<() => void>();
function changed() {
  listeners.forEach((l) => l());
  channel?.postMessage("changed");
}
channel?.addEventListener("message", () => listeners.forEach((l) => l()));

export function onSessionsChanged(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function listSessions(): Promise<SessionSummary[]> {
  const all = await (await db()).getAllFromIndex("sessions", "updatedAt");
  return all.reverse().map(({ id, title, slideThumbnail, pdfName, source, pageNumber, updatedAt }) => ({
    id,
    title,
    slideThumbnail,
    pdfName,
    source,
    pageNumber,
    updatedAt,
  }));
}

// sessions saved by older versions can be missing newer fields; fill them in so they open cleanly
function normalizeMessage(m: StoredMessage): StoredMessage {
  const mini = m.mini?.status === "ready" ? { ...m.mini, plan: normalizePlan(m.mini.plan) } : m.mini;
  return { ...m, content: m.content ?? "", sources: Array.isArray(m.sources) ? m.sources : undefined, mini };
}

function normalizeSession(s: Session): Session {
  return {
    ...s,
    plan: normalizePlan(s.plan),
    sources: Array.isArray(s.sources) ? s.sources : [],
    messages: Array.isArray(s.messages) ? s.messages.map(normalizeMessage) : [],
  };
}

export async function getSession(id: string) {
  const s = await (await db()).get("sessions", id);
  return s && normalizeSession(s);
}

export async function createSession(input: Omit<Session, "id" | "createdAt" | "updatedAt" | "messages" | "sources">) {
  const now = Date.now();
  const session: Session = { ...input, id: crypto.randomUUID(), messages: [], sources: [], createdAt: now, updatedAt: now };
  await (await db()).put("sessions", session);
  changed();
  return session;
}

// touch: false keeps the session's place in the list (a rename shouldn't move it to "Today")
export async function updateSession(id: string, patch: Partial<Omit<Session, "id" | "createdAt">>, { touch = true } = {}) {
  const d = await db();
  const tx = d.transaction("sessions", "readwrite");
  const current = await tx.store.get(id);
  if (!current) return;
  await tx.store.put({ ...current, ...patch, updatedAt: touch ? Date.now() : current.updatedAt });
  await tx.done;
  changed();
}

export async function deleteSession(id: string) {
  await (await db()).delete("sessions", id);
  changed();
}

export async function clearSessions() {
  await (await db()).clear("sessions");
  changed();
}
