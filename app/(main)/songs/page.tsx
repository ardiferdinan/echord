import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { listSongs } from "@/lib/db";
import { TrackList } from "@/components/library";

export const metadata = { title: "Semua lagu" };

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
  // old search links (/songs?q=) live on /search now
  if (p.q) redirect(`/search?q=${encodeURIComponent(String(p.q))}`);
  const letter = LETTERS.includes(String(p.huruf ?? "").toUpperCase()) ? String(p.huruf).toUpperCase() : "";
  const page = Math.max(1, parseInt(String(p.hal ?? "1"), 10) || 1);
  const { songs, total } = await listSongs({ letter, page, per: PER });
  const pages = Math.max(1, Math.ceil(total / PER));
  const href = (o: { huruf?: string; hal?: number }) => {
    const s = new URLSearchParams();
    if (o.huruf) s.set("huruf", o.huruf);
    if (o.hal && o.hal > 1) s.set("hal", String(o.hal));
    return `/songs${s.size ? `?${s}` : ""}`;
  };
  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-4">
        <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">{letter ? `Lagu berawalan ${letter}` : "Semua lagu"}</h1>
        <p className="text-sm text-muted">{total.toLocaleString("id-ID")} lagu</p>
      </div>

      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter huruf awal">
        <Link href="/songs" aria-current={!letter ? "page" : undefined} className="chip shrink-0">Semua</Link>
        {LETTERS.map((l) => (
          <Link key={l} href={href({ huruf: l === letter ? undefined : l })} aria-current={l === letter ? "page" : undefined} className="chip w-9 shrink-0 justify-center px-0">
            {l}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {songs.length ? (
          <TrackList songs={songs} start={(page - 1) * PER} />
        ) : (
          <div className="py-16 text-center">
            <p className="text-2xl font-bold">Belum ada lagu berawalan {letter}</p>
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
