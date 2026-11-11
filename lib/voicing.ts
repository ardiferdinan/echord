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

export function guitarVoicings(chord: string): GuitarVoicing[] {
  const m = chord.match(CHORD_RE);
  if (!m) return [];
  const list = DB.chords[DB_KEY[m[1]]];
  if (!list) return [];
  const quality = SUFFIX[m[2]] ?? m[2];
  if (m[3]) {
    const slash = (quality === "minor" ? "m/" : "/") + (DB_SLASH[m[3]] ?? m[3]);
    const hit = list.find((c) => c.suffix === slash);
    if (hit) return hit.positions;
  }
  return list.find((c) => c.suffix === quality)?.positions ?? [];
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
/** Every guitar suffix chords-db has (63), e.g. "major", "m7b5", "/E", "m/B". */
export const DB_SUFFIXES = DB.suffixes;
export const COMMON_SUFFIXES = ["major", "minor", "7", "maj7", "m7", "sus2", "sus4", "7sus4", "add9", "6", "m6", "9", "m9", "dim", "dim7", "m7b5", "aug"];
export const isSlashSuffix = (s: string) => s.includes("/");

/** Display name: C + "major" -> "C", "minor" -> "Cm", "m/B" -> "Cm/B". */
export const chordName = (root: string, suffix: string) => root + (suffix === "major" ? "" : suffix === "minor" ? "m" : suffix);

/** All positions chords-db has for exactly this root + suffix (no regex parsing, so "alt", "7sg"… work too). */
export const dbGuitar = (root: string, suffix: string): GuitarVoicing[] =>
  DB.chords[DB_KEY[root]]?.find((c) => c.suffix === suffix)?.positions ?? [];

// kept for callers that pick from the common list
export const CHORD_QUALITIES = COMMON_SUFFIXES.map((s) => ({ s: s === "major" ? "" : s === "minor" ? "m" : s, label: s === "major" ? "Mayor" : s === "minor" ? "Minor" : s.replace("b5", "♭5") }));
