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

/**
 * Same act? Words are compared loosely (Jeffrey ~ Jeffry, Sidney ~ Sydney), an acronym stands for the
 * words it abbreviates (TW Kiddy = True Worshippers Kiddy), featured artists count ("Jason & Nikita"
 * vs "Jason Irwan (feat. Nikita)"). Needs two shared words, or most of them: one shared surname is
 * not enough (Agnes Santoso is not Dwiki Santoso).
 */
export function artistMatches(ours: string, theirs: string) {
  const a = norm(ours), b = norm(theirs);
  if (a && b && (a.includes(b) || b.includes(a))) return true;
  const wa = [...words(ours)], wb = [...words(theirs)];
  const initials = (ws: string[], at: number, n: number) => ws.slice(at, at + n).map((w) => w[0]).join("");
  const has = (w: string, other: string[]) => other.some((o) => similar(w, o) >= 0.75);
  let shared = wa.filter((w) => has(w, wb)).length;
  // acronym: "tw" on one side stands for "true worshippers" on the other
  for (const [x, y] of [[wa, wb], [wb, wa]] as const)
    for (const w of x)
      if (w.length >= 2 && w.length <= 4)
        for (let i = 0; i + w.length <= y.length; i++) if (initials(y, i, w.length) === w) shared += w.length;
  return shared >= 2 || shared / Math.max(wa.length, wb.length, 1) > 0.5;
}

const LIVE = /\b(live|remix|instrumental|karaoke|acoustic|reprise|minus one)\b/i;
const CHRISTIAN = /christian|gospel|worship|inspirational/i;
// "Anak Bungsu (Ada Ampun Bapa Bagimu)" is also listed under the title in brackets
const titles = (t: string) => [norm(t), ...[...t.matchAll(/\((.*?)\)/g)].map((m) => m[1]).filter((x) => !LIVE.test(x)).map(norm)];

/** 0..1 edit-distance similarity, for spelling drift like "AnugrahMu" vs "AnugerahMu". */
export function similar(a: string, b: string) {
  if (a === b) return 1;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length, 1);
}

/** "Hanya Kau Tuhan (feat. Agnes Chen)" -> "Agnes Chen" */
const featured = (title: string) => [...title.matchAll(/\((?:feat\.?|ft\.?|with)\s+([^)]*)\)/gi)].map((m) => m[1]).join(" ");

export function pickMatch(song: { title: string; artist: string | null }, results: ItunesTrack[]) {
  const ok = results.filter(
    (r) =>
      titles(r.trackName).some((t) => similar(t, norm(song.title)) >= 0.9) &&
      (song.artist ? artistMatches(song.artist, r.artistName) || artistMatches(song.artist, `${r.artistName} ${featured(r.trackName)}`) : CHRISTIAN.test(r.primaryGenreName ?? "")),
  );
  // exact title first, studio version before live, then the original (oldest) release
  const exact = (r: ItunesTrack) => +!titles(r.trackName).includes(norm(song.title));
  ok.sort((a, b) => exact(a) - exact(b) || +LIVE.test(a.trackName) - +LIVE.test(b.trackName) || (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
  return ok[0];
}

export const bigArtwork = (url?: string) => url?.replace(/\/\d+x\d+bb\./, "/600x600bb.");

/** Deezer search hit in the iTunes shape, so pickMatch can judge it. Deezer has no genre, so songs without an artist never match. */
export type DeezerTrack = { id: number; title: string; artist: { name: string }; album: { title: string; cover_xl?: string } };
export const fromDeezer = (t: DeezerTrack): ItunesTrack & { deezer: DeezerTrack } => ({ trackName: t.title, artistName: t.artist.name, collectionName: t.album.title, deezer: t });
