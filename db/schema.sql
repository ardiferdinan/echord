create table if not exists songs (
  id serial primary key,
  slug text unique not null,
  title text not null,
  artist text,
  category text not null default 'rohani',
  original_key text,
  bpm int,
  content text not null, -- ChordPro: {start_of_verse: Verse 1} ... [G]lyrics
  created_at timestamptz not null default now()
);

-- public submissions wait for review, only 'published' songs are listed
alter table songs add column if not exists status text not null default 'published';
alter table songs add column if not exists submitted_by text;
-- page a song was imported from (scripts/import.mts); unique so re-runs skip it
alter table songs add column if not exists source_url text unique;
-- metadata from iTunes Search / Deezer (scripts/enrich.mts); enriched_at set even when nothing matched
alter table songs add column if not exists album text;
alter table songs add column if not exists release_year int;
alter table songs add column if not exists artwork_url text;
alter table songs add column if not exists preview_url text;
alter table songs add column if not exists apple_url text;
alter table songs add column if not exists enriched_at timestamptz;
-- fallback when iTunes has no match: Deezer track (embed player; its preview links expire)
alter table songs add column if not exists deezer_id bigint;

-- music genre (lib/genres.ts, filled by scripts/genre.mts; new songs get one on insert)
alter table songs add column if not exists genre text;
create index if not exists songs_genre on songs (genre);

-- shared setlist snapshots; token lets the creator update the same link
create table if not exists shared_setlists (
  id text primary key,
  token text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
