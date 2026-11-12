import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSong } from "@/lib/db";
import { SongView } from "./SongView";

export async function generateMetadata({ params }: PageProps<"/songs/[slug]">) {
  const song = await getSong((await params).slug).catch(() => undefined);
  return { title: song ? `${song.title} chord` : "Lagu" };
}

export default function SongPage({ params }: PageProps<"/songs/[slug]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-2" />}>
      <Song params={params} />
    </Suspense>
  );
}

async function Song({ params }: Pick<PageProps<"/songs/[slug]">, "params">) {
  await connection();
  const song = await getSong((await params).slug);
  if (!song) notFound();
  if (!song.preview_url && song.deezer_id) Object.assign(song, await deezerPreview(song.deezer_id));
  return <SongView song={song} />;
}

/** Deezer preview links expire, so ask for a fresh one on each view (no player if Deezer is slow). */
async function deezerPreview(id: number) {
  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(2500) });
    const t = (await res.json()) as { preview?: string; link?: string };
    return t.preview ? { preview_url: t.preview, listen_url: t.link } : {};
  } catch {
    return {};
  }
}
