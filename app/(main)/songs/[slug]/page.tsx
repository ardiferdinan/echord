import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSong } from "@/lib/db";
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
  return <SongView song={song} />;
}

