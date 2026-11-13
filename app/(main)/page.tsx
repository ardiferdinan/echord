import { Suspense } from "react";
import { connection } from "next/server";
import { randomSongs, searchSongs, topArtists } from "@/lib/db";
import { ArtistCard, Shelf, SongCard } from "@/components/library";
import { HomeTop } from "@/components/HomeTop";

export default function Home() {
  return (
    <div className="-mx-4 -mt-16 bg-gradient-to-b from-[#1e5a38] via-panel via-[320px] to-panel px-4 pt-16 sm:-mx-6 sm:px-6">
      <HomeTop />
      <Suspense fallback={<ShelfSkeleton />}>
        <Shelves />
      </Suspense>
    </div>
  );
}

async function Shelves() {
  await connection();
  const [latest, artists, picks] = await Promise.all([searchSongs("", 12), topArtists(12), randomSongs(12)]).catch(() => [[], [], []] as const);
  if (!latest.length) return <p className="mt-10 text-muted">Database belum terhubung atau belum ada lagu.</p>;
  return (
    <>
      <Shelf title="Baru ditambahkan" href="/songs">
        {latest.map((s) => <SongCard key={s.id} s={s} />)}
      </Shelf>
      <Shelf title="Artis">
        {artists.map((a) => <ArtistCard key={a.artist} a={a} />)}
      </Shelf>
      <Shelf title="Temukan lagu">
        {picks.map((s) => <SongCard key={s.id} s={s} />)}
      </Shelf>
    </>
  );
}

function ShelfSkeleton() {
  return (
    <div className="mt-8" aria-hidden>
      <div className="mb-4 h-7 w-56 rounded bg-white/10" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square w-44 shrink-0 animate-pulse rounded-md bg-white/10" />)}
      </div>
    </div>
  );
}
