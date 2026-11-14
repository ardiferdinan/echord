"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { newItem, uid, useSetlists } from "@/lib/storage";
import type { Song } from "@/lib/db";
import { Mosaic } from "./shell/Mosaic";
import { Popover, menuItem } from "./Popover";
import { CheckCircleIcon, DotsIcon, LinkIcon, NoteIcon, PlusCircleIcon, PlusIcon, QueueAddIcon, SearchIcon, UserIcon, ChevronIcon } from "./icons";
import { usePlayer } from "./player/PlayerProvider";

/** What a list row knows; the full song (ChordPro) is fetched when it is first added. */
export type SongRef = Pick<Song, "id" | "slug" | "title" | "artist"> & Partial<Pick<Song, "artwork_url" | "original_key" | "content">> & { has_preview?: boolean };

const full = async (s: SongRef): Promise<Song> => {
  if (s.content !== undefined) return s as Song;
  const res = await fetch(`/api/songs/${encodeURIComponent(s.slug)}`);
  if (!res.ok) throw new Error("Lagu gagal dimuat");
  return res.json();
};

/** Is this song in any setlist? (drives the green check on the + button) */
function useSaved(songId: number) {
  const [setlists] = useSetlists();
  return setlists.some((l) => l.items.some((i) => i.songId === songId)); // server snapshot is [], so no hydration mismatch
}

/** Setlist picker, like adding a track to a playlist: search, new setlist, tick the setlists to keep it in. */
export function SetlistPicker({ song, transpose = 0, onDone }: { song: SongRef; transpose?: number; onDone: () => void }) {
  const [setlists, setSetlists] = useSetlists();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = [...setlists].sort((a, b) => b.updatedAt - a.updatedAt).filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));

  const withSong = async (fn: (s: Song) => void) => {
    setBusy(true);
    setError("");
    try {
      fn(await full(song));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id: string, inside: boolean) =>
    inside
      ? setSetlists((prev) => prev.map((l) => (l.id === id ? { ...l, items: l.items.filter((i) => i.songId !== song.id), updatedAt: Date.now() } : l)))
      : withSong((s) => setSetlists((prev) => prev.map((l) => (l.id === id ? { ...l, items: [...l.items, newItem(s, transpose)], updatedAt: Date.now() } : l))));
  const create = () =>
    withSong((s) => {
      const id = uid();
      setSetlists((prev) => [{ id, name: q.trim() || `Setlist ${prev.length + 1}`, items: [newItem(s, transpose)], updatedAt: Date.now() }, ...prev]);
      onDone();
      router.push(`/setlists/${id}`);
    });

  return (
    <div className="w-full">
      <p className="px-3 pb-2 pt-2 text-sm font-bold">Tambahkan ke setlist</p>
      <label className="mx-1 flex h-9 items-center gap-2 rounded bg-[#3e3e3e] px-2.5 text-muted focus-within:ring-2 focus-within:ring-white/80">
        <SearchIcon className="size-4 shrink-0" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari setlist" aria-label="Cari setlist" className="search-input min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
      </label>
      <button type="button" onClick={create} disabled={busy} className={`${menuItem} mt-1`}>
        <PlusIcon className="size-5" /> {q.trim() ? `Setlist baru “${q.trim()}”` : "Setlist baru"}
      </button>
      <div className="my-1 border-t border-white/10" />
      <ul aria-label="Setlist">
        {shown.map((l) => {
          const inside = l.items.some((i) => i.songId === song.id);
          return (
            <li key={l.id}>
              <button type="button" role="menuitemcheckbox" aria-checked={inside} disabled={busy} onClick={() => toggle(l.id, inside)} className={menuItem}>
                <Mosaic covers={l.items.map((i) => i.artwork)} className="size-8" />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                {inside ? <CheckCircleIcon className="size-5 shrink-0" /> : <span className="size-5 shrink-0 rounded-full border-2 border-muted" />}
              </button>
            </li>
          );
        })}
        {!shown.length && <li className="px-3 py-3 text-sm text-muted">{setlists.length ? "Tidak ada setlist dengan nama itu" : "Belum ada setlist"}</li>}
      </ul>
      {error && <p className="px-3 py-1 text-sm text-hot" role="alert">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-white/10 p-2">
        <button type="button" onClick={onDone} className="btn btn-dark h-8 px-4 text-sm sm:h-8">Selesai</button>
      </div>
    </div>
  );
}

/** Circled + that turns into a green check once the song is in a setlist. */
export function AddToSetlist({ song, transpose, size = "md", className = "" }: { song: SongRef; transpose?: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const saved = useSaved(song.id);
  const dim = { sm: "size-8 [&_svg]:size-[18px]", md: "size-8 [&_svg]:size-5", lg: "size-11 [&_svg]:size-8" }[size];
  return (
    <Popover
      label={saved ? "Ubah setlist lagu ini" : "Tambahkan ke setlist"}
      buttonClass={`grid shrink-0 place-items-center rounded-full text-muted transition hover:scale-[1.06] hover:text-ink ${dim} ${className}`}
      button={saved ? <CheckCircleIcon /> : <PlusCircleIcon />}
    >
      {(close) => <SetlistPicker song={song} transpose={transpose} onDone={close} />}
    </Popover>
  );
}

/** ⋯ on a track row: setlist, queue, artist, chords, copy link. */
export function SongMenu({ song, className = "" }: { song: SongRef; className?: string }) {
  return (
    <Popover
      label={`Opsi lainnya untuk ${song.title}`}
      buttonClass={`grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:text-ink ${className}`}
      button={<DotsIcon className="size-5" />}
      panelClass="w-64"
    >
      {(close) => <MenuBody song={song} close={close} />}
    </Popover>
  );
}

// remounts on every open, so it always starts at the main menu
function MenuBody({ song, close }: { song: SongRef; close: () => void }) {
  const [view, setView] = useState<"menu" | "setlist">("menu");
  const [copied, setCopied] = useState(false);
  const p = usePlayer();
  if (view === "setlist") return <SetlistPicker song={song} onDone={close} />;
  return (
    <ul role="menu" aria-label={song.title}>
      <li><button type="button" role="menuitem" autoFocus onClick={() => setView("setlist")} className={menuItem}><PlusIcon className="size-5" /><span className="flex-1">Tambahkan ke setlist</span><ChevronIcon dir="right" className="size-4" /></button></li>
      {song.has_preview && (
        <li><button type="button" role="menuitem" onClick={() => { p.enqueue({ id: song.id, slug: song.slug, title: song.title, artist: song.artist, artwork_url: song.artwork_url }); close(); }} className={menuItem}><QueueAddIcon className="size-5" />Tambahkan ke antrean</button></li>
      )}
      <li role="separator" className="my-1 border-t border-white/10" />
      <li><Link role="menuitem" href={`/songs/${song.slug}`} onClick={close} className={menuItem}><NoteIcon className="size-5" />Buka chord</Link></li>
      {song.artist && <li><Link role="menuitem" href={`/artists/${encodeURIComponent(song.artist)}`} onClick={close} className={menuItem}><UserIcon className="size-5" />Buka artis</Link></li>}
      <li>
        <button type="button" role="menuitem" onClick={async () => { await navigator.clipboard.writeText(`${location.origin}/songs/${song.slug}`); setCopied(true); setTimeout(close, 700); }} className={menuItem}>
          <LinkIcon className="size-5" />{copied ? "Link disalin" : "Salin link lagu"}
        </button>
      </li>
    </ul>
  );
}
