"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, ViewTransition } from "react";
import { detectKey, parseSections, transposeKey, transposeSections, type Section } from "@/lib/chordpro";
import type { Song } from "@/lib/db";
import { suggest } from "@/lib/voicing";
import { newItem, uid, useBandContext, useLocal, useSetlists } from "@/lib/storage";
import { BandContextPicker, ChordSheet } from "@/components/ChordSheet";
import { FontControl, NumbersControl, TransposeControl } from "@/components/Controls";
import { GuitarDiagram, PianoDiagram } from "@/components/Diagrams";
import { PlayButton } from "@/components/player/PlayButton";
import { usePlayer } from "@/components/player/PlayerProvider";
import { NoteIcon, PlusIcon } from "@/components/icons";
import { artistHref } from "@/components/library";

export function SongView({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [font, setFont] = useLocal("echord:font", 19);
  const [numbers, setNumbers] = useLocal("echord:numbers", false);
  const [ctx, setCtx] = useBandContext();
  const target = song.original_key ? transposeKey(song.original_key, transpose) : undefined;
  const sections = useMemo(() => transposeSections(parseSections(song.content), transpose, target), [song.content, transpose, target]);
  const playable = !!(song.preview_url || song.deezer_id);
  // picking a song starts its preview in the player bar
  const { cue } = usePlayer();
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
        <AddToSetlist song={song} transpose={transpose} />
        <span className="mx-1 h-8 w-px shrink-0 bg-line" aria-hidden />
        <TransposeControl value={transpose} onChange={setTranspose} originalKey={song.original_key} />
        <NumbersControl value={numbers} onChange={setNumbers} />
        <FontControl value={font} onChange={setFont} />
        {song.apple_url && (
          <a href={song.apple_url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-sm font-bold text-muted hover:text-ink hover:underline">
            Apple Music ↗
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <details className="group mb-6 w-fit">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
              Pengaturan band <span className="transition group-open:rotate-180" aria-hidden>▾</span>
            </summary>
            <div className="mt-3">
              <BandContextPicker ctx={ctx} onChange={setCtx} />
              <p className="mt-2 text-xs text-muted">Dipakai untuk saran voicing saat kamu membuka chord.</p>
            </div>
          </details>
          <ChordSheet sections={sections} fontSize={font} numberKey={numbers ? target || detectKey(sections) : undefined} />
        </div>
        <ChordRail sections={sections} />
      </div>
    </article>
  );
}

/** Desktop rail: every chord in the song (in the current key) with its first voicing. */
function ChordRail({ sections }: { sections: Section[] }) {
  const [ctx] = useBandContext();
  const chords = useMemo(() => [...new Set(sections.flatMap((s) => s.lines.flatMap((l) => l.chords.map((c) => c.name))))].slice(0, 16), [sections]);
  if (!chords.length) return null;
  return (
    <aside className="hidden xl:block" aria-label="Chord di lagu ini">
      <div className="sticky top-40 rounded-lg bg-card p-4">
        <h2 className="font-bold">Chord di lagu ini</h2>
        <p className="text-xs text-muted">{ctx.instrument === "guitar" ? "Gitar" : "Piano"} · posisi pertama</p>
        <ul tabIndex={0} aria-label="Diagram chord" className="mt-3 grid max-h-[calc(100svh-18rem)] grid-cols-2 gap-x-2 gap-y-3 overflow-y-auto rounded-md">
          {chords.map((c) => {
            const s = suggest(c, ctx);
            const v = s.guitar[0];
            return (
              <li key={c} className="flex flex-col items-center rounded-md p-1">
                <span className="text-sm font-bold text-accent">{c}</span>
                {ctx.instrument === "guitar" ? (
                  v ? <GuitarDiagram v={v} size={0.62} /> : <span className="py-6 text-xs text-muted">Belum ada</span>
                ) : s.piano?.right.length ? (
                  <PianoDiagram left={s.piano.left} right={s.piano.right} />
                ) : (
                  <span className="py-6 text-xs text-muted">Belum ada</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function AddToSetlist({ song, transpose }: { song: Song; transpose: number }) {
  const [setlists, setSetlists] = useSetlists();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const add = (id: string | null) => {
    const item = newItem(song, transpose);
    const target = id ?? uid();
    setSetlists((prev) =>
      id
        ? prev.map((s) => (s.id === id ? { ...s, items: [...s.items, item], updatedAt: Date.now() } : s))
        : [{ id: target, name: "Setlist baru", items: [item], updatedAt: Date.now() }, ...prev],
    );
    setAdded(target);
    setOpen(false);
  };

  if (added) return <Link href={`/setlists/${added}`} className="btn shrink-0">Ditambahkan · buka setlist</Link>;
  return (
    <div className="relative shrink-0">
      <button
        className="grid size-10 place-items-center rounded-full border-2 border-muted text-muted transition hover:scale-[1.06] hover:border-ink hover:text-ink"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Tambahkan ke setlist"
        title="Tambahkan ke setlist"
      >
        <PlusIcon className="size-5" />
      </button>
      {open && (
        <div className="fixed z-40 mt-2 w-64 rounded-md bg-[#282828] p-1 shadow-2xl shadow-black/60" role="menu">
          <button role="menuitem" onClick={() => add(null)} className="w-full rounded-sm px-3 py-2.5 text-left text-sm font-semibold hover:bg-white/10">+ Setlist baru</button>
          {setlists.map((s) => (
            <button role="menuitem" key={s.id} onClick={() => add(s.id)} className="w-full truncate rounded-sm px-3 py-2.5 text-left text-sm hover:bg-white/10">
              {s.name} <span className="text-muted">· {s.items.length} lagu</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
