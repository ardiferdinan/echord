// Fill album / cover / 30 s preview / Apple Music link from the iTunes Search API.
// Run: npx tsx --env-file=.env.local scripts/enrich.mts [--limit 50] [--retry]
// --retry also re-checks songs that found no match before. Safe to stop and re-run.
// ponytail: no BPM source; Deezer's bpm is mostly 0 or double-time for these songs, try GetSongBPM if needed.
import { neon } from "@neondatabase/serverless";
import { bigArtwork, pickMatch, type ItunesTrack } from "../lib/enrich";

const sql = neon(process.env.DATABASE_URL!);
const argv = process.argv.slice(2);
const limit = argv.includes("--limit") ? +argv[argv.indexOf("--limit") + 1] : 10_000;
const retry = argv.includes("--retry");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(term: string) {
  const url = `https://itunes.apple.com/search?entity=song&limit=25&country=id&term=${encodeURIComponent(term)}`;
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": "echord/0.1" } });
    if (res.ok) return ((await res.json()) as { results: ItunesTrack[] }).results;
    if (i >= 3 || !(res.status === 403 || res.status === 429 || res.status >= 500)) throw new Error(`iTunes ${res.status}`);
    await wait(60_000 * (i + 1)); // iTunes answers 403 when we go over ~20/min
  }
}

type Row = { id: number; title: string; artist: string | null };
const rows = (await (retry
  ? sql`select id, title, artist from songs where artwork_url is null order by id limit ${limit}`
  : sql`select id, title, artist from songs where enriched_at is null order by id limit ${limit}`)) as Row[];
console.log(`${rows.length} lagu akan dicek…`);

let found = 0;
for (const [i, s] of rows.entries()) {
  const tag = `[${i + 1}/${rows.length}] ${s.title}${s.artist ? ` — ${s.artist}` : ""}`;
  try {
    const m = pickMatch(s, await search(`${s.title} ${s.artist ?? ""}`.trim()));
    await sql`
      update songs set
        album = coalesce(${m?.collectionName ?? null}, album),
        release_year = coalesce(${m?.releaseDate ? +m.releaseDate.slice(0, 4) : null}::int, release_year),
        artwork_url = coalesce(${bigArtwork(m?.artworkUrl100) ?? null}, artwork_url),
        preview_url = coalesce(${m?.previewUrl ?? null}, preview_url),
        apple_url = coalesce(${m?.trackViewUrl ?? null}, apple_url),
        enriched_at = now()
      where id = ${s.id}`;
    if (m) found++;
    console.log(`${tag}: ${m ? `✓ ${m.collectionName}` : "– tidak cocok"}`);
  } catch (e) {
    console.error(`${tag}: ✗ ${(e as Error).message}`);
  }
  await wait(3200); // stay under iTunes' ~20 requests/minute
}
console.log(`\nSelesai: ${found}/${rows.length} cocok di iTunes.`);
