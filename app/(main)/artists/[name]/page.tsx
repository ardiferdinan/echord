import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listSongs } from "@/lib/db";
import { TrackList, track } from "@/components/library";
import { PlayButton } from "@/components/player/PlayButton";

export async function generateMetadata({ params }: PageProps<"/artists/[name]">) {
  return { title: decodeURIComponent((await params).name) };
}

export default function ArtistPage({ params }: PageProps<"/artists/[name]">) {
  return (
    <Suspense fallback={<div aria-hidden className="-mx-4 -mt-16 h-[470px] bg-gradient-to-b from-[#3a3a3a] to-panel sm:-mx-6 sm:h-[400px]" />}>
      <Artist params={params} />
    </Suspense>
  );
}

async function Artist({ params }: Pick<PageProps<"/artists/[name]">, "params">) {
  await connection();
  const name = decodeURIComponent((await params).name);
  const { songs, total } = await listSongs({ artist: name, per: 200 });
  if (!songs.length) notFound();
  const cover = songs.find((s) => s.artwork_url)?.artwork_url;
  const first = songs.find((s) => s.has_preview);

  return (
    <div>
      <header className="-mx-4 -mt-16 flex flex-col items-center gap-5 bg-gradient-to-b from-[#3a3a3a] to-panel px-4 pb-6 pt-24 text-center sm:-mx-6 sm:flex-row sm:items-end sm:px-6 sm:text-left">
        <span className="relative size-40 shrink-0 overflow-clip rounded-full bg-surface-2 shadow-2xl shadow-black/60 sm:size-52">
          {cover && <Image src={cover} alt="" fill sizes="208px" priority className="object-cover" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Artis</p>
          <h1 className="headline mt-2 text-[clamp(40px,7vw,96px)]">{name}</h1>
          <p className="mt-3 text-sm text-muted">{total} lagu di Echord</p>
        </div>
      </header>
      {first && (
        <div className="py-6">
          <PlayButton track={track(first)} queue={songs.filter((s) => s.has_preview).map(track)} size="lg" />
        </div>
      )}
      <h2 className="mb-3 mt-2 text-2xl font-bold tracking-[-0.02em]">Lagu</h2>
      <TrackList songs={songs} showArtist={false} />
    </div>
  );
}
