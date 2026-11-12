// Import chord pages into the DB (private library). Fetching via Scrapling: scripts/scrape.py.
// Run: npx tsx --env-file=.env.local scripts/import.mts <url ...> [--file urls.txt] [--letter a] [--save]
//      npx tsx --env-file=.env.local scripts/import.mts --jsonl scripts/psalmnote.jsonl [--save]
//        (songs already crawled by scripts/psalmnote.py; only Indonesian/English, skips songs we already have)
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

// --jsonl: a song we already have (same title, same or unknown artist) is skipped, whatever the source
let rows: AsyncIterable<string> | string[];
let skipped = 0;
if (jsonl) {
  const have = await songKeys();
  const dup = (r: Row) =>
    have.some((h) => similar(norm(h.title), norm(r.title)) >= 0.9 && (!h.artist || !r.artist || artistMatches(h.artist, r.artist)));
  const all = readFileSync(jsonl, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
  const fresh = all.filter((r) => {
    if (done.has(r.url) || !["ind", "eng"].includes(r.lang ?? "") || dup(r)) return (skipped++, false);
    have.push(r); // PsalmNote lists some songs twice ("-2" urls)
    return true;
  });
  rows = fresh.map((r) => JSON.stringify(r));
  console.log(`${all.length} di file, ${skipped} dilewati (sudah ada / bukan ind-eng), ${fresh.length} baru.`);
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
      console.log(`\n# ${r.title} — ${r.artist} · key ${r.key || key}\n${content}`);
    } else {
      const slug = await insertSong({ title: r.title, artist: r.artist || null, original_key: r.key || key, bpm: r.bpm, content, status: "published", source_url: r.url });
      console.log(`[${n}/${total}] ✓ ${r.title} → /songs/${slug}`);
    }
    ok++;
  } catch (e) {
    fail++;
    console.error(`[${n}/${total}] ✗ ${r.url}: ${(e as Error).message}`);
  }
}
console.log(`\nSelesai: ${ok} berhasil, ${fail} gagal.`);
