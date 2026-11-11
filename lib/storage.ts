"use client";
import { useCallback, useSyncExternalStore } from "react";
import { parseSections } from "./chordpro";
import { DEFAULT_CONTEXT, type BandContext } from "./voicing";

// localStorage-backed state shared across components/tabs.
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  try {
    if (raw) value = JSON.parse(raw);
  } catch {}
  cache.set(key, { raw, value });
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const noop = () => () => {};
/** false during SSR/hydration, true on the client: localStorage data is only real after this. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function useLocal<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(read(key, fallback)) : next;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        alert("Gagal menyimpan ke browser (storage penuh atau diblokir).");
      }
      listeners.forEach((l) => l());
    },
    [key, fallback],
  );
  return [value, set] as const;
}

// ---------- setlists ----------
export type SetlistItem = {
  id: string;
  songId: number;
  slug: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  content: string; // per-setlist copy, editable without touching the original song
  transpose: number;
  order: string[]; // section ids; duplicates allowed (Reff 2x)
  notes?: string;
};
export type Setlist = {
  id: string;
  name: string;
  date?: string;
  items: SetlistItem[];
  updatedAt: number;
  share?: { id: string; token: string }; // token = right to update the shared link
  sharedAt?: number;
};

const NO_SETLISTS: Setlist[] = [];
export const useSetlists = () => useLocal<Setlist[]>("echord:setlists", NO_SETLISTS);
export const useBandContext = () => useLocal<BandContext>("echord:band", DEFAULT_CONTEXT);

export const uid = () => crypto.randomUUID().slice(0, 8);

export function newItem(song: { id: number; slug: string; title: string; artist: string | null; original_key: string | null; content: string }, transpose = 0): SetlistItem {
  return {
    id: uid(),
    songId: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    originalKey: song.original_key,
    content: song.content,
    transpose,
    order: parseSections(song.content).map((s) => s.id),
  };
}
