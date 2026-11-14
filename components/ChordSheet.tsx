"use client";
import { useEffect, useRef, useState } from "react";
import { toNumber, type Line, type Section, type SectionType } from "@/lib/chordpro";
import { suggest, type BandContext } from "@/lib/voicing";
import { useBandContext, useLocal } from "@/lib/storage";
import { GuitarDiagram, PianoDiagram } from "./Diagrams";
import { ChevronIcon, CloseIcon } from "./icons";

export const SECTION_COLOR: Record<SectionType, string> = {
  verse: "var(--verse)", chorus: "var(--chorus)", bridge: "var(--bridge)", prechorus: "var(--prechorus)", part: "var(--part)",
};

/** Split a line into word-sized units so it wraps naturally, each with the chord sitting on it. */
function units(line: Line) {
  const cuts = new Set<number>([0]);
  line.chords.forEach((c) => cuts.add(Math.min(c.at, line.text.length)));
  line.text.replace(/\S+\s*/g, (m, i: number) => (cuts.add(i), m));
  const pts = [...cuts].sort((a, b) => a - b);
  const out: { chords: string[]; text: string }[] = pts.map((p, i) => ({ chords: [], text: line.text.slice(p, pts[i + 1]) }));
  // chords past the end of text land on the trailing empty unit; several on one spot stack side by side
  for (const c of line.chords) out[pts.indexOf(Math.min(c.at, line.text.length))].chords.push(c.name);
  return out.filter((u) => u.text || u.chords.length);
}

type ChordHandlers = { onEnter: (c: string, el: HTMLElement) => void; onLeave: () => void; onTap: (c: string, el: HTMLElement) => void };

function SheetLine({ line, h, label }: { line: Line; h?: ChordHandlers; label: (c: string) => string }) {
  if (!line.chords.length) return <div className="min-h-[1.5em] whitespace-pre-wrap">{line.text}</div>;
  return (
    <div className="flex flex-wrap items-end">
      {units(line).map((u, i) => (
        <span key={i} className="inline-flex flex-col">
          <span className="h-[1.35em] pr-[0.5em] font-bold text-[var(--sheet-chord)]">
            {u.chords.map((c, k) => (
              <button
                key={k}
                type="button"
                className="-mx-1 mr-0.5 cursor-pointer rounded px-1 underline-offset-4 transition hover:bg-accent-soft hover:underline"
                onMouseEnter={(e) => h?.onEnter(c, e.currentTarget)}
                onMouseLeave={() => h?.onLeave()}
                onClick={(e) => h?.onTap(c, e.currentTarget)}
                title={label(c) !== c ? c : undefined}
              >
                {label(c)}
              </button>
            ))}
          </span>
          {line.text && <span className="whitespace-pre">{u.text || " "}</span>}
        </span>
      ))}
    </div>
  );
}

// Bright, solid tags so each part is recognised at a glance (and remembered by color)
export const TAGS = [
  { key: "verse", name: "Verse", re: /verse|bait|ayat/i, bg: "#4d9fff" },
  { key: "prechorus", name: "Pre-chorus", re: /pre.?(chorus|reff)/i, bg: "#ff9f1c" },
  { key: "chorus", name: "Chorus", re: /chorus|reff|refrain/i, bg: "#1ed760" },
  { key: "bridge", name: "Bridge", re: /bridge|jembatan/i, bg: "#c77dff" },
  { key: "intro", name: "Intro / outro", re: /intro|outro|ending|coda/i, bg: "#2ee6f0" },
  { key: "interlude", name: "Interlude", re: /interlude|instrumen|solo|musik/i, bg: "#ffd23f" },
  { key: "vamp", name: "Vamp / tag", re: /vamp|tag|ad.?lib/i, bg: "#ff5ca8" },
] as const;
export type TagKey = (typeof TAGS)[number]["key"];
// pre-chorus before chorus: "Pre-chorus" contains "chorus"
const MATCH_ORDER: TagKey[] = ["prechorus", "chorus", "bridge", "intro", "interlude", "vamp", "verse"];
const BY_TYPE: Record<SectionType, TagKey | null> = { verse: "verse", chorus: "chorus", bridge: "bridge", prechorus: "prechorus", part: null };

/** chord/lyric: on a dark page; chordLight/lyricLight: on the stage's white page (each picked on its own). */
export type SheetColors = { chord: string; lyric: string; chordLight: string; lyricLight: string; tags: "multi" | "single"; tag: string; tagColors: Partial<Record<TagKey, string>> };
export const DEFAULT_COLORS: SheetColors = { chord: "#1ed760", lyric: "#ffffff", chordLight: "#0e8a3d", lyricLight: "#111111", tags: "multi", tag: "#1ed760", tagColors: {} };
/** Chord, lyric and part-tag colors, chosen once and used on every chord sheet (older saves lack the tag fields). */
export function useSheetColors() {
  const [saved, set] = useLocal<Partial<SheetColors>>("echord:sheet-colors", DEFAULT_COLORS);
  return [{ ...DEFAULT_COLORS, ...saved }, set] as const;
}

