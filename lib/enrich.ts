// Match a song to iTunes Search results. Strict on purpose: a missing cover beats a wrong one.
export type ItunesTrack = {
  trackName: string; artistName: string; collectionName?: string; releaseDate?: string;
  primaryGenreName?: string; previewUrl?: string; artworkUrl100?: string; trackViewUrl?: string;
};

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9]+/g, "");

// words every other worship act shares; they say nothing about which artist it is
const GENERIC = new Set(["worship", "music", "band", "choir", "ministry", "ministries", "official", "the", "feat", "ft", "and", "church", "youth", "live", "team"]);
const words = (s: string) => new Set(s.toLowerCase().normalize("NFKD").split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !GENERIC.has(w)));

function artistMatches(ours: string, theirs: string) {
  const a = norm(ours), b = norm(theirs);
  if (a.includes(b) || b.includes(a)) return true;
  const wa = words(ours), wb = words(theirs);
  const common = [...wa].filter((w) => wb.has(w)).length;
  return common > 0 && common / Math.min(wa.size, wb.size) >= 0.5;
}

const CHRISTIAN = /christian|gospel|worship|inspirational/i;

const LIVE = /\b(live|remix|instrumental|karaoke|acoustic|reprise|minus one)\b/i;
// "Anak Bungsu (Ada Ampun Bapa Bagimu)" is also listed under the title in brackets
const titles = (t: string) => [norm(t), ...[...t.matchAll(/\((.*?)\)/g)].map((m) => m[1]).filter((x) => !LIVE.test(x)).map(norm)];

export function pickMatch(song: { title: string; artist: string | null }, results: ItunesTrack[]) {
  const ok = results.filter(
    (r) =>
      titles(r.trackName).includes(norm(song.title)) &&
      (song.artist ? artistMatches(song.artist, r.artistName) : CHRISTIAN.test(r.primaryGenreName ?? "")),
  );
  // studio version first, then the original (oldest) release
  ok.sort((a, b) => +LIVE.test(a.trackName) - +LIVE.test(b.trackName) || (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
  return ok[0];
}

export const bigArtwork = (url?: string) => url?.replace(/\/\d+x\d+bb\./, "/600x600bb.");
