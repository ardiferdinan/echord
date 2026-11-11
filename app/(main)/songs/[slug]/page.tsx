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
  return <SongView song={song} />;
}