export const tagKey = (s: Pick<Section, "label" | "type">): TagKey | null => MATCH_ORDER.find((k) => TAGS.find((t) => t.key === k)!.re.test(s.label)) ?? BY_TYPE[s.type];
export const tagDefault = (k: TagKey) => TAGS.find((t) => t.key === k)!.bg;
export function tagColor(s: Pick<Section, "label" | "type">, c: SheetColors) {
  if (c.tags === "single") return c.tag;
  const k = tagKey(s);
  return k ? (c.tagColors[k] ?? tagDefault(k)) : "#e0e0e0";
}
/** Part marker: a solid tag in the part's color (or the one color picked for all); its text takes the page color (black on dark, white on white). */
export function SectionLabel({ s }: { s: Pick<Section, "label" | "type"> }) {
  const [colors] = useSheetColors();
  const bg = tagColor(s, colors);
  return (
    <span className="section-tag inline-flex items-center rounded-[5px] px-[0.65em] py-[0.35em] text-[13px] font-extrabold uppercase leading-none tracking-[0.08em]" style={{ background: bg, color: "var(--tag-ink, #000)" }}>
      {s.label}
    </span>
  );
}


/** numberKey: show chords as numbers of that key (C -> 1, Em -> 3m); hover still shows the real chord. */
export function ChordSheet({ sections, fontSize = 17, interactive = true, numberKey }: { sections: Section[]; fontSize?: number; interactive?: boolean; numberKey?: string }) {
  const pop = useChordPopover();
  const label = (c: string) => (numberKey ? toNumber(c, numberKey) : c);
  const [colors] = useSheetColors();
  return (
    <div style={{ fontSize, color: colors.lyric, ["--sheet-chord" as string]: colors.chord, ["--sheet-chord-light" as string]: colors.chordLight, ["--sheet-lyric-light" as string]: colors.lyricLight }} className="chord-sheet leading-snug">
      {sections.map((s, i) =>
        s.heading ? (
          // medley: the next song's title and key
          <h3 key={i} className="mb-4 mt-2 flex items-center gap-[0.6em] border-t border-current/20 pt-[0.6em] text-[1.05em] font-black tracking-[-0.01em] first:mt-0 first:border-0 first:pt-0">
            <span className="text-[0.75em] font-bold uppercase tracking-[0.12em] opacity-60">Medley</span>
            {s.heading}
          </h3>
        ) : (
        <section key={i} className={`break-inside-avoid ${s.collapsed ? "mb-5" : "mb-8"}`}>
          <div className="mb-3 flex items-center gap-[0.6em]">
            <SectionLabel s={s} />
            {(s.repeat ?? 1) > 1 && (
              <span className="section-badge grid h-[1.6em] min-w-[1.6em] place-items-center rounded-full bg-[#2b3a8c] px-[0.4em] text-[13px] font-black leading-none text-white" aria-label={`diulang ${s.repeat} kali`}>{s.repeat}X</span>
            )}
            {s.collapsed && <span className="font-mono font-bold opacity-70" title="Sama seperti sebelumnya">[...]</span>}
          </div>
          {!s.collapsed && s.lines.map((l, k) => (
            <SheetLine key={k} line={l} h={interactive ? pop.handlers : undefined} label={numberKey && s.key ? (c) => toNumber(c, s.key!) : label} />
          ))}
        </section>
        ),
      )}
      {pop.node}
    </div>
  );
}

// ---------- popover ----------
function useChordPopover() {
  const [state, setState] = useState<{ chord: string; rect: DOMRect; pinned: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverable = useRef(false);
  useEffect(() => {
    hoverable.current = matchMedia("(hover: hover)").matches;
  }, []);
  useEffect(() => {
    if (!state?.pinned) return;
    const close = (e: Event) => !(e.target as HTMLElement).closest?.("[data-chord-pop]") && setState(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setState(null);
    const t = setTimeout(() => document.addEventListener("click", close));
    document.addEventListener("keydown", esc);
    // the main panel scrolls, not the window: listen in the capture phase to catch any scroller
    const off = () => setState(null);
    document.addEventListener("scroll", off, { capture: true, once: true });
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
      document.removeEventListener("scroll", off, { capture: true });
    };
  }, [state?.pinned]);

  const handlers: ChordHandlers = {
    onEnter: (chord, el) => {
      if (!hoverable.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState((s) => (s?.pinned ? s : { chord, rect: el.getBoundingClientRect(), pinned: false })), 120);
    },
    onLeave: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState((s) => (s?.pinned ? s : null)), 200);
    },
    onTap: (chord, el) => setState({ chord, rect: el.getBoundingClientRect(), pinned: true }),
  };

  const node = state && (
    <ChordPopover
      chord={state.chord}
      rect={state.rect}
      onEnter={() => clearTimeout(timer.current)}
      onLeave={handlers.onLeave}
      onClose={() => setState(null)}
    />
  );
  return { handlers, node };
}

