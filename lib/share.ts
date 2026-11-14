import type { Setlist, SetlistItem } from "./storage";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Whitelist + clamp everything coming from the browser before it is stored and shown to others. */
export function sanitize(s: Setlist): Omit<Setlist, "share" | "sharedAt"> {
  if (!s || typeof s !== "object" || !Array.isArray(s.items)) throw new Error("Setlist tidak valid.");
  return {
    id: str(s.id, 40),
    name: str(s.name, 200) || "Setlist",
    date: str(s.date, 10) || undefined,
    updatedAt: Number(s.updatedAt) || Date.now(),
    items: s.items.slice(0, 50).map((i) => item(i, true)),
  };
}

function item(i: SetlistItem, top: boolean): SetlistItem {
  return {
    id: str(i.id, 40),
    songId: Number(i.songId) || 0,
    slug: str(i.slug, 200),
    title: str(i.title, 200),
    artist: str(i.artist, 200) || null,
    originalKey: str(i.originalKey, 8) || null,
    content: str(i.content, 50_000),
    transpose: Math.max(-11, Math.min(11, Math.trunc(Number(i.transpose) || 0))),
    order: Array.isArray(i.order) ? i.order.slice(0, 100).map((o) => str(o, 10)) : [],
    notes: str(i.notes, 2000) || undefined,
    // a medley's songs (one level deep)
    parts: top && Array.isArray(i.parts) ? i.parts.slice(0, 12).map((p) => item(p, false)) : undefined,
  };
}

