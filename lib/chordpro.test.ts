import { test } from "node:test";
import assert from "node:assert/strict";
import { syllables, parseSections, serialize, transposeChord, transposeKey, importText, diatonic, lineToChordPro } from "./chordpro";
import { suggest, guitarVoicings, DEFAULT_CONTEXT } from "./voicing";

const SONG = `{start_of_verse: Verse 1}
[G]Amazing [C]grace
{end_of_verse}

{start_of_chorus: Reff}
[D]la [G/B]la
{end_of_chorus}`;

test("parse sections", () => {
  const s = parseSections(SONG);
  assert.equal(s.length, 2);
  assert.deepEqual([s[0].label, s[0].type, s[1].label, s[1].type], ["Verse 1", "verse", "Reff", "chorus"]);
  assert.deepEqual(s[0].lines[0], { text: "Amazing grace", chords: [{ at: 0, name: "G" }, { at: 8, name: "C" }] });
});

test("serialize round-trips", () => {
  assert.deepEqual(parseSections(serialize(parseSections(SONG))), parseSections(SONG));
  assert.equal(lineToChordPro({ text: "", chords: [{ at: 0, name: "G" }, { at: 1, name: "C" }] }), "[G] [C]");
});

test("transpose", () => {
  assert.equal(transposeChord("C", 2), "D");
  assert.equal(transposeChord("G/B", 2), "A/C#");
  assert.equal(transposeChord("Am7", 1, "Bb"), "Bbm7");
  assert.equal(transposeChord("F#m", -1), "Fm");
  assert.equal(transposeKey("G", 3), "Bb");
  assert.equal(transposeKey("Em", 2), "F#m");
  assert.deepEqual(diatonic("G"), ["G", "Am", "Bm", "C", "D", "Em", "F#dim"]);
});

test("import chords over words with headers", () => {
  const r = importText(`Amazing Grace - John Newton

Intro: G C G D

Verse 1
G       C       G
Amazing grace how sweet

Reff
D        G
How sweet the sound
Int.
G   C   D`);
  assert.equal(r.title, "Amazing Grace");
  assert.equal(r.artist, "John Newton");
  assert.equal(r.key, "G");
  const s = parseSections(r.content);
  assert.deepEqual(s.map((x) => x.label), ["Intro", "Verse 1", "Reff", "Interlude"]);
  assert.deepEqual(s[0].lines[0].chords.map((c) => c.name), ["G", "C", "G", "D"]);
  assert.deepEqual(s[1].lines[0], { text: "Amazing grace how sweet", chords: [{ at: 0, name: "G" }, { at: 8, name: "C" }, { at: 16, name: "G" }] });
  assert.equal(s[2].type, "chorus");
});

test("import plain lyrics: stanzas become verses", () => {
  const r = importText("Amazing grace\nhow sweet\n\nI once was lost");
  const s = parseSections(r.content);
  assert.equal(r.title, undefined);
  assert.deepEqual(s.map((x) => x.label), ["Verse 1", "Verse 2"]);
  assert.equal(s[0].lines[0].text, "Amazing grace");
});

test("ChordPro input is kept", () => {
  const r = importText(`{title: X}\n${SONG}`);
  assert.equal(r.title, "X");
  assert.equal(parseSections(r.content).length, 2);
});

test("voicing suggestions", () => {
  assert.ok(guitarVoicings("C").length > 1);
  assert.ok(guitarVoicings("F#m7").length > 0);
  assert.ok(guitarVoicings("G/B").length > 0);
  const solo = suggest("G", DEFAULT_CONTEXT);
  const band = suggest("G", { ...DEFAULT_CONTEXT, guitarType: "electric", hasPiano: true });
  assert.ok(band.guitar.length > 0);
  // full band electric: no voicing should ring the low E string
  assert.ok(band.guitar.every((v) => v.frets[0] === -1 || v.baseFret >= 5), JSON.stringify(band.guitar));
  assert.notEqual(solo.tip, band.tip);
  const piano = suggest("C", { ...DEFAULT_CONTEXT, instrument: "piano", hasGuitar: true });
  assert.deepEqual(piano.piano?.left, ["C2", "C3"]);
  assert.deepEqual(piano.piano?.right, ["G3", "C4", "E4"]);
  const solo7 = suggest("G7", { ...DEFAULT_CONTEXT, instrument: "piano" }).piano!;
  assert.deepEqual(solo7.left, ["G2", "D3"]); // below the right hand, no overlap
});

test("syllables", () => {
  const s = (w: string) => syllables(w).map((x) => x.s).join("-");
  assert.equal(s("berterima"), "ber-te-ri-ma");
  assert.equal(s("Bapa"), "Ba-pa");
  assert.equal(s("Amazing"), "A-ma-zing");
  assert.equal(s("KasihMu,"), "Ka-sih-Mu,");
  assert.equal(s("my"), "my");
  assert.deepEqual(syllables("saya").map((x) => x.at), [0, 2]);
});

