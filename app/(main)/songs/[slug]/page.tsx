import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSong, songVersions } from "@/lib/db";
import { SongView } from "./SongView";

export async function generateMetadata({ params }: PageProps<"/songs/[slug]">) {
  const song = await getSong((await params).slug).catch(() => undefined);
  return { title: song ? `${song.title} · ${song.artist ?? "chord"}` : "Lagu" };
}

export default function SongPage({ params }: PageProps<"/songs/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="-mx-4 -mt-16 h-[520px] bg-gradient-to-b from-[#2a2a2a] to-panel sm:-mx-6 sm:h-[440px]" />}>
      <Song params={params} />
    </Suspense>
  );
}

async function Song({ params }: Pick<PageProps<"/songs/[slug]">, "params">) {
  await connection();
  const song = await getSong((await params).slug);
  if (!song) notFound();
  const others = await songVersions(song.id);
  // the song's own chords first, then other sources' (PsalmNote next to JRChord…)
  const versions = others.length ? [{ id: song.id, source_url: song.source_url ?? null, content: song.content, original_key: song.original_key, bpm: song.bpm }, ...others] : [];
  return <SongView song={song} versions={versions} />;
}

