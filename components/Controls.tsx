"use client";
import { transposeKey } from "@/lib/chordpro";

const group = "inline-flex h-10 shrink-0 items-center rounded-full bg-surface-2 text-sm font-bold";
const step = "grid size-10 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink active:scale-95";

export function TransposeControl({ value, onChange, originalKey }: { value: number; onChange: (n: number) => void; originalKey?: string | null }) {
  const key = originalKey ? transposeKey(originalKey, value) : null;
  return (
    <div className={group} role="group" aria-label="Transpose">
      <button className={step} onClick={() => onChange(value - 1)} aria-label="Turun setengah nada">−</button>
      <button className="h-full min-w-16 px-1 tabular-nums" onClick={() => onChange(0)} title="Kembali ke kunci asli" aria-label={`Kunci ${key ?? "asli"}, kembali ke kunci asli`}>
        {key ?? "Kunci"}
        {value ? <span className="ml-1 text-xs font-medium text-muted">{value > 0 ? "+" : ""}{value}</span> : null}
      </button>
      <button className={step} onClick={() => onChange(value + 1)} aria-label="Naik setengah nada">+</button>
    </div>
  );
}

/** Abc <-> 123: chord names or numbers of the key (Nashville). */
export function NumbersControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`${group} p-1`} role="group" aria-label="Tampilan chord">
      {([false, true] as const).map((n) => (
        <button
          key={String(n)}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          title={n ? "Chord angka: 1 = kunci lagu, 5, 3m…" : "Nama chord"}
          className={`h-full rounded-full px-3 transition ${value === n ? "bg-ink text-app" : "text-muted hover:text-ink"}`}
        >
          {n ? "123" : "Abc"}
        </button>
      ))}
    </div>
  );
}

export function FontControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className={group} role="group" aria-label="Ukuran teks">
      <button className={step} onClick={() => onChange(Math.max(12, value - 2))} aria-label="A− perkecil teks">A−</button>
      <button className={step} onClick={() => onChange(Math.min(40, value + 2))} aria-label="A+ perbesar teks">A+</button>
    </div>
  );
}
