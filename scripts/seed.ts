// Creates the songs table and inserts public-domain hymns.
// Texts: authors died before 1955 (public domain in Indonesia, life + 70) and marked
// "Text Is Public Domain" on hymnary.org. Chords are simple traditional harmonizations.
// Run: npx tsx --env-file=.env.local scripts/seed.ts
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { slugify } from "../lib/db";

const HYMNS = [
  {
    title: "Amazing Grace", artist: "John Newton (1779)", original_key: "G", bpm: 72,
    content: `{start_of_part: Intro}
[G] [C] [G] [D]
{end_of_part}

{start_of_verse: Verse 1}
A[G]mazing [G7]grace, how [C]sweet the [G]sound
That saved a wretch like [D]me
I [G]once was [G7]lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see
{end_of_verse}

{start_of_verse: Verse 2}
'Twas [G]grace that [G7]taught my [C]heart to [G]fear
And grace my fears re[D]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved
{end_of_verse}

{start_of_verse: Verse 3}
Through [G]many [G7]dangers, [C]toils and [G]snares
I have already [D]come
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far
And [Em]grace will [D]lead me [G]home
{end_of_verse}

{start_of_verse: Verse 4}
When [G]we've been [G7]there ten [C]thousand [G]years
Bright shining as the [D]sun
We've [G]no less [G7]days to [C]sing God's [G]praise
Than [Em]when we'd [D]first be[G]gun
{end_of_verse}`,
  },
  {
    title: "It Is Well With My Soul", artist: "Horatio G. Spafford (1873)", original_key: "C", bpm: 76,
    content: `{start_of_verse: Verse 1}
When [C]peace like a [F]river at[C]tendeth my way
When [Am]sorrows like [D7]sea billows [G]roll
What[C]ever my [F]lot, Thou hast [C]taught me to [Am]say
It is [C]well, it is [G7]well with my [C]soul
{end_of_verse}

{start_of_chorus: Reff}
It is [G]well [G7]with my [C]soul
It is [F]well, it is [C]well with my [G7]soul [C]
{end_of_chorus}

{start_of_verse: Verse 2}
Though [C]Satan should [F]buffet, though [C]trials should come
Let [Am]this blest as[D7]surance con[G]trol
That [C]Christ has re[F]garded my [C]helpless es[Am]tate
And hath [C]shed His own [G7]blood for my [C]soul
{end_of_verse}

{start_of_verse: Verse 3}
My [C]sin, oh, the [F]bliss of this [C]glorious thought
My [Am]sin, not in [D7]part but the [G]whole
Is [C]nailed to the [F]cross, and I [C]bear it no [Am]more
Praise the [C]Lord, praise the [G7]Lord, O my [C]soul
{end_of_verse}`,
  },
  {
    title: "Blessed Assurance", artist: "Fanny J. Crosby (1873)", original_key: "D", bpm: 96,
    content: `{start_of_verse: Verse 1}
[D]Blessed as[G]surance, [D]Jesus is mine
O what a fore[A]taste of glory di[D]vine
Heir of sal[G]vation, [D]purchase of God
Born of His [A]Spirit, washed [A7]in His [D]blood
{end_of_verse}

{start_of_chorus: Reff}
[D]This is my story, [G]this is my [D]song
Praising my [E7]Savior all the day [A]long
[D]This is my story, [G]this is my [D]song
Praising my [A]Savior all [A7]the day [D]long
{end_of_chorus}

{start_of_verse: Verse 2}
[D]Perfect sub[G]mission, [D]perfect delight
Visions of [A]rapture now burst on my [D]sight
Angels de[G]scending [D]bring from above
Echoes of [A]mercy, whis[A7]pers of [D]love
{end_of_verse}

{start_of_verse: Verse 3}
[D]Perfect sub[G]mission, [D]all is at rest
I in my [A]Savior am happy and [D]blest
Watching and [G]waiting, [D]looking above
Filled with His [A]goodness, lost [A7]in His [D]love
{end_of_verse}`,
  },
  {
    title: "Holy, Holy, Holy", artist: "Reginald Heber (1826)", original_key: "D", bpm: 80,
    content: `{start_of_verse: Verse 1}
[D]Holy, holy, [Bm]holy! [G]Lord God Al[D]mighty
[A]Early in the [D]morning our [Em]song shall [A]rise to [D]Thee
[D]Holy, holy, [Bm]holy! [G]Merciful and [D]mighty
[G]God in three [D]Persons, [A]blessed [A7]Trini[D]ty
{end_of_verse}

{start_of_verse: Verse 2}
[D]Holy, holy, [Bm]holy! [G]All the saints a[D]dore Thee
[A]Casting down their [D]golden crowns a[Em]round the [A]glassy [D]sea
[D]Cherubim and [Bm]seraphim [G]falling down be[D]fore Thee
[G]Which wert, and [D]art, and [A]ever[A7]more shalt [D]be
{end_of_verse}

{start_of_verse: Verse 3}
[D]Holy, holy, [Bm]holy! [G]Lord God Al[D]mighty
[A]All Thy works shall [D]praise Thy name in [Em]earth and [A]sky and [D]sea
[D]Holy, holy, [Bm]holy! [G]Merciful and [D]mighty
[G]God in three [D]Persons, [A]blessed [A7]Trini[D]ty
{end_of_verse}`,
  },
  {
    title: "Joy to the World", artist: "Isaac Watts (1719)", original_key: "D", bpm: 100,
    content: `{start_of_verse: Verse 1}
[D]Joy to the [G]world! [A]The Lord is [D]come
Let earth receive her King
Let every heart prepare Him room
And [A]heaven and nature sing
And heaven and nature sing
And [D]heaven, and [G]heaven, [A]and nature [D]sing
{end_of_verse}

{start_of_verse: Verse 2}
[D]Joy to the [G]earth! [A]The Savior [D]reigns
Let men their songs employ
While fields and floods, rocks, hills and plains
Re[A]peat the sounding joy
Repeat the sounding joy
Re[D]peat, re[G]peat [A]the sounding [D]joy
{end_of_verse}`,
  },
];

const sql = neon(process.env.DATABASE_URL!);
// Neon's HTTP driver runs one statement per query
for (const stmt of readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8").split(/;\s*\n/)) {
  if (stmt.replace(/--.*$/gm, "").trim()) await sql.query(stmt);
}
for (const h of HYMNS) {
  await sql`
    insert into songs (slug, title, artist, original_key, bpm, content)
    values (${slugify(h.title)}, ${h.title}, ${h.artist}, ${h.original_key}, ${h.bpm}, ${h.content})
    on conflict (slug) do update set content = excluded.content, artist = excluded.artist`;
  console.log("✓", h.title);
}
