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

-- shared setlist snapshots; token lets the creator update the same link
create table if not exists shared_setlists (
  id text primary key,
  token text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
