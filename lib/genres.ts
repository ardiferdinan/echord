// Music genres. Neither iTunes (almost all "Christian") nor Deezer (mostly empty) has a usable genre for
// these songs, so like most music apps the genre belongs to the artist: a specific iTunes genre wins,
// then the artist table below, then Pop (contemporary worship is pop). Filled by scripts/genre.mts.
export const GENRES = [
  { slug: "pop", name: "Pop", color: "#dc148c" },
  { slug: "rock", name: "Rock", color: "#e91429" },
  { slug: "rock-alternatif", name: "Rock alternatif", color: "#477d95" },
  { slug: "gospel", name: "Gospel", color: "#8d67ab" },
  { slug: "rnb", name: "R&B", color: "#1e3264" },
  { slug: "jazz", name: "Jazz", color: "#ba5d07" },
  { slug: "pop-jazz", name: "Pop jazz", color: "#d84000" },
  { slug: "country", name: "Country", color: "#27856a" },
  { slug: "blues", name: "Blues", color: "#2d46b9" },
  { slug: "edm", name: "EDM", color: "#7358ff" },
  { slug: "hymne", name: "Hymne", color: "#148a08" },
] as const;

export type Genre = (typeof GENRES)[number];
export type GenreSlug = Genre["slug"];
export const genreBySlug = (slug: string): Genre | undefined => GENRES.find((g) => g.slug === slug);

// lowercase artist -> genre; artists not listed are Pop. null = no genre fits (orchestra, classical crossover).
const ARTISTS: Record<string, GenreSlug | null> = {
  "hillsong united": "rock-alternatif", "leeland": "rock-alternatif", "here be lion": "rock-alternatif",
  "planetshakers": "rock", "passion": "rock", "jesus culture": "rock", "lincoln brewster": "rock", "jeremy camp": "rock",
  "casting crowns": "rock", "ux band (united to excel)": "rock", "united to excel": "rock", "unlimited fire band": "rock",
  "oneway band": "rock", "one way": "rock", "barlow girl": "rock", "we are messengers": "rock", "keith green": "rock",
  "s.o.l.d (servant of the lord)": "rock",
  "hillsong young & free": "edm",
  "israel & new breed": "gospel", "maverick city music": "gospel", "don moen": "gospel", "ron kenoly": "gospel",
  "fred hammond": "gospel", "joseph garlington": "gospel", "lynda randle": "gospel", "gaither vocal band": "gospel",
  "charles billingsley": "gospel", "kim collingsworth": "gospel", "freddy hayler": "gospel", "jehovah shalom acapella": "gospel",
  "besy choir": "gospel", "benny hinn": "gospel", "rodney howard-browne": "gospel", "tommy walker": "gospel", "bj putnam": "gospel",
  "mariah carey": "rnb", "glenn fredly": "rnb", "jordan feliz": "rnb", "sidney mohede": "rnb", "mike mohede": "rnb", "kamasean matthews": "rnb",
  "bing crosby": "jazz", "phil driscoll": "jazz",
  "michael bublé": "pop-jazz", "citra scholastika": "pop-jazz",
  "alan jackson": "country", "cristy lane": "country", "housefires": "country", "the clark family": "country",
  "dewis sl": "hymne", "keswick": "hymne", "fanny j. crosby (1873)": "hymne", "horatio g. spafford (1873)": "hymne", "keith & kristyn getty": "hymne",
  "fountainview academy orchestra & singer": null, "charlotte church": null, "-": null, "various artists": null,
};

// iTunes genres specific enough to trust over the artist table
const ITUNES: [RegExp, GenreSlug][] = [
  [/alternative|indie/i, "rock-alternatif"], [/rock|metal/i, "rock"], [/r&b|soul|hip.?hop/i, "rnb"],
  [/smooth jazz|vocal jazz|pop jazz/i, "pop-jazz"], [/jazz/i, "jazz"], [/blues/i, "blues"], [/country|bluegrass|americana/i, "country"],
  [/dance|electronic|house|edm/i, "edm"], [/^gospel$|(southern|contemporary|traditional) gospel/i, "gospel"], [/^pop|k-pop|adult contemporary/i, "pop"],
];

/** Kidung Jemaat, NKB, PKJ… numbers in the title mean a church hymn, whoever recorded it. */
const HYMN = /\((kj|nkb|pkj|kpri|mb|be)\s*\.?\s*\d+/i;

export function genreFor(s: { title: string; artist: string | null; itunesGenre?: string | null }): GenreSlug | null {
  if (HYMN.test(s.title)) return "hymne";
  const it = s.itunesGenre && ITUNES.find(([re]) => re.test(s.itunesGenre!))?.[1];
  if (it) return it;
  const a = s.artist?.trim().toLowerCase();
  if (!a) return null;
  return a in ARTISTS ? ARTISTS[a] : "pop";
}
