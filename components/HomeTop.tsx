"use client";
import Link from "next/link";
import { useHydrated, useSetlists } from "@/lib/storage";
import { ChordIcon, NoteIcon } from "./icons";
import { Mosaic } from "./shell/Mosaic";

function greeting(h: number) {
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Greeting by the visitor's clock, then shortcut tiles: latest setlists, all songs, the chord dictionary. */
export function HomeTop() {
  const [setlists] = useSetlists();
  const hydrated = useHydrated();
  const hour = hydrated ? new Date().getHours() : 9;
  const recent = hydrated ? [...setlists].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6) : [];
  const tile = "play-host group flex h-14 items-center gap-3 overflow-clip rounded-md bg-white/10 pr-3 font-bold transition hover:bg-white/20 sm:h-16";

  return (
    <div>
      <h1 className="pt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl">{greeting(hour)}</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Link href="/songs" className={tile}>
          <span className="grid h-full aspect-square place-items-center bg-gradient-to-br from-[#4b2dbe] to-[#8c78e0]"><NoteIcon className="size-6" /></span>
          <span className="truncate text-sm sm:text-base">Semua lagu</span>
        </Link>
        <Link href="/chords" className={tile}>
          <span className="grid h-full aspect-square place-items-center bg-gradient-to-br from-[#1ed760] to-[#0e6b30] text-black"><ChordIcon className="size-6" /></span>
          <span className="truncate text-sm sm:text-base">Kamus chord</span>
        </Link>
        {recent.map((s) => (
          <Link key={s.id} href={`/setlists/${s.id}`} className={tile}>
            <Mosaic covers={s.items.map((i) => i.artwork)} className="h-full aspect-square" rounded="rounded-none" />
            <span className="truncate text-sm sm:text-base">{s.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
