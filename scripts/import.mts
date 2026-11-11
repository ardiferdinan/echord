// Import chord pages into the DB (private library). Fetching via Scrapling: scripts/scrape.py.
// Run: npx tsx --env-file=.env.local scripts/import.mts <url ...> [--file urls.txt] [--letter a] [--save]
// Without --save it only prints the converted ChordPro. With --save, already-imported URLs are skipped.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { importText } from "../lib/chordpro";
import { importedUrls, insertSong } from "../lib/db";

const argv = process.argv.slice(2);
const opt = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const save = argv.includes("--save");
const file = opt("--file"), letter = opt("--letter")?.toLowerCase();
let urls = argv.filter((a, i) => a.startsWith("http") && !["--file", "--letter"].includes(argv[i - 1]));
if (file) urls.push(...readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean));
if (letter) urls = urls.filter((u) => new URL(u).pathname.slice(1).startsWith(letter));
if (save) {
  const done = await importedUrls();
  urls = urls.filter((u) => !done.has(u));
}
if (!urls.length) {
  console.log("Tidak ada URL baru untuk diimport.");
  process.exit(0);
}
console.log(`${urls.length} lagu akan diproses…`);

let ok = 0, fail = 0;
const py = spawn("uv", ["run", "--quiet", new URL("scrape.py", import.meta.url).pathname, ...urls], { stdio: ["ignore", "pipe", "inherit"] });
for await (const line of createInterface({ input: py.stdout })) {
  const r = JSON.parse(line) as { url: string; error?: string; title: string; artist: string; key: string; bpm: number | null; text: string };
  const n = ok + fail + 1;
  try {
    if (r.error) throw new Error(r.error);
    const { content, key } = importText(r.text);
    if (!content.trim()) throw new Error("isi kosong setelah konversi");
    if (!save) {
      console.log(`\n# ${r.title} — ${r.artist} · key ${r.key || key}\n${content}`);
    } else {
      const slug = await insertSong({ title: r.title, artist: r.artist || null, original_key: r.key || key, bpm: r.bpm, content, status: "published", source_url: r.url });
      console.log(`[${n}/${urls.length}] ✓ ${r.title} → /songs/${slug}`);
    }
    ok++;
  } catch (e) {
    fail++;
    console.error(`[${n}/${urls.length}] ✗ ${r.url}: ${(e as Error).message}`);
  }
}
console.log(`\nSelesai: ${ok} berhasil, ${fail} gagal.`);
