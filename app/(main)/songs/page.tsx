import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listSongs } from "@/lib/db";
import { Blob } from "@/components/Blob";

export const metadata = { title: "Semua lagu" };

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PER = 48;

export default function SongsPage({ searchParams }: PageProps<"/songs">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[32px] bg-surface-2" />}>
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

  return (
    <div>
      <Blob
        fill="var(--brand)"
        radius={32}
        className="mb-6 min-h-[160px] p-6 pr-36 text-on-brand sm:p-8 sm:pr-48"
        slots={{
          br: {
            node: (
              <div className="grid size-28 place-items-center rounded-3xl bg-dark text-on-dark sm:size-36">
                <span className="text-center">
                  <span className="display block text-4xl italic tabular-nums sm:text-5xl">{total}</span>
                  <span className="text-xs font-medium opacity-70">lagu</span>
                </span>
              </div>
            ),
          },
        }}
      >
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">Perpustakaan</p>
        <h1 className="display mt-1 text-[clamp(32px,6vw,56px)] uppercase">{q ? `“${q}”` : letter ? `Huruf ${letter}` : "Semua lagu"}</h1>
        {(q || letter) && (
          <Link href="/songs" className="mt-4 inline-flex h-10 items-center rounded-full bg-on-brand/15 px-4 text-sm font-bold hover:bg-on-brand/25">
            ✕ Reset filter
          </Link>
        )}
      </Blob>

      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Filter huruf awal">
        {LETTERS.map((l) => (
          <Link
            key={l}
            href={href({ huruf: l === letter ? undefined : l })}
            aria-current={l === letter ? "page" : undefined}
            className={`grid size-10 place-items-center rounded-xl lg:size-9 font-display font-bold italic transition ${l === letter ? "bg-brand text-on-brand" : "bg-surface-2 hover:bg-accent-soft"}`}
          >
            {l}
          </Link>
        ))}
      </nav>

      {songs.length ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {songs.map((s) => (
            <li key={s.id}>
              <Link href={`/songs/${s.slug}`} className="group flex items-center gap-3 rounded-3xl bg-surface-2 p-2.5 transition hover:bg-accent-soft">
                {s.artwork_url ? (
                  <Image src={s.artwork_url} alt="" width={56} height={56} className="size-14 shrink-0 rounded-2xl" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-bg text-accent">
                    <span className="display text-xl italic">{s.original_key || "♪"}</span>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[17px] font-extrabold">{s.title}</span>
                  <span className="block truncate text-sm text-muted">{s.artist || "—"}</span>
                </span>
                {s.artwork_url && s.original_key && (
                  <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 font-display text-sm font-bold italic text-accent">{s.original_key}</span>
                )}
                <span className="pr-1 text-lg text-muted transition group-hover:translate-x-1" aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl bg-surface-2 p-6 text-muted">Tidak ada lagu yang cocok.</p>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Halaman">
          {page > 1 ? <Link href={href({ huruf: letter, hal: page - 1 })} className="btn">← Sebelumnya</Link> : <span className="btn opacity-40">← Sebelumnya</span>}
          <span className="text-sm tabular-nums text-muted">{page} / {pages}</span>
          {page < pages ? <Link href={href({ huruf: letter, hal: page + 1 })} className="btn">Berikutnya →</Link> : <span className="btn opacity-40">Berikutnya →</span>}
        </nav>
      )}
    </div>
  );
}
