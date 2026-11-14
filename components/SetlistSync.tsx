"use client";
import { useEffect, useRef } from "react";
import { useSetlists, type Setlist } from "@/lib/storage";

const OWNER = "echord:owner"; // account whose setlists this browser holds

/** Save this browser's setlists to the account now (before signing out). */
export async function pushSetlists() {
  try {
    const data = localStorage.getItem("echord:setlists");
    if (data && localStorage.getItem(OWNER)) await fetch("/api/setlists", { method: "PUT", body: data, keepalive: true });
  } catch {}
}
/** Forget the account's setlists in this browser (signing out). */
export function clearLocalSetlists() {
  try {
    localStorage.removeItem("echord:setlists");
    localStorage.removeItem(OWNER);
  } catch {}
}

/**
 * Setlists belong to the account: the browser keeps a working copy (fast, works offline) and syncs it.
 * On load: the account's copy, plus local setlists made or changed since it was last saved (and, the first
 * time on this browser, every setlist saved here before accounts existed). After that every change is
 * saved to the account (debounced).
 */
export function SetlistSync() {
  const [setlists, setSetlists] = useSetlists();
  const ready = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch("/api/setlists").catch(() => null);
      if (!alive || !r?.ok) return;
      const { userId, data, updatedAt } = (await r.json()) as { userId: number; data: Setlist[]; updatedAt: string | null };
      const owner = localStorage.getItem(OWNER);
      const savedAt = updatedAt ? Date.parse(updatedAt) : 0;
      setSetlists((local) => {
        if (owner && owner !== String(userId)) return data; // another account's copy: replace it
        const byId = new Map(data.map((s) => [s.id, s]));
        for (const s of local) {
          const remote = byId.get(s.id);
          if (remote ? s.updatedAt > remote.updatedAt : !owner || s.updatedAt > savedAt) byId.set(s.id, s);
        }
        return [...byId.values()];
      });
      localStorage.setItem(OWNER, String(userId));
      ready.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [setSetlists]);

  useEffect(() => {
    if (!ready.current) return;
    const t = setTimeout(() => {
      fetch("/api/setlists", { method: "PUT", body: JSON.stringify(setlists), keepalive: true }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [setlists]);

  return null;
}
