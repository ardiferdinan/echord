import guitarDb from "@tombatossals/chords-db/lib/guitar.json";
import { Chord, Note } from "tonal";
import { CHORD_RE } from "./chordpro";

export type GuitarVoicing = { frets: number[]; fingers?: number[]; baseFret: number; barres: number[]; capo?: boolean; midi?: number[]; tag?: string };
export type BandContext = {
  instrument: "guitar" | "piano";
  guitarType: "acoustic" | "electric";
  hasPiano: boolean; // another keys player in the band
  hasGuitar: boolean; // another guitar player in the band
};
export const DEFAULT_CONTEXT: BandContext = { instrument: "guitar", guitarType: "acoustic", hasPiano: false, hasGuitar: false };

type DbChord = { key: string; suffix: string; positions: GuitarVoicing[] };
const DB = guitarDb as unknown as { chords: Record<string, DbChord[]>; suffixes: string[]; main: { fretsOnChord: number } };
/** Frets drawn per diagram, as defined by chords-db (4). */
export const FRETS_ON_CHORD = DB.main.fretsOnChord;

const DB_KEY: Record<string, string> = {
  C: "C", "C#": "Csharp", Db: "Csharp", D: "D", "D#": "Eb", Eb: "Eb", E: "E", F: "F",
  "F#": "Fsharp", Gb: "Fsharp", G: "G", "G#": "Ab", Ab: "Ab", A: "A", "A#": "Bb", Bb: "Bb", B: "B",
};
const SUFFIX: Record<string, string> = {
  "": "major", M: "major", maj: "major", m: "minor", min: "minor", "-": "minor",
  "°": "dim", o: "dim", "+": "aug", "7M": "maj7", M7: "maj7", ø: "m7b5", "m7-5": "m7b5", "2": "sus2", sus: "sus4",
};
const DB_SLASH: Record<string, string> = { "C#": "C#", Db: "C#", "D#": "D#", Eb: "D#", "G#": "G#", Ab: "G#", "A#": "Bb", Gb: "F#" };

const STRING_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4

/** Normalized name tonal understands, e.g. "Gmaj7/B". */
function tonalName(chord: string) {
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const q = SUFFIX[m[2]] === "major" ? "" : m[2] === "-" ? "m" : m[2].replace("°", "dim").replace("ø", "m7b5");
  return m[1] + q + (m[3] ? "/" + m[3] : "");
}

/** MIDI -> note name spelled like the chord (D# in B major, Eb in Eb major). */
const spell = (m: number, notes: string[]) => (notes.some((n) => n.includes("#")) ? Note.fromMidiSharps(m) : Note.fromMidi(m));

export function chordTones(chord: string) {
  const c = Chord.get(tonalName(chord));
  return { notes: c.notes, bass: c.bass || c.tonic || "", chromas: new Set(c.notes.map((n) => Note.chroma(n)!)) };
}

// ---------- movable ("geser") shapes ----------
// Barre shapes named after the open chord they come from. Slide the whole shape up or down and the
// chord changes key with it. shape = fret offsets from the root fret, string 6 -> 1, -1 = muted.
type Movable = { name: string; root: 0 | 1; shape: number[]; fingers: number[] };
const E = (shape: number[], fingers: number[]): Movable => ({ name: "E", root: 0, shape, fingers });
const A = (shape: number[], fingers: number[]): Movable => ({ name: "A", root: 1, shape, fingers });
const MOVABLE: Record<string, Movable[]> = {
  "5": [E([0, 2, 2, -1, -1, -1], [1, 3, 4, 0, 0, 0]), A([-1, 0, 2, 2, -1, -1], [0, 1, 3, 4, 0, 0])],
  major: [E([0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]), A([-1, 0, 2, 2, 2, 0], [0, 1, 3, 3, 3, 1])],
  minor: [E([0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]), A([-1, 0, 2, 2, 1, 0], [0, 1, 3, 4, 2, 1])],
  "7": [E([0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]), A([-1, 0, 2, 0, 2, 0], [0, 1, 3, 1, 4, 1])],
  m7: [E([0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]), A([-1, 0, 2, 0, 1, 0], [0, 1, 3, 1, 2, 1])],
  maj7: [E([0, -1, 1, 1, 0, -1], [1, 0, 3, 4, 2, 0]), A([-1, 0, 2, 1, 2, 0], [0, 1, 3, 2, 4, 1])],
  sus4: [E([0, 2, 2, 2, 0, 0], [1, 2, 3, 4, 1, 1]), A([-1, 0, 2, 2, 3, 0], [0, 1, 2, 3, 4, 1])],
  sus2: [A([-1, 0, 2, 2, 0, 0], [0, 1, 3, 4, 1, 1])],
};

