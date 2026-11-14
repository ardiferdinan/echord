// Import chord pages into the DB (private library). Fetching via Scrapling: scripts/scrape.py.
// Run: npx tsx --env-file=.env.local scripts/import.mts <url ...> [--file urls.txt] [--letter a] [--save]
//      npx tsx --env-file=.env.local scripts/import.mts --jsonl scripts/psalmnote.jsonl [--save]
//        (songs already crawled by scripts/psalmnote.py; only Indonesian/English. A song we already have
//         from another site is saved as a version of it, to pick on the song page; same site = skipped)
// Without --save it only prints the converted ChordPro. With --save, already-imported URLs are skipped.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { importText } from "../lib/chordpro";
import { importedUrls, insertSong, songKeys } from "../lib/db";
import { artistMatches, norm, similar } from "../lib/enrich";

type Row = { url: string; error?: string; title: string; artist: string; key: string; bpm: number | null; lang?: string; text: string };
const argv = process.argv.slice(2);
const opt = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const save = argv.includes("--save");
const file = opt("--file"), letter = opt("--letter")?.toLowerCase(), jsonl = opt("--jsonl");
let urls = argv.filter((a, i) => a.startsWith("http") && !["--file", "--letter"].includes(argv[i - 1]));
if (file) urls.push(...readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean));
if (letter) urls = urls.filter((u) => new URL(u).pathname.slice(1).startsWith(letter));
const done = save ? await importedUrls() : new Set<string>();
urls = urls.filter((u) => !done.has(u));

// --jsonl: a song we already have (same title, same or unknown artist) from ANOTHER site becomes a version
// of it (status 'version'); from the same site (PsalmNote's "-2" duplicate pages) it is skipped
let rows: AsyncIterable<string> | string[];
let skipped = 0;
const versionOf = new Map<string, number>(); // url -> id of the song it is a version of
if (jsonl) {
  const have: { id: number; title: string; artist: string | null; host: string }[] = (await songKeys())
    .filter((h) => !h.version_of)
    .map((h) => ({ id: h.id, title: h.title, artist: h.artist, host: h.source_url ? new URL(h.source_url).host : "" }));
  const named = (a: string | null) => (a && norm(a) ? a : null); // "-" = no artist
  const match = (r: Row) =>
    have.find((h) => similar(norm(h.title), norm(r.title)) >= 0.9 && (!named(h.artist) || !named(r.artist) || artistMatches(h.artist!, r.artist)));
  const all = readFileSync(jsonl, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  const seen = new Set<string>(); // the crawl file can list a page twice
  const fresh = all.filter((r) => {
    if (done.has(r.url) || seen.has(r.url) || !["ind", "eng"].includes(r.lang ?? "")) return (skipped++, false);
    seen.add(r.url);
    const m = match(r);
    if (m && (m.id < 0 || m.host === new URL(r.url).host)) return (skipped++, false);
    if (m) versionOf.set(r.url, m.id);
    else have.push({ id: -1, title: r.title, artist: r.artist, host: new URL(r.url).host }); // new this run
    return true;
  });
  rows = fresh.map((r) => JSON.stringify(r));
  console.log(`${all.length} di file, ${skipped} dilewati (sudah ada dari situs ini / bukan ind-eng), ${fresh.length - versionOf.size} lagu baru, ${versionOf.size} versi dari lagu yang sudah ada.`);
} else {
  if (!urls.length) {
    console.log("Tidak ada URL baru untuk diimport.");
    process.exit(0);
  }
  console.log(`${urls.length} lagu akan diproses…`);
  const py = spawn("uv", ["run", "--quiet", new URL("scrape.py", import.meta.url).pathname, ...urls], { stdio: ["ignore", "pipe", "inherit"] });
  rows = createInterface({ input: py.stdout });
}

let ok = 0, fail = 0;
const total = Array.isArray(rows) ? rows.length : urls.length;
for await (const line of rows) {
  const r = JSON.parse(line) as Row;
  const n = ok + fail + 1;
  try {
    if (r.error) throw new Error(r.error);
    const { content, key } = importText(r.text);
    if (!content.trim()) throw new Error("isi kosong setelah konversi");
    if (!save) {
      console.log(`\n# ${versionOf.has(r.url) ? "[versi] " : "[baru] "}${r.title} — ${r.artist} · key ${r.key || key}\n${content}`);
    } else {
      const of = versionOf.get(r.url);
      const slug = await insertSong({ title: r.title, artist: r.artist || null, original_key: r.key || key, bpm: r.bpm, content, status: of ? "version" : "published", source_url: r.url, version_of: of ?? null });
      console.log(`[${n}/${total}] ✓ ${r.title} → ${of ? `versi dari lagu #${of}` : `/songs/${slug}`}`);
    }
    ok++;
  } catch (e) {
    fail++;
    console.error(`[${n}/${total}] ✗ ${r.url}: ${(e as Error).message}`);
  }
}
console.log(`\nSelesai: ${ok} berhasil, ${fail} gagal.`);