function ChordPopover({ chord, rect, onEnter, onLeave, onClose }: { chord: string; rect: DOMRect; onEnter: () => void; onLeave: () => void; onClose: () => void }) {
  const [ctx, setCtx] = useBandContext();
  const [idx, setIdx] = useState(0);
  const s = suggest(chord, ctx);
  const v = s.guitar[Math.min(idx, s.guitar.length - 1)];
  const W = Math.min(300, window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 8));
  const below = rect.bottom + 330 < window.innerHeight;
  const style = below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 };

  return (
    <div
      data-chord-pop
      role="dialog"
      aria-label={`Chord ${chord}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: "fixed", left, width: W, ...style, fontSize: 14 }}
      className="on-dark z-50 rounded-lg bg-[#282828] p-4 text-ink shadow-2xl shadow-black/60"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl font-bold text-accent">{chord}</span>
        <div className="ml-auto flex h-9 rounded-full bg-black/40 p-1 text-xs font-bold">
          {(["guitar", "piano"] as const).map((i) => (
            <button key={i} onClick={() => setCtx({ ...ctx, instrument: i })} className={`rounded-full px-3 ${ctx.instrument === i ? "bg-ink text-app" : "text-muted hover:text-ink"}`}>
              {i === "guitar" ? "Gitar" : "Piano"}
            </button>
          ))}
        </div>
        <button onClick={onClose} aria-label="Tutup" className="btn-icon -mr-2 size-9 text-muted hover:text-ink sm:size-9"><CloseIcon className="size-4" /></button>
      </div>

      {ctx.instrument === "guitar" ? (
        v ? (
          <div className="flex items-center gap-2">
            <button className="btn-icon bg-black/30" disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Voicing sebelumnya"><ChevronIcon className="size-4" /></button>
            <div className="flex flex-1 flex-col items-center">
              <GuitarDiagram v={v} />
              <span className="text-xs text-muted">{v.tag ?? `Posisi ${Math.min(idx, s.guitar.length - 1) + 1}`} · {Math.min(idx, s.guitar.length - 1) + 1}/{s.guitar.length}</span>
            </div>
            <button className="btn-icon bg-black/30" disabled={idx >= s.guitar.length - 1} onClick={() => setIdx(idx + 1)} aria-label="Voicing berikutnya"><ChevronIcon dir="right" className="size-4" /></button>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Diagram untuk {chord} belum tersedia.</p>
        )
      ) : s.piano?.right.length ? (
        <div className="space-y-1">
          <PianoDiagram left={s.piano.left} right={s.piano.right} />
          <p className="text-xs text-muted">
            <span style={{ color: "var(--hot)" }}>■</span> Kiri: {s.piano.left.join(" ")} · <span className="text-accent">■</span> Kanan: {s.piano.right.join(" ")}
          </p>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Chord {chord} tidak dikenali.</p>
      )}

      <p className="mt-3 rounded-md bg-black/30 px-3 py-2.5 text-[13px] leading-relaxed text-muted">{s.tip}</p>
      <BandContextPicker ctx={ctx} onChange={setCtx} compact />
    </div>
  );
}

/** bandOnly: just who else plays (the instrument is picked elsewhere). */
export function BandContextPicker({ ctx, onChange, compact, bandOnly }: { ctx: BandContext; onChange: (c: BandContext) => void; compact?: boolean; bandOnly?: boolean }) {
  const chip = (on: boolean) => `${compact ? "h-7 px-3 text-xs" : "h-9 px-3.5 text-sm"} rounded-full font-semibold transition ${on ? "bg-ink text-app" : "bg-surface-2 text-ink hover:bg-[#333]"}`;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-2" : ""}`}>
      {!compact && (
        <div className="mr-1 flex h-9 rounded-full bg-surface-2 p-1 text-sm font-semibold">
          {(["guitar", "piano"] as const).map((i) => (
            <button key={i} onClick={() => onChange({ ...ctx, instrument: i })} className={`rounded-full px-3.5 ${ctx.instrument === i ? "bg-ink text-app" : "text-muted hover:text-ink"}`}>
              {i === "guitar" ? "Gitar" : "Piano"}
            </button>
          ))}
        </div>
      )}
      {ctx.instrument === "guitar" && !bandOnly && (
        <button className={chip(ctx.guitarType === "electric")} onClick={() => onChange({ ...ctx, guitarType: ctx.guitarType === "electric" ? "acoustic" : "electric" })}>
          {ctx.guitarType === "electric" ? "Elektrik" : "Akustik"}
        </button>
      )}
      {ctx.instrument === "guitar" ? (
        <button className={chip(ctx.hasPiano)} onClick={() => onChange({ ...ctx, hasPiano: !ctx.hasPiano })}>Ada piano/keys</button>
      ) : null}
      <button className={chip(ctx.hasGuitar)} onClick={() => onChange({ ...ctx, hasGuitar: !ctx.hasGuitar })}>
        {ctx.instrument === "guitar" ? "Ada gitar lain" : "Ada gitar"}
      </button>
    </div>
  );
}
