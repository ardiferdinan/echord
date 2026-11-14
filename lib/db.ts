import { neon } from "@neondatabase/serverless";
import { genreFor, type Genre } from "./genres";

export type Song = {
  id: number;
  slug: string;
  title: string;
  artist: string | null;
  category: string;
  original_key: string | null;
  bpm: number | null;
  content: string;
  status?: string;
  submitted_by?: string | null;
  source_url?: string | null;
  album?: string | null;
  release_year?: number | null;
  artwork_url?: string | null;
  preview_url?: string | null;
  apple_url?: string | null;
  deezer_id?: number | null;
  listen_url?: string; // filled at render time (Deezer), not stored
  version_of?: number | null; // set on an alternative source's chords (status 'version')
  version_count?: number; // search results: how many other sources this song has
  has_preview?: boolean; // list queries: a stored iTunes preview or a Deezer track to fetch one from
};

const db = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set (lihat .env.example)");
  return neon(process.env.DATABASE_URL);
};

// ponytail: ILIKE scan, switch to pg_trgm index when the catalog reaches thousands of songs
export async function searchSongs(q: string, limit = 30): Promise<Song[]> {
  const t = q.trim();
  if (!t) return (await db()`select *, (preview_url is not null or deezer_id is not null) as has_preview, (select count(*) from songs v where v.version_of = songs.id)::int as version_count from songs where status = 'published' order by created_at desc limit ${limit}`) as Song[];
  const like = `%${t}%`;
  return (await db()`
    select *, (preview_url is not null or deezer_id is not null) as has_preview, (select count(*) from songs v where v.version_of = songs.id)::int as version_count
    from songs where status = 'published' and (title ilike ${like} or artist ilike ${like})
    order by title limit ${limit}`) as Song[];
}

export type SongCard = Pick<Song, "id" | "slug" | "title" | "artist" | "original_key" | "artwork_url" | "album" | "has_preview">;

/** Browse page: optional search, first letter or artist, alphabetical, paginated. */
export async function listSongs({ q = "", letter = "", artist = "", page = 1, per = 48 }): Promise<{ songs: SongCard[]; total: number }> {
  const t = q.trim(), like = `%${t}%`;
  const rows = (await db()`
    select id, slug, title, artist, original_key, artwork_url, album, (preview_url is not null or deezer_id is not null) as has_preview, count(*) over()::int as total
    from songs
    where status = 'published'
      and (${!t} or title ilike ${like} or artist ilike ${like})
      and (${!letter} or title ilike ${letter + "%"})
      and (${!artist} or artist = ${artist})
    order by
      -- search: best match first (exact title, starts with, contains), songs with a cover before those without
      case when ${!t} then 0 when lower(title) = lower(${t}) then 0 when title ilike ${t + "%"} then 1 when title ilike ${like} then 2 else 3 end,
      case when ${!!t} and artwork_url is null then 1 else 0 end,
      lower(title)
    limit ${per} offset ${(Math.max(1, page) - 1) * per}`) as (SongCard & { total: number })[];
  return { songs: rows, total: rows[0]?.total ?? 0 };
}

/** Shelf of covers: random songs that have artwork (a different mix on every visit). */
export async function randomSongs(limit = 12): Promise<SongCard[]> {
  return (await db()`
    select id, slug, title, artist, original_key, artwork_url, album, (preview_url is not null or deezer_id is not null) as has_preview
    from songs where status = 'published' and artwork_url is not null order by random() limit ${limit}`) as SongCard[];
}

export type ArtistCard = { artist: string; songs: number; artwork_url: string | null };

/** Artists with the most songs, each with one of their covers. */
export async function topArtists(limit = 12): Promise<ArtistCard[]> {
  return (await db()`
    select artist, count(*)::int as songs, (array_agg(artwork_url order by id) filter (where artwork_url is not null))[1] as artwork_url
    from songs where status = 'published' and artist is not null and artist <> '' and artist <> 'Various Artists'
    group by artist order by count(*) desc limit ${limit}`) as ArtistCard[];
}

/** Search: artists whose name matches, most songs first. */
export async function searchArtists(q: string, limit = 12): Promise<ArtistCard[]> {
  const like = `%${q.trim()}%`;
  return (await db()`
    select artist, count(*)::int as songs, (array_agg(artwork_url order by id) filter (where artwork_url is not null))[1] as artwork_url
    from songs where status = 'published' and artist ilike ${like} and artist <> 'Various Artists'
    group by artist order by (lower(artist) = lower(${q.trim()})) desc, count(*) desc limit ${limit}`) as ArtistCard[];
}

/** One genre's songs (covers first, then A–Z), paginated. */
export async function genreSongs(g: Genre, page = 1, per = 50): Promise<{ songs: SongCard[]; total: number }> {
  const rows = (await db()`
    select id, slug, title, artist, original_key, artwork_url, album, (preview_url is not null or deezer_id is not null) as has_preview, count(*) over()::int as total
    from songs where status = 'published' and genre = ${g.slug}
    order by artwork_url is null, lower(title) limit ${per} offset ${(Math.max(1, page) - 1) * per}`) as (SongCard & { total: number })[];
  return { songs: rows, total: rows[0]?.total ?? 0 };
}

