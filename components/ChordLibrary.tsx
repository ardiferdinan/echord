"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CHORD_ROOTS, COMMON_SUFFIXES, DB_SUFFIXES, chordName, dbGuitar, isSlashSuffix, pianoInversions, suggest, type GuitarVoicing } from "@/lib/voicing";
import { useBandContext } from "@/lib/storage";
import { Blob } from "./Blob";
import { BandContextPicker } from "./ChordSheet";
import { GuitarDiagram, PianoDiagram } from "./Diagrams";

type Instrument = "guitar" | "piano";

const OTHER_SUFFIXES = DB_SUFFIXES.filter((s) => !COMMON_SUFFIXES.includes(s) && !isSlashSuffix(s));
const SLASH_SUFFIXES = DB_SUFFIXES.filter(isSlashSuffix);
const label = (s: string) => (s === "major" ? "Mayor" : s === "minor" ? "Minor" : s.replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯"));

/** "Am7" -> { root: "A", suffix: "m7" }, using chords-db suffix names ("major", "minor", "m/B"…). */
function parse(c: string | null) {
  const root = CHORD_ROOTS.find((r) => c?.startsWith(r) && !CHORD_ROOTS.some((r2) => r2.length > r.length && c.startsWith(r2))) ?? "C";
  const rest = c?.slice(root.length) ?? "";
  const suffix = DB_SUFFIXES.find((s) => chordName(root, s) === root + rest) ?? "major";
  return { root, suffix };
}

export function ChordLibrary() {
  const params = useSearchParams();
  const [instrument, setInstrument] = useState<Instrument>(params.get("i") === "piano" ? "piano" : "guitar");
  const [{ root, suffix }, setChord] = useState(() => parse(params.get("c")));
  const [ctx, setCtx] = useBandContext();
  const chord = chordName(root, suffix);

  // keep the URL shareable without re-rendering the route
  const sync = (i: Instrument, c: string) => history.replaceState(null, "", `/chords?i=${i}&c=${encodeURIComponent(c)}`);
  const pick = (next: Partial<{ root: string; suffix: string }>) => {
    const n = { root, suffix, ...next };
    setChord(n);
    sync(instrument, chordName(n.root, n.suffix));
  };
  const pickInstrument = (i: Instrument) => {
    setInstrument(i);
    setCtx({ ...ctx, instrument: i });
    sync(i, chord);
  };

  const all = dbGuitar(root, suffix);
  const s = suggest(chord, { ...ctx, instrument }, all);
  const inversions = pianoInversions(chord).filter((v) => v.right.length);

  return (
    <div>
      <Blob
        fill="var(--brand)"
        radius={32}
        className="mb-8 min-h-[180px] p-6 pr-36 text-on-brand sm:p-8 sm:pr-48"
        slots={{
          br: {
            node: (
              <div className="grid size-28 place-items-center rounded-3xl bg-dark text-on-dark sm:size-36">
                <span className={`display max-w-full px-2 italic ${chord.length > 4 ? "text-2xl sm:text-3xl" : chord.length > 2 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl"}`}>{chord}</span>
              </div>
            ),
          },
        }}
      >
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">Kamus chord</p>
        <h1 className="display mt-1 text-[clamp(32px,6vw,56px)] uppercase">{instrument === "guitar" ? "Gitar" : "Piano"}</h1>
        <div className="mt-4 inline-flex h-11 rounded-full bg-on-brand/15 p-1 text-sm font-bold">
          {(["guitar", "piano"] as const).map((i) => (
            <button
              key={i}
              onClick={() => pickInstrument(i)}
              aria-pressed={instrument === i}
              className={`rounded-full px-5 transition ${instrument === i ? "bg-bg text-accent shadow-sm" : "hover:bg-on-brand/10"}`}
            >
              {i === "guitar" ? "🎸 Gitar" : "🎹 Piano"}
            </button>
          ))}
        </div>
      </Blob>

      {/* chord picker */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Nada dasar">
          {CHORD_ROOTS.map((r) => (
            <button
              key={r}
              onClick={() => pick({ root: r })}
              aria-pressed={root === r}
              className={`grid h-11 min-w-11 place-items-center rounded-2xl px-3 font-display text-lg font-bold italic transition sm:h-12 sm:min-w-12 ${
                root === r ? "bg-brand text-on-brand" : "bg-surface-2 hover:bg-accent-soft"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <SuffixChips suffixes={COMMON_SUFFIXES} value={suffix} onPick={(x) => pick({ suffix: x })} />
        <details className="group" open={OTHER_SUFFIXES.includes(suffix) || SLASH_SUFFIXES.includes(suffix)}>
          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full px-1 text-sm font-medium text-muted hover:text-ink">
            <span className="transition group-open:rotate-90">›</span> Lebih banyak ({OTHER_SUFFIXES.length + SLASH_SUFFIXES.length} jenis, termasuk slash chord)
          </summary>
          <div className="mt-2 space-y-3">
            <SuffixChips suffixes={OTHER_SUFFIXES} value={suffix} onPick={(x) => pick({ suffix: x })} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Slash / bass</p>
            <SuffixChips suffixes={SLASH_SUFFIXES} value={suffix} onPick={(x) => pick({ suffix: x })} prefix={root} />
          </div>
        </details>
      </div>

      {/* band-aware suggestion */}
      <section className="mb-10 rounded-3xl bg-surface-2 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-black uppercase">Saran untuk bandmu</h2>
          <BandContextPicker ctx={{ ...ctx, instrument }} onChange={setCtx} compact />
        </div>
        <p className="mb-5 rounded-2xl bg-accent-soft px-4 py-3 text-[15px] leading-relaxed">💡 {s.tip}</p>
        {instrument === "guitar" ? (
          <VoicingGrid voicings={s.guitar.slice(0, 6)} highlight />
        ) : (
          s.piano?.right.length ? (
            <div className="max-w-md rounded-3xl bg-bg p-5">
              <PianoDiagram left={s.piano.left} right={s.piano.right} />
              <Hands left={s.piano.left} right={s.piano.right} />
            </div>
          ) : (
            <p className="text-muted">Voicing piano untuk {chord} belum tersedia.</p>
          )
        )}
      </section>

      {/* everything */}
      <section>
        <h2 className="mb-4 font-display text-xl font-black uppercase">
          {instrument === "guitar" ? `Semua posisi ${chord} (${all.length})` : `Inversi ${chord}`}
          {instrument === "guitar" && <span className="ml-2 align-middle text-xs font-medium normal-case text-muted">chords-db + bentuk geser</span>}
        </h2>
        {instrument === "guitar" ? (
          <VoicingGrid voicings={all} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!inversions.length && <li className="text-muted">Voicing piano untuk {chord} belum tersedia.</li>}
            {inversions.map((v) => (
              <li key={v.label} className="rounded-3xl bg-surface-2 p-5">
                <p className="mb-3 font-display font-bold">{v.label}</p>
                <PianoDiagram left={v.left} right={v.right} />
                <Hands left={v.left} right={v.right} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VoicingGrid({ voicings, highlight }: { voicings: GuitarVoicing[]; highlight?: boolean }) {
  if (!voicings.length) return <p className="text-muted">Belum ada diagram untuk chord ini.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {voicings.map((v, i) => (
        <li key={v.frets.join() + v.baseFret + i} className={`flex flex-col items-center rounded-3xl p-4 ${highlight ? "bg-bg" : "bg-surface-2"}`}>
          <GuitarDiagram v={v} size={1.1} notes />
          <p className="mt-1 text-center text-sm font-medium">
            {v.tag ?? (v.baseFret > 1 ? `Fret ${v.baseFret}` : "Posisi terbuka")}
            {v.capo && <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 text-[11px] font-bold uppercase">barre</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Hands({ left, right }: { left: string[]; right: string[] }) {
  return (
    <p className="mt-3 text-sm text-muted">
      <span className="text-hot">■</span> Kiri: <b className="text-ink">{left.join(" ")}</b> · <span className="text-brand">■</span> Kanan:{" "}
      <b className="text-ink">{right.join(" ")}</b>
    </p>
  );
}

function SuffixChips({ suffixes, value, onPick, prefix = "" }: { suffixes: string[]; value: string; onPick: (s: string) => void; prefix?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Jenis chord">
      {suffixes.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          aria-pressed={value === s}
          className={`h-10 rounded-full border px-4 text-sm font-medium transition ${value === s ? "border-hot bg-hot text-on-hot" : "border-line hover:bg-surface-2"}`}
        >
          {prefix ? chordName(prefix, s) : label(s)}
        </button>
      ))}
    </div>
  );
}
