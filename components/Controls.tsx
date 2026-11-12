"use client";
import { transposeKey } from "@/lib/chordpro";

export function TransposeControl({ value, onChange, originalKey }: { value: number; onChange: (n: number) => void; originalKey?: string | null }) {
  const key = originalKey ? transposeKey(originalKey, value) : null;
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface text-[15px] sm:h-10 sm:text-sm">
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(value - 1)} aria-label="Turun setengah nada">−</button>
      <button className="h-full min-w-14 px-1 font-display font-bold italic tabular-nums" onClick={() => onChange(0)} title="Reset ke kunci asli">
        {key ?? "Key"} {value ? <span className="text-xs font-normal text-muted">({value > 0 ? "+" : ""}{value})</span> : null}
      </button>
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(value + 1)} aria-label="Naik setengah nada">+</button>
    </div>
  );
}

/** Abc <-> 123: chord names or numbers of the key (Nashville). */
export function NumbersControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface p-1 text-[15px] sm:h-10 sm:text-sm" role="group" aria-label="Tampilan chord">
      {([false, true] as const).map((n) => (
        <button
          key={String(n)}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          title={n ? "Chord angka: 1 = kunci lagu, 5, 3m…" : "Nama chord"}
          className={`h-full rounded-full px-3 font-display font-bold italic transition ${value === n ? "bg-brand text-on-brand" : "hover:bg-surface-2"}`}
        >
          {n ? "123" : "Abc"}
        </button>
      ))}
    </div>
  );
}

export function FontControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface text-[15px] sm:h-10 sm:text-sm">
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(Math.max(12, value - 2))} aria-label="Perkecil teks">A−</button>
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(Math.min(40, value + 2))} aria-label="Perbesar teks">A+</button>
    </div>
  );
}
