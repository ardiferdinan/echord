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

export function FontControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-line bg-surface text-[15px] sm:h-10 sm:text-sm">
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(Math.max(12, value - 2))} aria-label="Perkecil teks">A−</button>
      <button className="grid h-full w-11 place-items-center rounded-full hover:bg-surface-2 sm:w-10" onClick={() => onChange(Math.min(40, value + 2))} aria-label="Perbesar teks">A+</button>
    </div>
  );
}
