"use client";
import { useMemo } from "react";
import type { Section } from "@/lib/chordpro";
import { suggest, type BandContext } from "@/lib/voicing";
import { useBandContext } from "@/lib/storage";
import { GuitarDiagram, PianoDiagram } from "./Diagrams";

const MODES: { label: string; ctx: Pick<BandContext, "instrument" | "guitarType"> }[] = [
  { label: "Akustik", ctx: { instrument: "guitar", guitarType: "acoustic" } },
  { label: "Elektrik", ctx: { instrument: "guitar", guitarType: "electric" } },
  { label: "Piano", ctx: { instrument: "piano", guitarType: "acoustic" } },
];

/** Every chord of the song with the suggested shape for the chosen instrument (electric: power chords / top-string triads). */
export function ChordShapes({ sections, className = "" }: { sections: Section[]; className?: string }) {
  const [ctx, setCtx] = useBandContext();
  const chords = useMemo(() => [...new Set(sections.flatMap((s) => s.lines.flatMap((l) => l.chords.map((c) => c.name))))].slice(0, 24), [sections]);
  if (!chords.length) return null;
  const mode = ctx.instrument === "piano" ? "Piano" : ctx.guitarType === "electric" ? "Elektrik" : "Akustik";
  const tip = suggest(chords[0], ctx).tip;
  return (
    <div className={`rounded-lg bg-card p-4 ${className}`}>
      <h2 className="font-bold">Bentuk chord</h2>
      <div className="mt-2 flex rounded-full bg-black/40 p-1 text-xs font-bold" role="group" aria-label="Instrumen">
        {MODES.map((m) => (
          <button key={m.label} type="button" aria-pressed={mode === m.label} onClick={() => setCtx({ ...ctx, ...m.ctx })} className={`h-7 flex-1 rounded-full transition ${mode === m.label ? "bg-ink text-app" : "text-muted hover:text-ink"}`}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{tip}</p>
      <ul tabIndex={0} aria-label="Diagram chord" className="mt-3 grid max-h-[calc(100svh-22rem)] grid-cols-2 gap-x-2 gap-y-3 overflow-y-auto rounded-md">
        {chords.map((c) => {
          const s = suggest(c, ctx);
          const v = s.guitar[0];
          return (
            <li key={c} className="flex flex-col items-center rounded-md p-1">
              <span className="text-sm font-bold text-accent">{c}</span>
              {ctx.instrument === "guitar" ? (
                v ? (
                  <>
                    <GuitarDiagram v={v} size={0.62} />
                    {v.tag && <span className="text-center text-[10px] leading-tight text-muted">{v.tag}</span>}
                  </>
                ) : (
                  <span className="py-6 text-xs text-muted">Belum ada</span>
                )
              ) : s.piano?.right.length ? (
                <PianoDiagram left={s.piano.left} right={s.piano.right} />
              ) : (
                <span className="py-6 text-xs text-muted">Belum ada</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