/** Absolute fret per string (-1 muted, 0 open). */
const absFrets = (v: GuitarVoicing) => v.frets.map((f) => (f <= 0 ? f : f + v.baseFret - 1));
const key = (v: GuitarVoicing) => absFrets(v).join();

/** Build a chords-db style voicing (frets relative to baseFret) from absolute frets. */
function fromAbs(abs: number[], fingers: number[], tag?: string): GuitarVoicing {
  const played = abs.filter((f) => f > 0);
  const lo = played.length ? Math.min(...played) : 1;
  const baseFret = Math.max(...abs) <= 4 ? 1 : lo;
  const frets = abs.map((f) => (f <= 0 ? f : f - baseFret + 1));
  const barreAt = frets.filter((f, i) => f > 0 && fingers[i] === 1).length > 1 ? frets[fingers.indexOf(1)] : 0;
  return {
    frets, fingers, baseFret, barres: barreAt ? [barreAt] : [], tag,
    midi: abs.flatMap((f, i) => (f < 0 ? [] : [STRING_MIDI[i] + f])),
  };
}

function movable(root: string, quality: string): GuitarVoicing[] {
  const pc = Note.chroma(root);
  if (pc === undefined) return [];
  return (MOVABLE[quality] ?? []).flatMap((m) => {
    const r = (pc - STRING_MIDI[m.root] + 120) % 12;
    const at = quality === "5" && r === 0 ? [0, 12] : [r || 12]; // open E5 / A5 are worth showing too
    return at.map((r) => {
      const open = r === 0;
      return fromAbs(m.shape.map((o) => (o < 0 ? -1 : o + r)), open ? m.fingers.map((f) => Math.max(0, f - 1)) : m.fingers, open ? "Posisi terbuka" : `Bentuk ${m.name} · geser`);
    });
  });
}

/** chords-db positions plus the movable shapes it lacks; db positions that ARE a movable shape get its label. */
function baseVoicings(root: string, quality: string): GuitarVoicing[] {
  const db = DB.chords[DB_KEY[root]]?.find((c) => c.suffix === quality)?.positions ?? [];
  const mov = movable(root, quality);
  const byKey = new Map(mov.map((v) => [key(v), v.tag]));
  const tagged = db.map((v) => (byKey.has(key(v)) ? { ...v, tag: byKey.get(key(v)) } : v));
  const seen = new Set(tagged.map(key));
  return [...tagged, ...mov.filter((v) => !seen.has(key(v)))];
}

/** Finger value drawn as "T": thumb over the neck for a bass note on string 6 (D/F# T x 0 1 3 2). */
export const THUMB = 5;

/**
 * Fingering for a built shape: thumb for a low string-6 bass, index barre when 3+ neighbouring strings
 * share the lowest fret (A/C# x4222x = 3 1 1 1), otherwise one finger per fret in string order.
 * null when it needs more than four fingers.
 */
function assignFingers(abs: number[], bassString: number): number[] | null {
  const fingers = abs.map(() => 0);
  let fretted = abs.flatMap((f, s) => (f > 0 ? [s] : []));
  if (!fretted.length) return fingers;
  const others = fretted.filter((s) => s !== 0);
  if (bassString === 0 && abs[0] > 0 && others.length >= 3 && abs[0] <= Math.min(...others.map((s) => abs[s])) + 1) {
    fingers[0] = THUMB;
    fretted = others;
  }
  const min = Math.min(...fretted.map((s) => abs[s]));
  const atMin = fretted.filter((s) => abs[s] === min);
  // a barre needs the strings it covers to be fretted at >= that fret (no open string under it)
  const barre = atMin.length >= 3 && abs.slice(atMin[0], atMin.at(-1)! + 1).every((f) => f >= min);
  let last = 0;
  for (const s of [...fretted].sort((a, b) => abs[a] - abs[b] || a - b)) {
    if (barre && abs[s] === min) {
      fingers[s] = 1;
      last = 1;
      continue;
    }
    const f = Math.max(last + 1, 1 + abs[s] - min);
    if (f > 4) return null;
    fingers[s] = last = f;
  }
  return fingers;
}

/**
 * Slash chord from a base shape: put the bass note on string 6, 5 or 4 within reach of the shape and
 * mute everything below it, keeping root + 3rd above. Gives the usual D/F# 2x0232, G/B x20003,
 * C/G 332010, Bb/D xx0331, and the same idea for D7/F#, Am7/G, in any key.
 */
