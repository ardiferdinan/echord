"use server";
import { swapVersion } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

/** "Jadikan utama": this source's chords become the song's default (the page refreshes after). */
export async function makePrimary(songId: number, versionId: number): Promise<{ error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(songId) || !Number.isInteger(versionId)) return { error: "Versi tidak valid" };
  try {
    await swapVersion(songId, versionId);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
