import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listSongs } from "@/lib/db";
import { Cover, TrackList, artistHref } from "@/components/library";
import { PlayButton } from "@/components/player/PlayButton";

export const metadata = { title: "Cari lagu" };

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PER = 50;

export default function SongsPage({ searchParams }: PageProps<"/songs">) {
  return (
    <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-white/5" />}>
      <Songs searchParams={searchParams} />
    </Suspense>
  );
}

async function Songs({ searchParams }: Pick<PageProps<"/songs">, "searchParams">) {
  await connection();
  const p = await searchParams;
  const q = String(p.q ?? "").trim();
  const letter = LETTERS.includes(String(p.huruf ?? "").toUpperCase()) ? String(p.huruf).toUpperCase() : "";
  const page = Math.max(1, parseInt(String(p.hal ?? "1"), 10) || 1);
  const { songs, total } = await listSongs({ q, letter, page, per: PER });
  const pages = Math.max(1, Math.ceil(total / PER));
  const href = (o: { huruf?: string; hal?: number }) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (o.huruf) s.set("huruf", o.huruf);
    if (o.hal && o.hal > 1) s.set("hal", String(o.hal));
    return `/songs${s.size ? `?${s}` : ""}`;
  };
  const top = q && page === 1 ? songs[0] : undefined;

  return (
    <div className="pt-2">
      {q ? (
        <h1 className="sr-only">Hasil pencarian “{q}”</h1>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-2 pt-4">
          <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">{letter ? `Lagu berawalan ${letter}` : "Semua lagu"}</h1>
          <p className="text-sm text-muted">{total.toLocaleString("id-ID")} lagu</p>
        </div>
      )}

      {!q && (
        <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter huruf awal">
          <Link href="/songs" aria-current={!letter ? "page" : undefined} className="chip shrink-0">Semua</Link>
          {LETTERS.map((l) => (
            <Link key={l} href={href({ huruf: l === letter ? undefined : l })} aria-current={l === letter ? "page" : undefined} className="chip w-9 shrink-0 justify-center px-0">
              {l}
            </Link>
          ))}
        </nav>
      )}

      {top && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-label="Hasil teratas">
            <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Hasil teratas</h2>
            <div className="play-host relative rounded-lg bg-card p-5 transition hover:bg-card-hover">
              <Cover s={top} className="size-24 rounded-md text-3xl shadow-lg shadow-black/50" sizes="96px" />
              <Link href={`/songs/${top.slug}`} className="mt-5 block truncate text-3xl font-black tracking-[-0.03em] after:absolute after:inset-0 after:rounded-lg">{top.title}</Link>
              <p className="mt-2 text-sm text-muted">
                <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-ink">Lagu</span>
                {top.artist && <Link href={artistHref(top.artist)} className="relative z-10 ml-2 font-semibold text-ink hover:underline">{top.artist}</Link>}
              </p>
              {top.has_preview && <PlayButton track={{ ...top }} className="play-pop absolute bottom-5 right-5 z-10" />}
            </div>
          </section>
          <section aria-label="Lagu" className="min-w-0">
            <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Lagu</h2>
            <TrackList songs={songs.slice(1, 5)} start={1} />
          </section>
        </div>
      )}

      <div className="mt-6">
        {songs.length ? (
          (!q || songs.length > 5 || page > 1) && (
            <>
              {q && page === 1 && <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Semua hasil untuk “{q}”</h2>}
              <TrackList songs={q && page === 1 ? songs.slice(5) : songs} start={q && page === 1 ? 5 : (page - 1) * PER} />
            </>
          )
        ) : (
          <div className="py-16 text-center">
            <p className="text-2xl font-bold">Tidak ada hasil untuk “{q || letter}”</p>
            <p className="mt-2 text-muted">Coba ejaan lain, atau cari nama penyanyinya.</p>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Halaman">
          {page > 1 && <Link href={href({ huruf: letter, hal: page - 1 })} className="btn">Sebelumnya</Link>}
          <span className="text-sm tabular-nums text-muted">{page} / {pages}</span>
          {page < pages && <Link href={href({ huruf: letter, hal: page + 1 })} className="btn">Berikutnya</Link>}
        </nav>
      )}
    </div>
  );
}