function withBass(v: GuitarVoicing, bass: number, need: number[]): GuitarVoicing | null {
  const abs = absFrets(v);
  const played = abs.filter((f) => f > 0);
  const lo = played.length ? Math.min(...played) : 0, hi = played.length ? Math.max(...played) : 0;
  for (let s = 0; s < 3; s++) {
    for (const f of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
      if ((STRING_MIDI[s] + f) % 12 !== bass) continue;
      if (f > 0 && (f < hi - 3 || f > lo + 3)) continue; // one hand span (4 frets)
      const next = abs.map((x, i) => (i < s ? -1 : i === s ? f : x));
      const above = next.flatMap((x, i) => (i > s && x >= 0 ? [STRING_MIDI[i] + x] : []));
      if (above.length < 2 || above.some((m) => m <= STRING_MIDI[s] + f)) continue;
      if (!need.every((pc) => above.some((m) => m % 12 === pc))) continue;
      const fingers = assignFingers(next, s);
      if (fingers) return fromAbs(next, fingers);
    }
  }
  return null;
}

export function guitarVoicings(chord: string): GuitarVoicing[] {
  const m = chord.match(CHORD_RE);
  if (!m || !DB_KEY[m[1]]) return [];
  const quality = SUFFIX[m[2]] ?? m[2];
  const base = baseVoicings(m[1], quality);
  if (!m[3]) return base;
  const bass = Note.chroma(m[3]);
  if (bass === undefined) return base;
  // chords-db has a few exact slash chords (major/minor triads only); then build the rest
  const exact = DB.chords[DB_KEY[m[1]]].find((c) => c.suffix === (quality === "minor" ? "m/" : "/") + (DB_SLASH[m[3]] ?? m[3]))?.positions ?? [];
  const { notes } = chordTones(m[1] + m[2]);
  const need = notes.slice(0, quality === "5" ? 1 : 2).map((n) => Note.chroma(n)!);
  const built = base.map((v) => withBass(v, bass, need)).filter((v): v is GuitarVoicing => !!v);
  const seen = new Set<string>();
  return [...exact, ...built].filter((v) => !seen.has(key(v)) && !!seen.add(key(v))).sort((a, b) => a.baseFret - b.baseFret);
}

const midiOf = (v: GuitarVoicing, s: number) =>
  v.frets[s] < 0 ? null : STRING_MIDI[s] + (v.frets[s] === 0 ? 0 : v.frets[s] + v.baseFret - 1);

/** Sounding note per string (pitch class, "" for muted), from the fret positions. */
export const voicingNotes = (v: GuitarVoicing) =>
  v.frets.map((_, s) => {
    const m = midiOf(v, s);
    return m === null ? "" : Note.pitchClass(Note.fromMidiSharps(m));
  });

/** Same shape, low strings muted, if the top strings still spell the chord (root/3rd at least). */
function topStrings(v: GuitarVoicing, chord: string, keep: number): GuitarVoicing | null {
  const { notes, chromas } = chordTones(chord);
  if (!notes.length) return null;
  const top = [];
  for (let s = 6 - keep; s < 6; s++) {
    const n = midiOf(v, s);
    if (n !== null) top.push(n % 12);
  }
  const third = Note.chroma(notes[1])!;
  const root = Note.chroma(notes[0])!;
  const has = new Set(top);
  if (top.length < 3 || !has.has(third) || !has.has(root) || top.some((p) => !chromas.has(p))) return null;
  return {
    frets: v.frets.map((f, s) => (s < 6 - keep ? -1 : f)),
    fingers: v.fingers?.map((f, s) => (s < 6 - keep ? 0 : f)),
    baseFret: v.baseFret,
    barres: [],
    tag: `Triad ${keep} senar atas`,
  };
}

export type Suggestion = { tip: string; guitar: GuitarVoicing[]; piano?: { left: string[]; right: string[] } };

/** Piano voicing in note names with octaves: left hand bass, right hand closed voicing near middle C. */
export function pianoVoicing(chord: string, rootOnlyLeft: boolean) {
  const { notes, bass } = chordTones(chord);
  if (!notes.length) return { left: [], right: [] };
  const left = rootOnlyLeft ? [bass + "2", bass + "3"] : [bass + "2", Note.transpose(bass + "2", "5P")];
  // right hand: stack chord tones upward from the one closest above G3
  const start = notes.map((n) => Note.midi(n + "4")! - 12).map((m) => (m < 55 ? m + 12 : m));
  const order = notes.map((n, i) => ({ n, m: start[i] })).sort((a, b) => a.m - b.m);
  const right = order.map(({ m }) => spell(m, notes)).slice(0, 4);
  return { left, right };
}

