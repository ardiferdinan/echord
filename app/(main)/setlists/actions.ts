"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { saveShared } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { sanitize } from "@/lib/share";
import type { Setlist } from "@/lib/storage";

export async function shareSetlist(setlist: Setlist, share?: { id: string; token: string }): Promise<{ id?: string; token?: string; error?: string }> {
  await requireAuth(); // /s/* skips proxy, and actions can be POSTed from any page
  try {
    const data = sanitize(setlist);
    const id = share?.id ?? randomBytes(6).toString("base64url");
    const token = share?.token ?? randomUUID();
    if (!(await saveShared(id, token, data))) return { error: "Link ini milik perangkat lain, tidak bisa di-update." };
    return { id, token };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
