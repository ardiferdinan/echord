"use client";
import { useState } from "react";
import { diatonic, parseSections, syllables, serialize, typeOfLabel, uniqueChords, type Section } from "@/lib/chordpro";
import { SECTION_COLOR } from "./ChordSheet";

const LABELS = ["Intro", "Verse 1", "Verse 2", "Verse 3", "Pre-Chorus", "Reff", "Reff 2", "Bridge", "Interlude", "Coda", "Outro"];

/** Visual editor: click a word to put a chord on it. Edits round-trip through ChordPro text. */
export function ClickEditor({ content, songKey, onChange }: { content: string; songKey: string; onChange: (c: string) => void }) {
  const sections = parseSections(content);
  const [edit, setEdit] = useState<{ s: number; l: number; at: number; value: string } | null>(null);
  const options = [...new Set([...uniqueChords(sections), ...diatonic(songKey)])];

  const commit = (next: Section[]) => onChange(serialize(next));
  const setChord = (s: number, l: number, at: number, name: string) => {
    const next = structuredClone(sections);
    const line = next[s].lines[l];
    line.chords = line.chords.filter((c) => c.at !== at);
    if (name.trim()) line.chords.push({ at, name: name.trim() });
    line.chords.sort((a, b) => a.at - b.at);
    commit(next);
    setEdit(null);
  };

  // LRCLIB lyrics often have no blank lines: let the user cut a section at any line
  const split = (si: number, li: number) => {
    const next = structuredClone(sections);
    const label = next.some((s) => s.type === "chorus") ? `Verse ${next.filter((s) => s.type === "verse").length + 1}` : "Reff";
    next.splice(si + 1, 0, { id: "", label, type: typeOfLabel(label), lines: next[si].lines.splice(li) });
    commit(next);
  };

  return (
    <div className="space-y-5 pl-3 text-[15px]">
      <p className="-ml-3 text-xs text-muted">Klik suku kata untuk menaruh chord. Arahkan ke baris lalu klik ¶ untuk memulai section baru (Reff, Verse 2, …).</p>
      <datalist id="chord-options">{options.map((o) => <option key={o} value={o} />)}</datalist>
      <datalist id="label-options">{LABELS.map((o) => <option key={o} value={o} />)}</datalist>
      {sections.map((sec, si) => (
        <div key={si + sec.label}>
          <div className="mb-1 flex items-center gap-2">
            <input
              list="label-options"
              defaultValue={sec.label}
              onBlur={(e) => {
                const label = e.target.value.trim() || sec.label;
                if (label === sec.label) return;
                const next = structuredClone(sections);
                next[si] = { ...next[si], label, type: typeOfLabel(label) };
                commit(next);
              }}
              className="w-36 rounded-md border border-transparent bg-transparent px-1 text-xs font-semibold uppercase tracking-wider hover:border-line focus:border-brand focus:outline-none"
              style={{ color: SECTION_COLOR[sec.type] }}
              aria-label="Nama section"
            />
          </div>
          {sec.lines.map((line, li) => {
            const words = [...line.text.matchAll(/\S+/g)].map((m) => ({
              at: m.index!,
              syl: syllables(m[0]).map((x) => ({ at: m.index! + x.at, s: x.s })),
            }));
            const starts = new Set(words.flatMap((w) => w.syl.map((x) => x.at)));
            const chordAt = (at: number) => line.chords.find((c) => c.at === at)?.name;
            // chords not sitting on a syllable start (chord-only lines, past the end)
            const loose = line.chords.filter((c) => !starts.has(c.at));
            const slot = (at: number, label: React.ReactNode, key: string, chord?: string) => {
              const active = edit && edit.s === si && edit.l === li && edit.at === at;
              return (
                <span key={key} className="inline-flex flex-col">
                  {active ? (
                    <input
                      autoFocus
                      list="chord-options"
                      value={edit.value}
                      onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setChord(si, li, at, edit.value);
                        }
                        if (e.key === "Escape") setEdit(null);
                      }}
                      onBlur={() => setChord(si, li, at, edit.value)}
                      className="h-[1.5em] w-16 rounded border border-brand bg-surface px-1 text-sm font-semibold text-accent outline-none"
                      aria-label="Chord"
                    />
                  ) : (
                    <span className={`h-[1.5em] text-sm font-semibold text-accent ${chord ? "pr-1" : ""}`}>{chord}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEdit({ s: si, l: li, at, value: chord ?? "" })}
                    className="rounded-sm text-left hover:bg-accent-soft"
                  >
                    {label}
                  </button>
                </span>
              );
            };
            return (
              <div key={li} className="group relative flex flex-wrap items-end gap-x-1.5">
                {li > 0 && (
                  <button
                    type="button"
                    onClick={() => split(si, li)}
                    title="Mulai section baru di baris ini"
                    aria-label="Mulai section baru di baris ini"
                    className="absolute -left-4 bottom-0 text-xs text-muted opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100"
                  >
                    ¶
                  </button>
                )}
                {words.map((w) => (
                  <span key={"w" + w.at} className="inline-flex">
                    {w.syl.map((x) => slot(x.at, x.s, "s" + x.at, chordAt(x.at)))}
                  </span>
                ))}
                {loose.map((c, k) => slot(c.at, <span className="text-muted">·</span>, "c" + k, c.name))}
                {slot(Math.max(line.text.length, ...line.chords.map((c) => c.at + 1), 0) + 1, <span className="text-muted opacity-0 group-hover:opacity-100">+</span>, "end")}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