export function suggest(chord: string, ctx: BandContext, all = guitarVoicings(chord)): Suggestion {

  if (ctx.instrument === "piano") {
    const piano = pianoVoicing(chord, ctx.hasGuitar);
    return {
      tip: ctx.hasGuitar
        ? "Ada gitar di band: tangan kiri cukup root (oktaf), tangan kanan inversi rapat di sekitar middle C. Jangan dobel register gitar."
        : "Main sendiri: tangan kiri root + 5th, tangan kanan triad penuh untuk mengisi.",
      guitar: [],
      piano,
    };
  }

  if (ctx.guitarType === "electric" && (ctx.hasPiano || ctx.hasGuitar)) {
    const high = all.filter((v) => v.baseFret >= 5);
    const triads = [...high, ...all]
      .map((v) => topStrings(v, chord, 3) ?? topStrings(v, chord, 4))
      .filter((v): v is GuitarVoicing => !!v);
    const seen = new Set<string>();
    const uniq = [...triads, ...high].filter((v) => {
      const k = v.frets.join() + v.baseFret;
      return seen.has(k) ? false : (seen.add(k), true);
    });
    return {
      tip: ctx.hasPiano
        ? "Piano sudah pegang bass & low-mid. Main di senar atas / posisi tinggi, gain tipis, atau arpeggio dengan delay & reverb."
        : "Ada gitar lain: bagi register, kamu ambil voicing tinggi supaya tidak tabrakan.",
      guitar: uniq.length ? uniq : all,
    };
  }

  return {
    tip:
      ctx.hasPiano || ctx.hasGuitar
        ? "Sudah ada pengisi lain: strumming lebih ringan atau pakai capo supaya register berbeda."
        : "Main sendiri: open chord / full voicing supaya suara penuh.",
    guitar: all,
  };
}

/** Closed-position piano inversions near middle C: root position, 1st, 2nd (3rd for 4-note chords). */
export function pianoInversions(chord: string) {
  const { notes } = chordTones(chord);
  const root = notes[0];
  return notes.map((_, k) => {
    const rot = [...notes.slice(k), ...notes.slice(0, k)];
    let m = Note.midi(rot[0] + "4")!;
    if (m > 64) m -= 12; // keep the bottom note between F3 and E4
    const right = [m];
    for (const n of rot.slice(1)) {
      let x = Note.midi(n + "3")!;
      while (x <= right[right.length - 1]) x += 12;
      right.push(x);
    }
    // stacked 9ths can span two octaves: drop the whole voicing an octave if it climbs past G5
    if (right[right.length - 1] > 79) right.forEach((_, i) => (right[i] -= 12));
    return {
      label: k === 0 ? "Root position" : `Inversi ${k}`,
      left: [(chordTones(chord).bass || root) + "2"], // slash chords: the bass note, not the root
      right: right.map((x) => spell(x, notes)),
    };
  });
}

// ---------- chord library, straight from chords-db ----------
export const CHORD_ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
/** Every guitar suffix chords-db has (63), e.g. "major", "m7b5", "/E", "m/B", plus "5". */
export const DB_SUFFIXES = [...DB.suffixes, "5"]; // + power chords (not in chords-db, built from movable shapes)
export const COMMON_SUFFIXES = ["major", "minor", "5", "7", "maj7", "m7", "sus2", "sus4", "7sus4", "add9", "6", "m6", "9", "m9", "dim", "dim7", "m7b5", "aug"];
export const isSlashSuffix = (s: string) => s.includes("/");

/** Display name: C + "major" -> "C", "minor" -> "Cm", "m/B" -> "Cm/B". */
export const chordName = (root: string, suffix: string) => root + (suffix === "major" ? "" : suffix === "minor" ? "m" : suffix);

/** Library lookup by chords-db suffix name ("alt", "7sg", "m/B"…): db positions + movable shapes, slash chords built. */
export const dbGuitar = (root: string, suffix: string): GuitarVoicing[] =>
  isSlashSuffix(suffix) ? guitarVoicings(chordName(root, suffix)) : baseVoicings(root, suffix);

// kept for callers that pick from the common list
export const CHORD_QUALITIES = COMMON_SUFFIXES.map((s) => ({ s: s === "major" ? "" : s === "minor" ? "m" : s, label: s === "major" ? "Mayor" : s === "minor" ? "Minor" : s.replace("b5", "♭5") }));
