"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, ViewTransition } from "react";
import { detectKey, parseSections, transposeKey, transposeSections } from "@/lib/chordpro";
import type { Song, Version } from "@/lib/db";
import { useRouter } from "next/navigation";
import { makePrimary } from "./actions";
import { sourceName } from "@/lib/sources";
import { useMe } from "@/lib/me";
import { useBandContext, useLocal } from "@/lib/storage";
import { BandContextPicker, ChordSheet } from "@/components/ChordSheet";
import { FontControl, NumbersControl, TransposeControl } from "@/components/Controls";
import { PlayButton } from "@/components/player/PlayButton";
import { AddToSetlist } from "@/components/AddToSetlist";
import { ChordShapes } from "@/components/ChordShapes";
import { SheetColorButton } from "@/components/SheetColors";
import { usePlayer } from "@/components/player/PlayerProvider";
import { NoteIcon } from "@/components/icons";
import { artistHref } from "@/components/library";

export function SongView({ song: base, versions = [] }: { song: Song; versions?: Version[] }) {
  // several sources for this song: the picked one's chords drive the whole page (and what goes into a setlist)
  const [vi, setVi] = useState(0);
  const v = versions[vi];
  const song: Song = v ? { ...base, content: v.content, original_key: v.original_key, bpm: v.bpm, source_url: v.source_url } : base;
  const router = useRouter();
  const me = useMe(); // changing the library's default source: super admin only
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState("");
  const pickVersion = (i: number) => {
    setVi(i);
    setTranspose(0); // each source has its own key
  };
  const primary = async () => {
    if (!v || vi === 0) return;
    setSwapping(true);
    setSwapError("");
    const r = await makePrimary(base.id, v.id);
    setSwapping(false);
    if (r.error) return setSwapError(r.error);
    setVi(0);
    router.refresh();
  };
  const [transpose, setTranspose] = useState(0);
  const [font, setFont] = useLocal("echord:font", 19);
  const [numbers, setNumbers] = useLocal("echord:numbers", false);
  const [ctx, setCtx] = useBandContext();
  const target = song.original_key ? transposeKey(song.original_key, transpose) : undefined;
  const sections = useMemo(() => transposeSections(parseSections(song.content), transpose, target), [song.content, transpose, target]);
  const playable = !!(song.preview_url || song.deezer_id);
  // picking a song starts its preview in the player bar
  const { cue } = usePlayer();
  // opened from the player's chord button (#chords): the main panel scrolls, not the window, so do it here
  useEffect(() => {
    if (location.hash === "#chords") document.getElementById("chords")?.scrollIntoView();
  }, [song.id]);
  useEffect(() => {
    if (playable) cue({ id: song.id, slug: song.slug, title: song.title, artist: song.artist, artwork_url: song.artwork_url });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per song; cue ignores the song already loaded
  }, [song.id, playable]);
  const meta = [song.album, song.release_year, target && `Kunci ${target}`, song.bpm && `${song.bpm} BPM`].filter(Boolean);

  return (
    <article>
      {/* header: the cover, blurred, is the backdrop */}
      <header className="relative -mx-4 -mt-16 overflow-clip px-4 pb-6 pt-24 sm:-mx-6 sm:px-6">
        {song.artwork_url && (
          <Image src={song.artwork_url} alt="" fill sizes="100vw" aria-hidden className="scale-125 object-cover opacity-60 blur-3xl saturate-150" />
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-panel" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
          {song.artwork_url ? (
            <ViewTransition name={`cover-${song.id}`} share="morph" default="none">
              <Image src={song.artwork_url} alt={`Cover ${song.album ?? song.title}`} width={232} height={232} priority className="size-44 shrink-0 rounded-md object-cover shadow-2xl shadow-black/60 sm:size-[232px]" />
            </ViewTransition>
          ) : (
            <span className="grid size-44 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] text-6xl font-black text-muted shadow-2xl shadow-black/60 sm:size-[232px]">
              {song.original_key || <NoteIcon className="size-16" />}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">Lagu</p>
            <h1 className="headline mt-2 text-[clamp(36px,6vw,88px)]">{song.title}</h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink/90">
              {song.artist ? (
                <Link href={artistHref(song.artist)} className="font-bold text-ink hover:underline">{song.artist}</Link>
              ) : (
                <span className="font-bold">Tanpa nama penyanyi</span>
              )}
              {meta.map((m) => (
                <span key={String(m)} className="before:mr-1.5 before:content-['•']">{m}</span>
              ))}
            </p>
          </div>
        </div>
      </header>

      {/* actions: one row that scrolls sideways on phones */}
      <div className="sticky top-16 z-20 -mx-4 flex items-center gap-3 overflow-x-auto bg-panel/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:gap-4 sm:px-6">
        {playable && <PlayButton track={song} size="lg" />}
        <AddToSetlist song={song} transpose={transpose} size="lg" />
        <span className="mx-1 h-8 w-px shrink-0 bg-line" aria-hidden />
        <TransposeControl value={transpose} onChange={setTranspose} originalKey={song.original_key} />
        <NumbersControl value={numbers} onChange={setNumbers} />
        <FontControl value={font} onChange={setFont} />
        <SheetColorButton className="bg-surface-2" />
        {song.apple_url && (
          <a href={song.apple_url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-sm font-bold text-muted hover:text-ink hover:underline">
            Apple Music ↗
          </a>
        )}
      </div>

      {versions.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Sumber chord">
          <span className="font-semibold text-muted">Sumber chord:</span>
          {versions.map((x, i) => (
            <button key={x.id} type="button" onClick={() => pickVersion(i)} aria-pressed={vi === i} className="chip">
              {sourceName(x.source_url ?? null)}
              {i === 0 && <span className="ml-1 text-[11px] font-semibold opacity-70">utama</span>}
            </button>
          ))}
          {vi > 0 && me?.role === "superadmin" && (
            <button type="button" onClick={primary} disabled={swapping} className="btn h-8 px-3 text-xs sm:h-8" title="Versi ini yang tampil pertama dan dipakai di setlist">
              {swapping ? "Menyimpan…" : "Jadikan utama"}
            </button>
          )}
          {v?.source_url && (
            <a href={v.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-muted hover:text-ink hover:underline">
              buka sumber ↗
            </a>
          )}
          {swapError && <span className="text-xs text-hot" role="alert">{swapError}</span>}
        </div>
      )}

      <div className="mt-4 grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <details className="group mb-6 w-fit xl:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
              Pengaturan band <span className="transition group-open:rotate-180" aria-hidden>▾</span>
            </summary>
            <div className="mt-3">
              <BandContextPicker ctx={ctx} onChange={setCtx} />
              <p className="mt-2 text-xs text-muted">Dipakai untuk saran voicing saat kamu membuka chord.</p>
            </div>
          </details>
          <div id="chords" className="scroll-mt-40" />
          <ChordSheet sections={sections} fontSize={font} numberKey={numbers ? target || detectKey(sections) : undefined} />
        </div>
        <aside className="hidden xl:block" aria-label="Bentuk chord"><ChordShapes sections={sections} className="sticky top-40" /></aside>
      </div>
    </article>
  );
}


