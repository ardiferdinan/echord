// Mini ChordPro: {start_of_<type>: Label} ... {end_of_<type>}, chords inline as [G].
// Line model: text + chords placed at character positions.

export type ChordAt = { at: number; name: string };
export type Line = { text: string; chords: ChordAt[] };
export type SectionType = "verse" | "chorus" | "prechorus" | "bridge" | "part";
/** collapsed: shown as the part tag + [...] only (a setlist flow entry marked "s3*"). */
export type Section = {
  id: string; label: string; type: SectionType; lines: Line[]; collapsed?: boolean;
  heading?: string; // medley: a song title row between songs ("Kumenang · Kunci D"), no lines
  key?: string; // medley: the key of the song this part belongs to (for chord numbers)
};

// a setlist flow is a list of section ids; a trailing * marks that occurrence collapsed
export const flowId = (entry: string) => entry.replace(/\*$/, "");
export const flowCollapsed = (entry: string) => entry.endsWith("*");

// ---------- chord names & transpose ----------
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const PC: Record<string, number> = {};
SHARP.forEach((n, i) => (PC[n] = i));
FLAT.forEach((n, i) => (PC[n] = i));
Object.assign(PC, { Cb: 11, Fb: 4, "E#": 5, "B#": 0 });

export const CHORD_RE =
  /^([A-G][#b]?)((?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-|\d|b|#|\(|\))*)(?:\/([A-G][#b]?))?$/;
export const isChord = (s: string) => CHORD_RE.test(s);

const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

function shiftNote(n: string, semis: number, flats: boolean) {
  const pc = PC[n];
  if (pc === undefined) return n;
  return (flats ? FLAT : SHARP)[(((pc + semis) % 12) + 12) % 12];
}

export function transposeKey(key: string, semis: number) {
  const m = key.match(/^([A-G][#b]?)(m?)$/);
  if (!m) return key;
  // keys spelled the way musicians write them: Bb not A#, F# not Gb
  const pc = (((PC[m[1]] + semis) % 12) + 12) % 12;
  const root = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][pc];
  return root + m[2];
}

export function transposeChord(chord: string, semis: number, targetKey?: string) {
  if (!semis) return chord;
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const flats = targetKey ? FLAT_KEYS.has(targetKey) : m[1].includes("b");
  const root = shiftNote(m[1], semis, flats);
  return root + m[2] + (m[3] ? "/" + shiftNote(m[3], semis, flats) : "");
}

// ---------- section labels ----------
const HEADER_RE =
  /^\s*[\[(]?\s*(intro|verse|bait|ayat|stanza|reff?|refrain|chorus|pre[- ]?chorus|pre[- ]?reff?|bridge|jembatan|int\.?|interlude|instrumental|musik|coda|outro|ending|tag)\s*(\d*)\s*[\])]?\s*(?:[:.\-]\s*|\s+|$)(.*)$/i;

// a whole line in square brackets is a section name, whatever it says
const BRACKET_TAG = /^\s*\[\s*([^\][]{1,40}?)\s*\]\s*$/;

export function typeOfLabel(label: string): SectionType {
  const l = label.toLowerCase();
  if (/pre[- ]?(chorus|reff?)/.test(l)) return "prechorus";
  if (/reff?|refrain|chorus/.test(l)) return "chorus";
  if (/bridge|jembatan/.test(l)) return "bridge";
  if (/verse|bait|ayat|stanza/.test(l)) return "verse";
  return "part";
}

function prettyLabel(word: string, num: string) {
  const w = word.toLowerCase().replace(/\.$/, "");
  const name =
    w === "int" ? "Interlude" : w === "ref" ? "Reff" : w.replace(/^pre[- ]?/, "Pre-").replace(/^./, (c) => c.toUpperCase());
  return name.replace(/-(.)/, (_, c) => "-" + c.toUpperCase()) + (num ? " " + num : "");
}

// ---------- parse / serialize ChordPro ----------
function parseLine(raw: string): Line {
  const chords: ChordAt[] = [];
  let text = "";
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw))) {
    text += raw.slice(last, m.index);
    if (m[1].trim()) chords.push({ at: text.length, name: m[1].trim() });
    last = re.lastIndex;
  }
  text += raw.slice(last);
  return { text: text.replace(/\s+$/, ""), chords };
}

export function parseSections(content: string): Section[] {
  const sections: Section[] = [];
  let cur: Section | null = null;
  const open = (label: string, type?: SectionType) => {
    cur = { id: "s" + sections.length, label, type: type ?? typeOfLabel(label), lines: [] };
    sections.push(cur);
  };
  for (const raw of content.replace(/\r/g, "").split("\n")) {
    const dir = raw.trim().match(/^\{\s*([\w-]+)\s*(?::\s*(.*?))?\s*\}$/);
    if (dir) {
      const [, name, val = ""] = dir;
      const so = name.match(/^(?:start_of_|so)(\w+)$/);
      if (so) {
        const t = ({ c: "chorus", v: "verse", b: "bridge" } as Record<string, string>)[so[1]] ?? so[1];
        open(val || t[0].toUpperCase() + t.slice(1), typeOfLabel(val || t));
      } else if (/^(end_of_|eo)/.test(name)) cur = null;
      continue; // other directives (title, key, comment...) are ignored here
    }
    if (!cur) {
      if (!raw.trim()) continue;
      open("Lagu", "part");
    }
    cur!.lines.push(parseLine(raw));
  }
  for (const s of sections) while (s.lines.length && !s.lines.at(-1)!.text && !s.lines.at(-1)!.chords.length) s.lines.pop();
  return sections;
}

export function lineToChordPro(l: Line) {
  let out = "";
  let pos = 0;
  for (const c of [...l.chords].sort((a, b) => a.at - b.at)) {
    const at = Math.max(pos, c.at);
    out += l.text.slice(pos, at).padEnd(at - pos, " ") + `[${c.name}]`;
    pos = at;
  }
  return out + l.text.slice(pos);
}

const DIRECTIVE: Record<SectionType, string> = {
  verse: "verse", chorus: "chorus", bridge: "bridge", prechorus: "verse", part: "part",
};

export function serialize(sections: Section[]) {
  return sections
    .map((s) => {
      const d = DIRECTIVE[s.type];
      return `{start_of_${d}: ${s.label}}\n${s.lines.map(lineToChordPro).join("\n")}\n{end_of_${d}}`;
    })
    .join("\n\n");
}

export function transposeSections(sections: Section[], semis: number, targetKey?: string): Section[] {
  if (!semis) return sections;
  return sections.map((s) => ({
    ...s,
    lines: s.lines.map((l) => ({ ...l, chords: l.chords.map((c) => ({ ...c, name: transposeChord(c.name, semis, targetKey) })) })),
  }));
}

export function detectKey(sections: Section[]) {
  for (const s of sections)
    for (const l of s.lines)
      for (const c of l.chords) {
        const m = c.name.match(CHORD_RE);
        if (m) return m[1] + (/^m(?!aj)/.test(m[2]) ? "m" : "");
      }
  return "";
}

// ---------- number system (Nashville / "chord angka") ----------
const DEGREE = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

/** Chord as a scale degree of the key: in C, G -> 5, Em -> 3m, Am7 -> 6m7, G/B -> 5/7, Bb -> b7. Minor keys count from their own tonic (Am: Am -> 1m, C -> b3). */
export function toNumber(chord: string, key: string) {
  const m = chord.match(CHORD_RE), k = key.match(/^([A-G][#b]?)/);
  if (!m || !k || PC[m[1]] === undefined || PC[k[1]] === undefined) return chord;
  const deg = (n: string) => DEGREE[(PC[n] - PC[k[1]] + 12) % 12];
  return deg(m[1]) + m[2] + (m[3] && PC[m[3]] !== undefined ? "/" + deg(m[3]) : "");
}

export function uniqueChords(sections: Section[]) {
  return [...new Set(sections.flatMap((s) => s.lines.flatMap((l) => l.chords.map((c) => c.name))))];
}

// ---------- import: "chords over words" plain text -> ChordPro ----------
const CHORD_LINE_NOISE = /^(\||\/|-+|x\d+|\d+x|\(|\)|\.+|•|%|:)$/i;

function chordTokens(line: string) {
  const out: ChordAt[] = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line))) {
    const tok = m[0].replace(/^[(|]+|[)|,]+$/g, "");
    if (!tok || CHORD_LINE_NOISE.test(m[0])) continue;
    if (!isChord(tok)) return null;
    out.push({ at: m.index, name: tok });
  }
  return out.length ? out : null;
}

export type Imported = { title?: string; artist?: string; key: string; content: string };

export function importText(raw: string): Imported {
  const lines = raw.replace(/\r/g, "").replace(/\t/g, "    ").split("\n");
  let title: string | undefined, artist: string | undefined;

  // Already ChordPro? keep it.
  if (/\{\s*(start_of_|so[cvb]?\b)|\[[A-G][#b]?[^\]\s]*\]/.test(raw)) {
    const t = raw.match(/\{\s*(?:title|t)\s*:\s*(.*?)\s*\}/)?.[1];
    const a = raw.match(/\{\s*(?:artist|subtitle|st)\s*:\s*(.*?)\s*\}/)?.[1];
    const sections = parseSections(raw);
    return { title: t, artist: a, key: detectKey(sections), content: serialize(sections) };
  }

  // First non-empty line "Title - Artist" (not a chord or header line).
  const first = lines.findIndex((l) => l.trim());
  if (first >= 0) {
    const l = lines[first].trim();
    const parts = l.split(/\s+[-–—|]\s+/);
    if (parts.length === 2 && !chordTokens(l) && !HEADER_RE.test(l)) {
      [title, artist] = parts;
      lines.splice(first, 1);
    }
  }

  const hasHeaders = lines.some((l) => (HEADER_RE.test(l) || BRACKET_TAG.test(l)) && !chordTokens(l));
  const sections: Section[] = [];
  let cur: Section | null = null;
  let verseN = 0;
  const open = (label: string) => {
    cur = { id: "s" + sections.length, label, type: typeOfLabel(label), lines: [] };
    sections.push(cur);
  };
  const push = (l: Line) => {
    if (!cur) open(hasHeaders ? "Intro" : `Verse ${++verseN}`);
    cur!.lines.push(l);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tag = !chordTokens(line) && line.match(BRACKET_TAG);
    if (tag) {
      open(tag[1].replace(/\s+/g, " ")); // "[ Chorus (Overtone) ]", "[ Turnaround ]": label as written
      continue;
    }
    const header = !chordTokens(line) && line.match(HEADER_RE);
    if (header) {
      open(prettyLabel(header[1], header[2]));
      const rest = header[3].trim();
      if (rest) {
        const ch = chordTokens(rest);
        push(ch ? { text: "", chords: ch.map((c, k) => ({ at: k, name: c.name })) } : { text: rest, chords: [] });
      }
      continue;
    }
    if (!line.trim()) {
      if (!hasHeaders && cur && (cur as Section).lines.length) cur = null; // blank line = new stanza
      else if (cur && (cur as Section).lines.length) push({ text: "", chords: [] });
      continue;
    }
    const ch = chordTokens(line);
    if (!ch) {
      push({ text: line.replace(/\s+$/, ""), chords: [] });
      continue;
    }
    const next = lines[i + 1];
    if (next !== undefined && next.trim() && !chordTokens(next) && !(HEADER_RE.test(next) && !chordTokens(next))) {
      // merge chord line with lyric line below it, by column
      const lastAt = ch.at(-1)!.at;
      const text = next.replace(/\s+$/, "");
      push({ text: lastAt > text.length ? text.padEnd(lastAt, " ") : text, chords: ch });
      i++;
    } else {
      push({ text: "", chords: ch.map((c, k) => ({ at: k, name: c.name })) });
    }
  }
  for (const s of sections) while (s.lines.length && !s.lines.at(-1)!.text && !s.lines.at(-1)!.chords.length) s.lines.pop();
  const clean = sections.filter((s) => s.lines.length);
  return { title, artist, key: detectKey(clean), content: serialize(clean) };
}

// Diatonic chords for a key, for chord autocomplete.
export function diatonic(key: string) {
  const m = key.match(/^([A-G][#b]?)(m?)$/);
  if (!m) return [];
  const minor = !!m[2];
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const quals = minor ? ["m", "dim", "", "m", "m", "", ""] : ["", "m", "m", "", "", "m", "dim"];
  const flats = FLAT_KEYS.has(key) || m[1].includes("b");
  return steps.map((s, i) => shiftNote(m[1], s, flats) + quals[i]);
}

// Rough syllable split for click targets (good for Indonesian, OK for English):
// consonants + vowel group, keeping one consonant when two consonants follow ("ber-te-ri-ma").
const SYL = /[^aeiou]*[aeiou]+(?:[^aeiou]*$|[^aeiou](?=[^aeiou]))?/gi;
export function syllables(word: string): { at: number; s: string }[] {
  const out: { at: number; s: string }[] = [];
  let pos = 0;
  for (const m of word.matchAll(SYL)) {
    if (m.index !== pos) break;
    out.push({ at: pos, s: m[0] });
    pos += m[0].length;
  }
  if (pos < word.length) {
    if (out.length) out[out.length - 1].s += word.slice(pos);
    else out.push({ at: 0, s: word });
  }
  return out;
}

// ---------- chords-over-lyrics rows (the visual line editor) ----------
/** A line as two monospace rows: chord names placed over the character they sit on. */
export function toChordRow(l: Line): { chords: string; text: string } {
  let row = "";
  for (const c of [...l.chords].sort((a, b) => a.at - b.at)) {
    const at = Math.max(c.at, row.length ? row.length + 1 : 0); // keep a space between neighbours
    row = row.padEnd(at, " ") + c.name;
  }
  return { chords: row, text: l.text };
}

/** Back from two rows: every chord name in the top row sits on the character below its first letter. */
export function fromChordRow(chords: string, text: string): Line {
  const out: ChordAt[] = [];
  chords.replace(/\S+/g, (name, at: number) => {
    if (isChord(name)) out.push({ at, name });
    return name;
  });
  return { text: text.replace(/\s+$/, ""), chords: out };
}

export type LinePiece = { at: number; s: string };
/**
 * Click targets for a lyric line: each word as syllables, also cut wherever a chord sits mid-syllable
 * (chords typed in the two-row editor can land on any letter); chords over a space get their own slot,
 * chords past the end of the text come back separately.
 */
export function lineSlots(l: Line): { items: ({ word: LinePiece[] } | { space: number })[]; after: number[] } {
  const cuts = l.chords.map((c) => c.at).filter((at) => at < l.text.length);
  const items: ({ word: LinePiece[]; at: number } | { space: number; at: number })[] = [];
  for (const m of l.text.matchAll(/\S+/g)) {
    let pieces = syllables(m[0]).map((x) => ({ at: m.index! + x.at, s: x.s }));
    for (const p of cuts) {
      const i = pieces.findIndex((x) => x.at < p && p < x.at + x.s.length);
      if (i >= 0) pieces = [...pieces.slice(0, i), { at: pieces[i].at, s: pieces[i].s.slice(0, p - pieces[i].at) }, { at: p, s: pieces[i].s.slice(p - pieces[i].at) }, ...pieces.slice(i + 1)];
    }
    items.push({ word: pieces, at: m.index! });
  }
  for (const p of cuts) if (/\s/.test(l.text[p])) items.push({ space: p, at: p });
  items.sort((a, b) => a.at - b.at);
  return { items: items.map((x) => ("word" in x ? { word: x.word } : { space: x.space })), after: l.chords.map((c) => c.at).filter((at) => at >= l.text.length) };
}

// ---------- medley: which parts of a song to play ----------
export type Preset = "full" | "chorus" | "vpc";
export const PRESETS: { id: Preset; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "chorus", label: "Chorus saja" },
  { id: "vpc", label: "Verse → Pre-Chorus → Chorus" },
];
/** Section ids for a preset: everything, the chorus(es), or the first verse + pre-chorus + chorus. */
export function presetOrder(sections: Section[], preset: Preset): string[] {
  const all = sections.map((s) => s.id);
  if (preset === "full") return all;
  if (preset === "chorus") {
    const ch = sections.filter((s) => s.type === "chorus");
    return ch.length ? [ch[0].id] : all;
  }
  const first = (t: SectionType) => sections.find((s) => s.type === t)?.id;
  const ids = [first("verse"), first("prechorus"), first("chorus")].filter((x): x is string => !!x);
  return ids.length ? ids : all;
}
/** Which preset an order is, if any ("custom" otherwise). */
export const presetOf = (sections: Section[], order: string[]): Preset | "custom" =>
  PRESETS.find((p) => presetOrder(sections, p.id).join() === order.join())?.id ?? "custom";
