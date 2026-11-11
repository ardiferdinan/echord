import { neon } from "@neondatabase/serverless";

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
};

const db = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set (lihat .env.example)");
  return neon(process.env.DATABASE_URL);
};

// ponytail: ILIKE scan, switch to pg_trgm index when the catalog reaches thousands of songs
export async function searchSongs(q: string, limit = 30): Promise<Song[]> {
  const t = q.trim();
  if (!t) return (await db()`select * from songs where status = 'published' order by created_at desc limit ${limit}`) as Song[];
  const like = `%${t}%`;
  return (await db()`
    select * from songs where status = 'published' and (title ilike ${like} or artist ilike ${like})
    order by title limit ${limit}`) as Song[];
}

export type SongCard = Pick<Song, "id" | "slug" | "title" | "artist" | "original_key" | "artwork_url" | "album">;

/** Browse page: optional search or first letter, alphabetical, paginated. */
export async function listSongs({ q = "", letter = "", page = 1, per = 48 }): Promise<{ songs: SongCard[]; total: number }> {
  const t = q.trim(), like = `%${t}%`;
  const rows = (await db()`
    select id, slug, title, artist, original_key, artwork_url, album, count(*) over()::int as total
    from songs
    where status = 'published'
      and (${!t} or title ilike ${like} or artist ilike ${like})
      and (${!letter} or title ilike ${letter + "%"})
    order by lower(title)
    limit ${per} offset ${(Math.max(1, page) - 1) * per}`) as (SongCard & { total: number })[];
  return { songs: rows, total: rows[0]?.total ?? 0 };
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
    insert into songs (slug, title, artist, category, original_key, bpm, content, status, submitted_by, source_url)
    values (
      ${base} || coalesce((select '-' || (count(*) + 1) from songs where slug = ${base} or slug like ${base + "-%"} having count(*) > 0), ''),
      ${s.title}, ${s.artist}, ${s.category ?? "rohani"}, ${s.original_key}, ${s.bpm}, ${s.content},
      ${s.status ?? "published"}, ${s.submitted_by ?? null}, ${s.source_url ?? null})
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
