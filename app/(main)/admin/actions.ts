"use server";
import { revalidatePath } from "next/cache";
import { insertSong } from "@/lib/db";
import { requireAuth } from "@/app/login/actions";

type SongInput = { title: string; artist: string; originalKey: string; bpm: string; content: string };

function clean(input: SongInput) {
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: "Judul wajib diisi." };
  if (!input.content.trim()) return { error: "Isi lagu kosong." };
  if (input.content.length > 50_000) return { error: "Isi lagu terlalu panjang." };
  const bpm = parseInt(input.bpm, 10);
  return {
    song: {
      title,
      artist: input.artist.trim().slice(0, 200) || null,
      original_key: input.originalKey.trim().slice(0, 8) || null,
      bpm: Number.isFinite(bpm) && bpm > 0 && bpm < 400 ? bpm : null,
      content: input.content,
    },
  };
}

export async function saveSong(input: SongInput): Promise<{ slug?: string; error?: string }> {
  await requireAuth();
  const c = clean(input);
  if (!c.song) return { error: c.error };
  try {
    const slug = await insertSong(c.song);
    revalidatePath("/");
    return { slug };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
