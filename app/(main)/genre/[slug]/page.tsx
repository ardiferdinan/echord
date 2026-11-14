import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { genreSongs } from "@/lib/db";
import { genreBySlug } from "@/lib/genres";
import { TrackList, track } from "@/components/library";
import { PlayButton } from "@/components/player/PlayButton";

const PER = 50;

export async function generateMetadata({ params }: PageProps<"/genre/[slug]">) {
  return { title: genreBySlug((await params).slug)?.name ?? "Genre" };
}

export default function GenrePage(props: PageProps<"/genre/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="-mx-4 -mt-16 h-[300px] bg-gradient-to-b from-[#3a3a3a] to-panel sm:-mx-6" />}>
      <Genre {...props} />
    </Suspense>
  );
}

async function Genre({ params, searchParams }: PageProps<"/genre/[slug]">) {
  await connection();
  const g = genreBySlug((await params).slug);
  if (!g) notFound();
  const page = Math.max(1, parseInt(String((await searchParams).hal ?? "1"), 10) || 1);
  const { songs, total } = await genreSongs(g, page, PER);
  const pages = Math.ceil(total / PER);
  const first = songs.find((s) => s.has_preview);
  const href = (hal: number) => `/genre/${g.slug}${hal > 1 ? `?hal=${hal}` : ""}`;

  return (
    <div>
      <header className="-mx-4 -mt-16 px-4 pb-6 pt-28 sm:-mx-6 sm:px-6" style={{ background: `linear-gradient(${g.color}, ${g.color}66 70%, transparent)` }}>
        <p className="text-sm font-semibold">Genre</p>
        <h1 className="headline mt-2 text-[clamp(44px,8vw,96px)]">{g.name}</h1>
        <p className="mt-3 text-sm text-ink/80">{total.toLocaleString("id-ID")} lagu</p>
      </header>
      {first && <div className="py-6"><PlayButton track={track(first)} queue={songs.filter((s) => s.has_preview).map(track)} size="lg" /></div>}
      <TrackList songs={songs} start={(page - 1) * PER} />
      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Halaman">
          {page > 1 && <Link href={href(page - 1)} className="btn">Sebelumnya</Link>}
          <span className="text-sm tabular-nums text-muted">{page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="btn">Berikutnya</Link>}
        </nav>
      )}
    </div>
  );
}
