"use client";
import { useEffect, useState } from "react";

export type Me = { id: number; username: string; email: string | null; role: "superadmin" | "member" };

// one request per page load, shared by every component that asks
let cache: Promise<Me | null> | null = null;
export const fetchMe = () => (cache ??= fetch("/api/me").then((r) => (r.ok ? r.json() : null)).catch(() => null));
export const forgetMe = () => void (cache = null);

/** The signed-in account; undefined while loading, null when signed out. */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    fetchMe().then(setMe);
  }, []);
  return me;
}