test("shared setlist is sanitized", async () => {
  const { sanitize } = await import("./share");
  const evil = {
    id: "x", name: 42, updatedAt: 1, share: { id: "a", token: "secret" }, extra: "drop me",
    items: [{ id: "i", title: "T".repeat(500), transpose: 99, order: ["s0", 5], content: "c", evil: true }],
  } as never;
  const s = sanitize(evil) as Record<string, unknown> & { items: Record<string, unknown>[] };
  assert.equal(s.name, "Setlist");
  assert.equal("share" in s || "extra" in s, false); // token never stored publicly
  assert.equal((s.items[0].title as string).length, 200);
  assert.equal(s.items[0].transpose, 11);
  assert.deepEqual(s.items[0].order, ["s0", ""]);
  assert.equal("evil" in s.items[0], false);
  assert.throws(() => sanitize({ items: "nope" } as never));
});

test("blob outline: every corner is a tangent arc, cuts produce one concave corner each", async () => {
  const { blobPoints, roundedPath } = await import("./blob");
  const pts = blobPoints(300, 200, { br: { w: 100, h: 60 } });
  assert.equal(pts.length, 6); // L-shape
  const d = roundedPath(pts, 28);
  const arcs = [...d.matchAll(/A(\S+) \S+ 0 0 (\d)/g)].map((m) => [Number(m[1]), m[2]]);
  assert.equal(arcs.length, 6);
  assert.equal(arcs.filter(([, s]) => s === "0").length, 1); // exactly one concave fillet (the inner corner)
  assert.ok(arcs.every(([r]) => (r as number) > 0)); // no zero-radius = no sharp tips
  // radius clamps to half the shortest edge instead of overshooting
  assert.ok(roundedPath(blobPoints(300, 200, { br: { w: 20, h: 60 } }), 28).includes("A10 10"));
  // top-center cut (search pill): 8 vertices, 2 concave
  const t = roundedPath(blobPoints(300, 200, { t: { w: 120, h: 50 } }), 28);
  assert.equal([...t.matchAll(/0 0 0 /g)].length, 2);
});

test("chord library: every root × quality has guitar voicings and piano inversions", async () => {
  const { pianoInversions, guitarVoicings, CHORD_ROOTS, CHORD_QUALITIES } = await import("./voicing");
  assert.deepEqual(pianoInversions("C").map((v) => v.right), [["C4", "E4", "G4"], ["E4", "G4", "C5"], ["G3", "C4", "E4"]]);
  assert.equal(pianoInversions("Cmaj7").length, 4);
  assert.deepEqual(pianoInversions("Bmaj7")[0].right, ["B3", "D#4", "F#4", "A#4"]); // sharps, not Eb/Gb/Bb
  assert.deepEqual(pianoInversions("Eb")[0].right, ["Eb4", "G4", "Bb4"]);
  const missing = CHORD_ROOTS.flatMap((r) => CHORD_QUALITIES.map((q) => r + q.s)).filter((c) => !guitarVoicings(c).length || pianoInversions(c).length < 3);
  assert.deepEqual(missing, []);
});

test("piano inversions stay on the drawn keyboard (C2..B5)", async () => {
  const { Note } = await import("tonal");
  const { pianoInversions, CHORD_ROOTS, CHORD_QUALITIES } = await import("./voicing");
  for (const r of CHORD_ROOTS) for (const q of CHORD_QUALITIES)
    for (const v of pianoInversions(r + q.s)) for (const n of [...v.left, ...v.right]) {
      const m = Note.midi(n)!;
      assert.ok(m >= 36 && m <= 83, `${r + q.s} ${v.label}: ${n}`);
    }
});

test("chords-db: computed string notes match the db's own midi for every guitar position", async () => {
  const { Note } = await import("tonal");
  const { CHORD_ROOTS, DB_SUFFIXES, dbGuitar, voicingNotes, chordName, FRETS_ON_CHORD } = await import("./voicing");
  assert.equal(FRETS_ON_CHORD, 4);
  assert.equal(DB_SUFFIXES.length, 63);
  let checked = 0;
  for (const r of CHORD_ROOTS)
    for (const sfx of DB_SUFFIXES)
      for (const v of dbGuitar(r, sfx)) {
        const fromDb = (v.midi ?? []).map((m) => Note.pitchClass(Note.fromMidiSharps(m)));
        assert.deepEqual(voicingNotes(v).filter(Boolean), fromDb, `${chordName(r, sfx)} ${v.frets}`);
        checked++;
      }
  assert.equal(checked, 2069);
  assert.equal(chordName("C", "major"), "C");
  assert.equal(chordName("A", "m/B"), "Am/B");
});
