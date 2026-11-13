import Image from "next/image";
import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import type { ArtistCard as Artist, SongCard as Song } from "@/lib/db";
import { PlayButton } from "./player/PlayButton";
import { NoteIcon } from "./icons";

export const artistHref = (name: string) => `/artists/${encodeURIComponent(name)}`;
const track = (s: Song) => ({ id: s.id, slug: s.slug, title: s.title, artist: s.artist, artwork_url: s.artwork_url });

/** Cover, or the song's key on a tile when there is no artwork. */
export function Cover({ s, className, sizes = "200px" }: { s: Pick<Song, "artwork_url" | "original_key">; className: string; sizes?: string }) {
  return s.artwork_url ? (
    <span className={`relative block shrink-0 overflow-clip bg-surface-2 ${className}`}>
      <Image src={s.artwork_url} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  ) : (
    <span className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#2f2f2f] to-[#1a1a1a] font-black tracking-[-0.03em] text-muted ${className}`}>
      {s.original_key || <NoteIcon className="size-1/3" />}
    </span>
  );
}

/** Shelf card: cover with a play button that rises on hover; the whole card opens the song. */
export function SongCard({ s }: { s: Song }) {
  return (
    <div className="play-host group relative rounded-lg p-3 transition hover:bg-card-hover focus-within:bg-card-hover">
      <div className="relative">
        <Cover s={s} className="aspect-square w-full rounded-md text-4xl shadow-lg shadow-black/40" sizes="(min-width: 1024px) 200px, 45vw" />
        {s.has_preview && <PlayButton track={track(s)} className="play-pop absolute bottom-2 right-2 z-10" />}
      </div>
      <Link href={`/songs/${s.slug}`} className="mt-3 block truncate font-bold after:absolute after:inset-0 after:rounded-lg">{s.title}</Link>
      <p className="mt-1 truncate text-sm text-muted">{s.artist || "Tanpa nama penyanyi"}</p>
    </div>
  );
}

export function ArtistCard({ a }: { a: Artist }) {
  return (
    <Link href={artistHref(a.artist)} className="block rounded-lg p-3 transition hover:bg-card-hover">
      <Cover s={{ artwork_url: a.artwork_url, original_key: a.artist[0] }} className="aspect-square w-full rounded-full text-5xl shadow-lg shadow-black/40" sizes="(min-width: 1024px) 200px, 45vw" />
      <p className="mt-3 truncate font-bold">{a.artist}</p>
      <p className="mt-1 text-sm text-muted">Artis · {a.songs} lagu</p>
    </Link>
  );
}

/** Titled row of cards that scrolls sideways (snapping per card). */
export function Shelf({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="mt-8" aria-label={title}>
      <div className="mb-1 flex items-end justify-between gap-4 px-1">
        <h2 className="text-2xl font-bold tracking-[-0.02em] hover:underline">{href ? <Link href={href}>{title}</Link> : title}</h2>
        {href && <Link href={href} className="shrink-0 text-sm font-bold text-muted hover:underline">Tampilkan semua</Link>}
      </div>
      <div className="-mx-3 grid snap-x auto-cols-[44%] grid-flow-col overflow-x-auto pb-3 sm:auto-cols-[30%] md:auto-cols-[23%] lg:auto-cols-[196px] [&>*]:min-w-0 [&>*]:snap-start">
        {children}
      </div>
    </section>
  );
}

/** Track list: # (play on hover) · cover + title + artist · album · key. Rows never overflow: the middle column shrinks and truncates. */
export function TrackList({ songs, start = 0, showArtist = true }: { songs: Song[]; start?: number; showArtist?: boolean }) {
  return (
    <div role="table" aria-label="Daftar lagu">
      <div role="row" className="sticky top-16 z-10 mb-2 hidden grid-cols-[2.5rem_minmax(0,1fr)_3.5rem] items-center gap-4 border-b border-line bg-panel px-4 py-2 text-sm text-muted md:grid md:grid-cols-[2.5rem_minmax(0,4fr)_minmax(0,3fr)_3.5rem]">
        <span role="columnheader" className="text-right">#</span>
        <span role="columnheader">Judul</span>
        <span role="columnheader" className="hidden md:block">Album</span>
        <span role="columnheader" className="text-right">Kunci</span>
      </div>
      {songs.map((s, i) => (
        <div
          role="row"
          key={s.id}
          className="track-row group relative grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/10 focus-within:bg-white/10 sm:gap-4 sm:px-4 md:grid-cols-[2.5rem_minmax(0,4fr)_minmax(0,3fr)_3.5rem]"
        >
          <span role="cell" className="relative z-10 grid place-items-center justify-items-end text-[15px] tabular-nums text-muted">
            <span className={s.has_preview ? "track-num" : ""}>{start + i + 1}</span>
            {s.has_preview && <PlayButton track={track(s)} size="sm" className="track-play !bg-transparent !text-ink !shadow-none" />}
          </span>
          <span role="cell" className="flex min-w-0 items-center gap-3">
            {s.artwork_url ? (
              <ViewTransition name={`cover-${s.id}`} share="morph" default="none">
                <Image src={s.artwork_url} alt="" width={48} height={48} className="size-10 shrink-0 rounded object-cover sm:size-12" />
              </ViewTransition>
            ) : (
              <Cover s={s} className="size-10 rounded text-sm sm:size-12" />
            )}
            <span className="min-w-0">
              <Link href={`/songs/${s.slug}`} className="block truncate font-semibold after:absolute after:inset-0 after:rounded-md">{s.title}</Link>
              {showArtist && <span className="block truncate text-sm text-muted">{s.artist || "Tanpa nama penyanyi"}</span>}
            </span>
          </span>
          <span role="cell" className="hidden truncate text-sm text-muted md:block">{s.album ?? ""}</span>
          <span role="cell" className="text-right text-sm font-bold text-muted">{s.original_key ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