/** Song count and one cover per genre, for the browse tiles. */
export async function genreStats(): Promise<Record<string, { songs: number; artwork_url: string | null }>> {
  const rows = (await db()`
    select genre, count(*)::int as songs, (array_agg(artwork_url order by hashtext(title)) filter (where artwork_url is not null))[1] as artwork_url
    from songs where status = 'published' and genre is not null group by genre`) as { genre: string; songs: number; artwork_url: string | null }[];
  return Object.fromEntries(rows.map((r) => [r.genre, r]));
}

/** A playable preview URL: the stored iTunes one, or a fresh Deezer one (their links expire). */
export async function getPreview(id: number): Promise<{ url: string; listen_url?: string } | undefined> {
  const [s] = (await db()`select preview_url, deezer_id from songs where id = ${id}`) as Pick<Song, "preview_url" | "deezer_id">[];
  if (s?.preview_url) return { url: s.preview_url };
  if (!s?.deezer_id) return undefined;
  const d = await deezerPreview(s.deezer_id);
  return d.preview_url ? { url: d.preview_url, listen_url: d.listen_url } : undefined;
}

/** Deezer preview links expire, so ask for a fresh one each time (nothing if Deezer is slow). */
export async function deezerPreview(id: number): Promise<{ preview_url?: string; listen_url?: string }> {
  try {
    const res = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(2500) });
    const t = (await res.json()) as { preview?: string; link?: string };
    return t.preview ? { preview_url: t.preview, listen_url: t.link } : {};
  } catch {
    return {};
  }
}

export type SongKey = { id: number; title: string; artist: string | null; source_url: string | null; version_of: number | null };
export async function songKeys(): Promise<SongKey[]> {
  return (await db()`select id, title, artist, source_url, version_of from songs`) as SongKey[];
}

export type Version = Pick<Song, "id" | "source_url" | "content" | "original_key" | "bpm">;
/** Other sources' chords for a song (its own come first on the page). */
export async function songVersions(id: number): Promise<Version[]> {
  return (await db()`select id, source_url, content, original_key, bpm from songs where version_of = ${id} and status = 'version' order by id`) as Version[];
}

/**
 * Make another source the one a song shows: swap the chords (content, key, bpm, source) between the song
 * and its version, so the song keeps its page, cover, preview and genre.
 */
export async function swapVersion(songId: number, versionId: number) {
  const sql = db();
  const rows = (await sql`select id, source_url, content, original_key, bpm from songs where (id = ${songId} and version_of is null) or (id = ${versionId} and version_of = ${songId})`) as Version[];
  const a = rows.find((r) => r.id === songId), b = rows.find((r) => r.id === versionId);
  if (!a || !b) throw new Error("Versi tidak ditemukan");
  // source_url is unique: clear it on the version first, then swap in one transaction
  await sql.transaction([
    sql`update songs set source_url = null where id = ${b.id}`,
    sql`update songs set content = ${b.content}, original_key = ${b.original_key}, bpm = ${b.bpm}, source_url = ${b.source_url} where id = ${a.id}`,
    sql`update songs set content = ${a.content}, original_key = ${a.original_key}, bpm = ${a.bpm}, source_url = ${a.source_url} where id = ${b.id}`,
  ]);
}

export async function importedUrls(): Promise<Set<string>> {
  return new Set(((await db()`select source_url from songs where source_url is not null`) as { source_url: string }[]).map((r) => r.source_url));
}

export async function getSong(slug: string): Promise<Song | undefined> {
  return ((await db()`select * from songs where slug = ${slug} and status = 'published'`) as Song[])[0];
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type NewSong = Omit<Song, "id" | "slug" | "category"> & { category?: string };

export async function insertSong(s: NewSong) {
  const base = slugify(`${s.title} ${s.artist ?? ""}`) || "lagu";
  const rows = (await db()`
    insert into songs (slug, title, artist, category, original_key, bpm, content, status, submitted_by, source_url, genre, version_of)
    values (
      ${base} || coalesce((select '-' || (count(*) + 1) from songs where slug = ${base} or slug like ${base + "-%"} having count(*) > 0), ''),
      ${s.title}, ${s.artist}, ${s.category ?? "rohani"}, ${s.original_key}, ${s.bpm}, ${s.content},
      ${s.status ?? "published"}, ${s.submitted_by ?? null}, ${s.source_url ?? null}, ${genreFor(s)}, ${s.version_of ?? null})
    returning slug`) as { slug: string }[];
  return rows[0].slug;
}

// ---------- shared setlists ----------
export async function getShared(id: string): Promise<unknown | undefined> {
  return ((await db()`select data from shared_setlists where id = ${id}`) as { data: unknown }[])[0]?.data;
}

/** Insert, or update when id + token match. Returns false on token mismatch. */
export async function saveShared(id: string, token: string, data: unknown) {
  const rows = await db()`
    insert into shared_setlists (id, token, data) values (${id}, ${token}, ${JSON.stringify(data)}::jsonb)
    on conflict (id) do update set data = excluded.data, updated_at = now()
      where shared_setlists.token = excluded.token
    returning id`;
  return rows.length > 0;
}
