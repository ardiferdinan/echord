import { Note } from "tonal";
import { FRETS_ON_CHORD, THUMB, voicingNotes, type GuitarVoicing } from "@/lib/voicing";

/** Chord box in the chords-db / react-chords convention: 4 frets, finger numbers, barre vs capo, notes below. */
export function GuitarDiagram({ v, size = 1, notes = false }: { v: GuitarVoicing; size?: number; notes?: boolean }) {
  const frets = FRETS_ON_CHORD;
  const sy = 22, x0 = 20, y0 = 26, W = 116, sx = (W - 2 * x0) / 5;
  const names = notes ? voicingNotes(v) : null;
  const H = y0 + frets * sy + (names ? 22 : 8);
  const x = (s: number) => x0 + s * sx;
  const yMid = (f: number) => y0 + (f - 0.5) * sy;
  return (
    <svg viewBox={`-6 0 ${W + 6} ${H}`} width={(W + 6) * size} height={H * size} role="img" aria-label="Diagram chord gitar" className="text-ink">
      {v.baseFret > 1 ? (
        <text x={x0 - 7} y={yMid(1) + 4} fontSize="10" textAnchor="end" fill="currentColor" fontWeight="600">{v.baseFret}fr</text>
      ) : (
        <rect x={x0 - 1} y={y0 - 4} width={W - 2 * x0 + 2} height={4} rx={1} fill="currentColor" />
      )}
      {Array.from({ length: frets + 1 }, (_, i) => (
        <line key={"f" + i} x1={x0} x2={W - x0} y1={y0 + i * sy} y2={y0 + i * sy} stroke="currentColor" strokeOpacity=".35" />
      ))}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={"s" + s} x1={x(s)} x2={x(s)} y1={y0} y2={y0 + frets * sy} stroke="currentColor" strokeOpacity=".55" />
      ))}
      {v.barres.map((b) => {
        const played = v.frets.map((f, s) => (f >= 0 ? s : -1)).filter((s) => s >= 0);
        const onFret = v.frets.map((f, s) => (f === b ? s : -1)).filter((s) => s >= 0);
        // capo: a full bar across every played string; finger barre: only across the strings it holds
        const span = v.capo ? played : onFret;
        if (span.length < 2) return null;
        const from = x(span[0]) - 7, width = x(span.at(-1)!) - x(span[0]) + 14;
        return v.capo ? (
          <rect key={"b" + b} x={from} y={yMid(b) - 6} width={width} height={12} rx={4} fill="currentColor" />
        ) : (
          <rect key={"b" + b} x={from} y={yMid(b) - 7} width={width} height={14} rx={7} fill="var(--brand)" />
        );
      })}
      {v.frets.map((f, s) =>
        f < 0 ? (
          <text key={s} x={x(s)} y={y0 - 9} fontSize="11" textAnchor="middle" fill="currentColor" fillOpacity=".6">×</text>
        ) : f === 0 ? (
          <circle key={s} cx={x(s)} cy={y0 - 12} r={3.5} fill="none" stroke="currentColor" strokeWidth="1.3" />
        ) : (
          <g key={s}>
            <circle cx={x(s)} cy={yMid(f)} r={7} fill={v.capo && v.barres.includes(f) ? "var(--ink)" : "var(--brand)"} />
            {v.fingers?.[s] ? (
              <text x={x(s)} y={yMid(f) + 3.5} fontSize="9.5" textAnchor="middle" fill="var(--bg)" fontWeight="700">{v.fingers[s] === THUMB ? "T" : v.fingers[s]}</text>
            ) : null}
          </g>
        ),
      )}
      {names?.map((n, s) => (
        <text key={"n" + s} x={x(s)} y={y0 + frets * sy + 15} fontSize="9" textAnchor="middle" fill="currentColor" fillOpacity=".65">{n}</text>
      ))}
    </svg>
  );
}

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK_X: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }; // black key sits left of this white index

/** 4-octave keyboard C2..B5; left hand keys tinted differently from right hand. */
export function PianoDiagram({ left, right }: { left: string[]; right: string[] }) {
  const start = 36, octaves = 4, kw = 11, W = octaves * 7 * kw, H = 64;
  const l = new Set(left.map((n) => Note.midi(n)));
  const r = new Set(right.map((n) => Note.midi(n)));
  const fill = (m: number, base: string) => (r.has(m) ? "var(--brand)" : l.has(m) ? "var(--hot)" : base);
  const whites = [], blacks = [];
  for (let o = 0; o < octaves; o++) {
    for (let i = 0; i < 7; i++) {
      const m = start + o * 12 + WHITE[i];
      whites.push(<rect key={m} x={(o * 7 + i) * kw} y={0} width={kw} height={H} fill={fill(m, "var(--surface)")} stroke="var(--line)" />);
    }
    for (const [pc, wi] of Object.entries(BLACK_X)) {
      const m = start + o * 12 + +pc;
      blacks.push(<rect key={m} x={(o * 7 + wi) * kw - 3.5} y={0} width={7} height={H * 0.6} rx={1} fill={fill(m, "var(--ink)")} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W * 1.4 }} role="img" aria-label="Diagram chord piano">
      {whites}
      {blacks}
      <text x={7 * 2 * kw + 2} y={H - 4} fontSize="7" fill="var(--muted)">C4</text>
    </svg>
  );
}
