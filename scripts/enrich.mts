// Fill album / cover / 30 s preview / listen link.
// Run: npx tsx --env-file=.env.local scripts/enrich.mts [--limit 50] [--retry]
//   first pass: iTunes Search with "title artist"
//   --retry: songs still without cover -> iTunes with the title only, then Deezer (cover + embed player)
// ponytail: no BPM source; Deezer's bpm is mostly 0 or double-time for these songs, try GetSongBPM if needed.
import { neon } from "@neondatabase/serverless";
import { bigArtwork, fromDeezer, pickMatch, type DeezerTrack, type ItunesTrack } from "../lib/enrich";

const sql = neon(process.env.DATABASE_URL!);
const argv = process.argv.slice(2);
const limit = argv.includes("--limit") ? +argv[argv.indexOf("--limit") + 1] : 10_000;
const retry = argv.includes("--retry");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(url: string): Promise<T> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": "echord/0.1" } });
    if (res.ok) return res.json() as Promise<T>;
    if (i >= 3 || !(res.status === 403 || res.status === 429 || res.status >= 500)) throw new Error(`${res.status} ${new URL(url).host}`);
    await wait(60_000 * (i + 1)); // iTunes answers 403 when we go over ~20/min
  }
}
const itunes = async (term: string) => {
  const r = await get<{ results: ItunesTrack[] }>(`https://itunes.apple.com/search?entity=song&limit=25&country=id&term=${encodeURIComponent(term)}`);
  await wait(3200); // stay under iTunes' ~20 requests/minute
  return r.results;
};
const deezer = async (q: string) => ((await get<{ data?: DeezerTrack[] }>(`https://api.deezer.com/search?limit=15&q=${encodeURIComponent(q)}`)).data ?? []).map(fromDeezer);

type Row = { id: number; title: string; artist: string | null };
const rows = (await (retry
  ? sql`select id, title, artist from songs where artwork_url is null order by id limit ${limit}`
  : sql`select id, title, artist from songs where enriched_at is null order by id limit ${limit}`)) as Row[];
console.log(`${rows.length} lagu akan dicek…`);

let fromItunes = 0, fromDeezer_ = 0;
for (const [i, s] of rows.entries()) {
  const tag = `[${i + 1}/${rows.length}] ${s.title}${s.artist ? ` — ${s.artist}` : ""}`;
  try {
    const full = `${s.title} ${s.artist ?? ""}`.trim();
    const m = pickMatch(s, await itunes(retry ? s.title : full));
    let dz: DeezerTrack | undefined;
    if (!m && retry && s.artist) {
      const hit = pickMatch(s, await deezer(full)) ?? pickMatch(s, await deezer(s.title));
      dz = (hit as ReturnType<typeof fromDeezer> | undefined)?.deezer;
    }
    await sql`
      update songs set
        album = coalesce(${m?.collectionName ?? dz?.album.title ?? null}, album),
        release_year = coalesce(${m?.releaseDate ? +m.releaseDate.slice(0, 4) : null}::int, release_year),
        artwork_url = coalesce(${bigArtwork(m?.artworkUrl100) ?? dz?.album.cover_xl ?? null}, artwork_url),
        preview_url = coalesce(${m?.previewUrl ?? null}, preview_url),
        apple_url = coalesce(${m?.trackViewUrl ?? null}, apple_url),
        deezer_id = coalesce(${dz?.id ?? null}::bigint, deezer_id),
        enriched_at = now()
      where id = ${s.id}`;
    if (m) fromItunes++;
    if (dz) fromDeezer_++;
    console.log(`${tag}: ${m ? `✓ iTunes · ${m.collectionName}` : dz ? `✓ Deezer · ${dz.album.title}` : "– tidak cocok"}`);
  } catch (e) {
    console.error(`${tag}: ✗ ${(e as Error).message}`);
  }
}
console.log(`\nSelesai: ${fromItunes} dari iTunes, ${fromDeezer_} dari Deezer, dari ${rows.length} lagu.`);
