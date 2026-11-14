// Fill songs.genre (see lib/genres.ts). Re-runnable; run after an import or after editing the artist table.
// Run: npx tsx --env-file=.env.local scripts/genre.mts
import { neon } from "@neondatabase/serverless";
import { genreFor } from "../lib/genres";

const sql = neon(process.env.DATABASE_URL!);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await sql`alter table songs add column if not exists genre text`;
await sql`create index if not exists songs_genre on songs (genre)`;

type Row = { id: number; title: string; artist: string | null; apple_url: string | null };
const rows = (await sql`select id, title, artist, apple_url from songs`) as Row[];

// iTunes genre per track, 150 ids per lookup, gently (~20 requests/minute)
const trackId = (u: string | null) => (u ? new URL(u).searchParams.get("i") : null);
const ids = rows.map((r) => trackId(r.apple_url)).filter((x): x is string => !!x);
const itunes = new Map<string, string>();
for (let i = 0; i < ids.length; i += 150) {
  const res = await fetch(`https://itunes.apple.com/lookup?country=id&id=${ids.slice(i, i + 150).join(",")}`, { headers: { "User-Agent": "echord/0.1" } });
  if (!res.ok) console.error(`\niTunes ${res.status}, batch ${i} pakai genre artis saja`);
  else for (const t of ((await res.json()) as { results: { trackId: number; primaryGenreName?: string }[] }).results) {
    if (t.primaryGenreName) itunes.set(String(t.trackId), t.primaryGenreName);
  }
  process.stdout.write(`\riTunes ${Math.min(i + 150, ids.length)}/${ids.length}`);
  await wait(3200);
}

const genres = rows.map((r) => genreFor({ title: r.title, artist: r.artist, itunesGenre: itunes.get(trackId(r.apple_url) ?? "") }));
await sql`update songs set genre = v.genre from unnest(${rows.map((r) => r.id)}::int[], ${genres}::text[]) as v(id, genre) where songs.id = v.id`;
const count: Record<string, number> = {};
for (const g of genres) count[g ?? "(tanpa genre)"] = (count[g ?? "(tanpa genre)"] ?? 0) + 1;
console.log("\n", count);
