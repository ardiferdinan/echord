"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { parseSections, transposeKey, transposeSections } from "@/lib/chordpro";
import type { Song } from "@/lib/db";
import { newItem, uid, useBandContext, useLocal, useSetlists } from "@/lib/storage";
import { BandContextPicker, ChordSheet } from "@/components/ChordSheet";
import { FontControl, TransposeControl } from "@/components/Controls";
import { Blob } from "@/components/Blob";

export function SongView({ song }: { song: Song }) {
  const [transpose, setTranspose] = useState(0);
  const [font, setFont] = useLocal("echord:font", 17);
  const [ctx, setCtx] = useBandContext();
  const target = song.original_key ? transposeKey(song.original_key, transpose) : undefined;
  const sections = useMemo(() => transposeSections(parseSections(song.content), transpose, target), [song.content, transpose, target]);

  return (
    <article>
      <Blob
        fill="var(--brand)"
        radius={32}
        className="mb-8 min-h-[168px] p-6 pr-32 text-on-brand sm:min-h-[200px] sm:p-8 sm:pr-44"
        slots={{
          br: {
            node: (
              <div className="grid size-24 place-items-center rounded-3xl bg-dark text-on-dark sm:size-32">
                <span className="text-center">
                  <span className="display block text-4xl italic sm:text-5xl">{target ?? "—"}</span>
                  <span className="text-xs font-medium opacity-70">{transpose ? `asli ${song.original_key}` : "kunci asli"}</span>
                </span>
              </div>
            ),
          },
        }}
      >
        <span className="dots pointer-events-none absolute right-40 top-6 hidden h-20 w-32 opacity-50 sm:block" aria-hidden />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          {song.artwork_url && (
            <Image src={song.artwork_url} alt={`Cover ${song.album ?? song.title}`} width={112} height={112} className="size-16 shrink-0 rounded-2xl shadow-lg shadow-black/20 sm:size-28" />
          )}
          <div className="min-w-0">
            <h1 className="display text-[clamp(32px,6vw,56px)] uppercase">{song.title}</h1>
            <p className="mt-3 font-medium">
              {song.artist}
              {song.bpm ? ` · ${song.bpm} BPM` : ""}
            </p>
            {song.album && (
              <p className="mt-0.5 text-sm opacity-80">
                {song.album}
                {song.release_year ? ` · ${song.release_year}` : ""}
              </p>
            )}
          </div>
        </div>
        {song.preview_url && (
          <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <audio controls preload="none" src={song.preview_url} className="h-10 w-full max-w-xs" aria-label={`Preview 30 detik ${song.title}`} />
            {song.apple_url && (
              <a href={song.apple_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline-offset-4 hover:underline">
                Dengarkan di Apple Music ↗
              </a>
            )}
          </div>
        )}
      </Blob>

      <div className="glass z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:sticky sm:top-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <TransposeControl value={transpose} onChange={setTranspose} originalKey={song.original_key} />
        <FontControl value={font} onChange={setFont} />
        <BandContextPicker ctx={ctx} onChange={setCtx} />
        <div className="ml-auto">
          <AddToSetlist song={song} transpose={transpose} />
        </div>
      </div>

      <p className="mb-4 text-xs text-muted">Arahkan kursor (atau tap) ke chord untuk melihat diagram & saran voicing.</p>
      <ChordSheet sections={sections} fontSize={font} />
    </article>
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

  if (added) return <Link href={`/setlists/${added}`} className="btn">✓ Ditambahkan — buka setlist</Link>;
  return (
    <div className="relative">
      <button className="btn btn-primary" onClick={() => setOpen(!open)} aria-expanded={open}>+ Setlist</button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-60 card p-1 shadow-xl shadow-black/10">
          <button onClick={() => add(null)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-accent hover:bg-surface-2">+ Buat setlist baru</button>
          {setlists.map((s) => (
            <button key={s.id} onClick={() => add(s.id)} className="w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2">
              {s.name} <span className="text-muted">· {s.items.length} lagu</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
