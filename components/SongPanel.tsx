import Image from "next/image";
import Link from "next/link";
import type { Song } from "@/lib/db";

// Song list inside the hero: a translucent panel on the blue slab (same tint as the card tabs).
const PANEL = "flex min-h-0 flex-1 flex-col rounded-[28px] bg-[color-mix(in_srgb,var(--ink)_14%,transparent)] p-2 sm:p-3";

export function SongPanelSkeleton() {
  return (
    <div className={PANEL} aria-hidden>
      <div className="h-12" />
      {[0, 1, 2].map((i) => <div key={i} className="m-1 h-16 animate-pulse rounded-2xl bg-on-brand/10" />)}
    </div>
  );
}

type Row = Pick<Song, "id" | "slug" | "title" | "artist" | "original_key" | "artwork_url">;

export function SongPanelView({ songs, error }: { songs: Row[]; error?: string }) {
  return (
    <section id="lagu" className={PANEL} aria-label="Baru ditambahkan">
      <header className="flex items-center gap-3 px-3 pb-2 pt-2">
        <span className="display text-2xl italic" aria-hidden>♪</span>
        <h2 className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-widest opacity-90">Baru ditambahkan</h2>
        <Link href="/songs" className="grid h-9 place-items-center rounded-full px-3 text-sm font-bold hover:bg-on-brand/15">
          Semua lagu →
        </Link>
      </header>

      {error ? (
        <p className="m-1 rounded-2xl bg-on-brand/10 p-4 text-sm">Database belum terhubung: {error}</p>
      ) : songs.length ? (
        // scrolls inside the hero on desktop; flows normally on phones
        <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1 overflow-y-auto overscroll-contain pb-6 @xl:grid-cols-2 lg:pr-1 lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-40px),transparent)]">
          {songs.map((s, i) => (
            <li key={s.id}>
              <Link href={`/songs/${s.slug}`} className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-on-brand/12">
                {s.artwork_url ? (
                  <Image src={s.artwork_url} alt="" width={48} height={48} className="size-12 shrink-0 rounded-2xl" />
                ) : (
                  <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${i % 3 === 1 ? "bg-hot text-on-hot" : "bg-bg text-accent"}`}>
                    <span className="display text-xl italic">{s.original_key || "♪"}</span>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[17px] font-extrabold">{s.title}</span>
                  <span className="block truncate text-sm opacity-75">{s.artist || "—"}</span>
                </span>
                <span className="pr-2 text-xl transition group-hover:translate-x-1" aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-1 rounded-2xl bg-on-brand/10 p-4 text-sm">
          Belum ada lagu.{" "}
          <Link href="/admin/new" className="font-bold underline">Tambah lagu</Link>
        </p>
      )}
    </section>
  );
}
