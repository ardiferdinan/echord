"use client";
import { ActiveLink } from "../NavLink";
import { ChordIcon, HomeIcon, LibraryIcon, SearchIcon } from "../icons";

const tab = (on: boolean) => `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${on ? "text-ink" : "text-muted"}`;

/** Phones and tablets: bottom tabs, Spotify-style. */
export function TabBar() {
  return (
    <nav aria-label="Navigasi utama" className="flex h-16 items-stretch bg-gradient-to-t from-black via-black/95 to-black/80 lg:hidden">
      <ActiveLink href="/" exact className={tab}>{(on) => <><HomeIcon filled={on} className="size-6" />Beranda</>}</ActiveLink>
      <ActiveLink href="/songs" exact className={tab}>{() => <><SearchIcon className="size-6" />Cari</>}</ActiveLink>
      <ActiveLink href="/chords" className={tab}>{() => <><ChordIcon className="size-6" />Chord</>}</ActiveLink>
      <ActiveLink href="/setlists" className={tab}>{() => <><LibraryIcon className="size-6" />Pustaka</>}</ActiveLink>
    </nav>
  );
}
