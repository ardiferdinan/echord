// Import chord pages into the DB (private library). Fetching via Scrapling: scripts/scrape.py.
// Run: npx tsx --env-file=.env.local scripts/import.mts <url> [<url> ...] [--save]
// Without --save it only prints the converted ChordPro.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { importText } from "../lib/chordpro";
import { insertSong } from "../lib/db";

const urls = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const save = process.argv.includes("--save");
if (!urls.length) {
  console.error("Pakai: scripts/import.mts <url> [<url> ...] [--save]");
  process.exit(1);
}

const py = spawn("uv", ["run", "--quiet", new URL("scrape.py", import.meta.url).pathname, ...urls], { stdio: ["ignore", "pipe", "inherit"] });
for await (const line of createInterface({ input: py.stdout })) {
  const r = JSON.parse(line) as { url: string; error?: string; title: string; artist: string; key: string; text: string };
  if (r.error) {
    console.error(`✗ ${r.url}: ${r.error}`);
    continue;
  }
  const { content, key } = importText(r.text);
  if (!save) {
    console.log(`\n# ${r.title} — ${r.artist} · key ${r.key || key}\n${content}`);
    continue;
  }
  const slug = await insertSong({ title: r.title, artist: r.artist || null, original_key: r.key || key, bpm: null, content, status: "published" });
  console.log(`✓ ${r.title} → /songs/${slug}`);
}
