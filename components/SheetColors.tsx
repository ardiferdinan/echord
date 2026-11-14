"use client";
import { DEFAULT_COLORS, useSheetColors, type SheetColors } from "./ChordSheet";
import { Popover } from "./Popover";

const SWATCHES: Record<keyof SheetColors, string[]> = {
  chord: ["#1ed760", "#ffd60a", "#4cc9f0", "#ff8c42", "#ff70a6", "#ffffff"],
  lyric: ["#ffffff", "#e0e0e0", "#f5e6c8", "#cfe8ff", "#ffe08a", "#b3b3b3"],
};
const LABEL: Record<keyof SheetColors, string> = { chord: "Chord", lyric: "Lirik" };

/** "Aa" button: pick the chord and lyric colors of every chord sheet (saved in this browser). */
export function SheetColorButton({ className = "" }: { className?: string }) {
  const [colors, setColors] = useSheetColors();
  return (
    <Popover
      label="Warna teks"
      buttonClass={`grid h-11 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 data-[open]:bg-white/10 sm:h-10 ${className}`}
      button={<span aria-hidden><span style={{ color: colors.chord }}>A</span><span style={{ color: colors.lyric }}>a</span></span>}
      panelClass="w-64 p-3"
    >
      {() => (
        <div className="space-y-4">
          {(Object.keys(SWATCHES) as (keyof SheetColors)[]).map((k) => (
            <fieldset key={k}>
              <legend className="mb-2 text-sm font-bold">Warna {LABEL[k].toLowerCase()}</legend>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES[k].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`${LABEL[k]} ${c}`}
                    aria-pressed={colors[k] === c}
                    onClick={() => setColors((prev) => ({ ...prev, [k]: c }))}
                    className="size-7 rounded-full ring-offset-2 ring-offset-[#282828] transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-white"
                    style={{ background: c }}
                  />
                ))}
                <label className="relative grid size-7 cursor-pointer place-items-center rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" title="Warna lain">
                  <span className="sr-only">{LABEL[k]}: warna lain</span>
                  <input type="color" value={colors[k]} onChange={(e) => { const v = e.target.value; setColors((prev) => ({ ...prev, [k]: v })); }} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
              </div>
            </fieldset>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm">
              <span className="font-bold" style={{ color: colors.chord }}>G</span> <span style={{ color: colors.lyric }}>Contoh lirik</span>
            </span>
            <button type="button" onClick={() => setColors(DEFAULT_COLORS)} className="text-xs font-bold text-muted hover:text-ink hover:underline">Atur ulang</button>
          </div>
        </div>
      )}
    </Popover>
  );
}
