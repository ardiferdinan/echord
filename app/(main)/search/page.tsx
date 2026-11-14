import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { genreStats, listSongs, searchArtists, type ArtistCard as Artist, type SongCard } from "@/lib/db";
import { GENRES } from "@/lib/genres";
import { ArtistCard, Cover, Shelf, TrackList, artistHref } from "@/components/library";
import { PlayButton } from "@/components/player/PlayButton";

export const metadata = { title: "Cari" };

const PER = 50;
const KINDS = [["", "Semua"], ["lagu", "Lagu"], ["artis", "Artis"]] as const;

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-white/5" />}>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

async function Search({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  await connection();
  const p = await searchParams;
  const q = String(p.q ?? "").trim();
  if (!q) return <Browse />;
  const kind = String(p.jenis ?? "");
  const page = Math.max(1, parseInt(String(p.hal ?? "1"), 10) || 1);
  const href = (o: { jenis?: string; hal?: number }) => {
    const s = new URLSearchParams({ q });
    if (o.jenis) s.set("jenis", o.jenis);
    if (o.hal && o.hal > 1) s.set("hal", String(o.hal));
    return `/search?${s}`;
  };

  const [{ songs, total }, artists] = await Promise.all([
    kind === "artis" ? { songs: [], total: 0 } : listSongs({ q, page: kind ? page : 1, per: kind ? PER : 5 }),
    kind === "lagu" ? [] : searchArtists(q, kind ? 48 : 10),
  ]);
  const pages = Math.ceil(total / PER);

  return (
    <div className="pt-2">
      <h1 className="sr-only">Hasil pencarian “{q}”</h1>
      <nav className="flex gap-2" aria-label="Jenis hasil">
        {KINDS.map(([k, label]) => (
          <Link key={k} href={href({ jenis: k })} aria-current={kind === k ? "page" : undefined} className="chip">{label}</Link>
        ))}
      </nav>

      {!songs.length && !artists.length ? (
        <div className="py-16 text-center">
          <p className="text-2xl font-bold">Tidak ada hasil untuk “{q}”</p>
          <p className="mt-2 text-muted">Periksa ejaannya, atau coba kata yang lebih pendek.</p>
        </div>
      ) : kind === "lagu" ? (
        <div className="mt-6">
          <TrackList songs={songs} start={(page - 1) * PER} />
          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Halaman">
              {page > 1 && <Link href={href({ jenis: "lagu", hal: page - 1 })} className="btn">Sebelumnya</Link>}
              <span className="text-sm tabular-nums text-muted">{page} / {pages}</span>
              {page < pages && <Link href={href({ jenis: "lagu", hal: page + 1 })} className="btn">Berikutnya</Link>}
            </nav>
          )}
        </div>
      ) : kind === "artis" ? (
        <div className="-mx-3 mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {artists.map((a) => <ArtistCard key={a.artist} a={a} />)}
        </div>
      ) : (
        <>
          {(songs.length > 0 || artists.length > 0) && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <section aria-label="Hasil teratas">
                <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Hasil teratas</h2>
                <Top q={q} song={songs[0]} artist={artists[0]} />
              </section>
              {songs.length > 0 && (
                <section aria-label="Lagu" className="min-w-0">
                  <div className="mb-3 flex items-end justify-between">
                    <h2 className="text-2xl font-bold tracking-[-0.02em]">Lagu</h2>
                    {total > 4 && <Link href={href({ jenis: "lagu" })} className="text-sm font-bold text-muted hover:underline">Tampilkan semua</Link>}
                  </div>
                  <TrackList songs={songs.slice(0, 4)} />
                </section>
              )}
            </div>
          )}
          {artists.length > 0 && (
            <Shelf title="Artis" href={artists.length > 5 ? href({ jenis: "artis" }) : undefined}>
              {artists.map((a) => <ArtistCard key={a.artist} a={a} />)}
            </Shelf>
          )}
        </>
      )}
    </div>
  );
}

/** The artist wins when the query names them and no song title starts with it. */
function Top({ q, song, artist }: { q: string; song?: SongCard; artist?: Artist }) {
  const lq = q.toLowerCase();
  const card = "play-host relative block rounded-lg bg-card p-5 transition hover:bg-card-hover";
  if (artist && (!song || (artist.artist.toLowerCase().startsWith(lq) && !song.title.toLowerCase().startsWith(lq)))) {
    return (
      <div className={card}>
        <Cover s={{ artwork_url: artist.artwork_url, original_key: artist.artist[0] }} className="size-24 rounded-full text-3xl shadow-lg shadow-black/50" sizes="96px" />
        <Link href={artistHref(artist.artist)} className="mt-5 block truncate text-3xl font-black tracking-[-0.03em] after:absolute after:inset-0 after:rounded-lg">{artist.artist}</Link>
        <p className="mt-2 text-sm text-muted"><span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-ink">Artis</span> <span className="ml-1">{artist.songs} lagu</span></p>
      </div>
    );
  }
  if (!song) return null;
  return (
    <div className={card}>
      <Cover s={song} className="size-24 rounded-md text-3xl shadow-lg shadow-black/50" sizes="96px" />
      <Link href={`/songs/${song.slug}`} className="mt-5 block truncate text-3xl font-black tracking-[-0.03em] after:absolute after:inset-0 after:rounded-lg">{song.title}</Link>
      <p className="mt-2 text-sm text-muted">
        <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-ink">Lagu</span>
        {song.artist && <Link href={artistHref(song.artist)} className="relative z-10 ml-2 font-semibold text-ink hover:underline">{song.artist}</Link>}
      </p>
      {song.has_preview && <PlayButton track={{ ...song }} className="play-pop absolute bottom-5 right-5 z-10" />}
    </div>
  );
}

/** Empty search: genre tiles, a cover tilted into each corner. */
async function Browse() {
  const stats = await genreStats();
  const tile = "relative block aspect-[16/10] overflow-clip rounded-lg p-4 transition hover:brightness-110 active:scale-[.98]";
  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Jelajahi semua</h1>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        <li>
          <Link href="/songs" className={tile} style={{ background: "#056952" }}>
            <span className="text-lg font-black leading-tight tracking-[-0.02em] sm:text-2xl">Semua lagu</span>
          </Link>
        </li>
        {GENRES.filter((g) => stats[g.slug]).map((g) => (
          <li key={g.slug}>
            <Link href={`/genre/${g.slug}`} className={tile} style={{ background: g.color }}>
              <span className="relative z-10 block max-w-[75%] text-lg font-black leading-tight tracking-[-0.02em] sm:text-2xl">{g.name}</span>
              {stats[g.slug].artwork_url && (
                <span className="absolute -bottom-2 -right-4 size-[45%] rotate-[25deg] overflow-clip rounded shadow-[0_2px_12px_rgba(0,0,0,.4)]">
                  <Image src={stats[g.slug].artwork_url!} alt="" fill sizes="120px" className="object-cover" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
