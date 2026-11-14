"use client";
import { DEFAULT_COLORS, TAGS, useSheetColors, type SheetColors } from "./ChordSheet";
import { Popover } from "./Popover";

type TextKey = "chord" | "lyric" | "chordLight" | "lyricLight";
const SWATCHES: Record<TextKey, string[]> = {
  chord: ["#1ed760", "#ffd60a", "#4cc9f0", "#ff8c42", "#ff70a6", "#ffffff"],
  lyric: ["#ffffff", "#e0e0e0", "#f5e6c8", "#cfe8ff", "#ffe08a", "#b3b3b3"],
  // for the white page: colors that read on white
  chordLight: ["#0e8a3d", "#c2410c", "#1d4ed8", "#b91c1c", "#7e22ce", "#111111"],
  lyricLight: ["#111111", "#333333", "#1e3a5f", "#3b2f2f", "#555555", "#000000"],
};
const TAG_SWATCHES = ["#1ed760", "#4d9fff", "#ffd23f", "#ff5ca8", "#c77dff", "#ffffff"];
const LABEL: Record<TextKey, string> = { chord: "chord", lyric: "lirik", chordLight: "chord", lyricLight: "lirik" };

const dot = "size-7 shrink-0 rounded-full ring-offset-2 ring-offset-[#282828] transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-white";

/** Round "other color" button: the native color picker under a rainbow dot. */
function OtherColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" title="Warna lain">
      <span className="sr-only">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
  );
}

/** "Aa" button: chord, lyric and part-tag colors of every chord sheet (saved in this browser). light = the stage's white page has its own chord & lyric colors. */
export function SheetColorButton({ className = "", light = false }: { className?: string; light?: boolean }) {
  const keys: TextKey[] = light ? ["chordLight", "lyricLight"] : ["chord", "lyric"];
  const [colors, setColors] = useSheetColors();
  const patch = (p: Partial<SheetColors>) => setColors((prev) => ({ ...DEFAULT_COLORS, ...prev, ...p }));
  return (
    <Popover
      label="Warna teks"
      buttonClass={`grid h-11 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 data-[open]:bg-white/10 sm:h-10 ${className}`}
      button={<span aria-hidden><span style={{ color: colors[keys[0]] }}>A</span><span style={{ color: colors[keys[1]] }}>a</span></span>}
      panelClass="w-72 p-3"
    >
      {() => (
        <div className="space-y-4">
          {light && <p className="text-xs text-muted">Warna untuk latar putih. Latar hitam punya pengaturan sendiri.</p>}
          {keys.map((k) => (
            <fieldset key={k}>
              <legend className="mb-2 text-sm font-bold">Warna {LABEL[k]}</legend>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES[k].map((c) => (
                  <button key={c} type="button" aria-label={`${LABEL[k]} ${c}`} aria-pressed={colors[k] === c} onClick={() => patch({ [k]: c })} className={dot} style={{ background: c }} />
                ))}
                <OtherColor label={`Warna ${LABEL[k]} lain`} value={colors[k]} onChange={(v) => patch({ [k]: v })} />
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend className="mb-2 text-sm font-bold">Penanda bagian lagu</legend>
            <div className="mb-3 flex rounded-full bg-black/40 p-1 text-xs font-bold">
              {(["multi", "single"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={colors.tags === m} onClick={() => patch({ tags: m })} className={`h-7 flex-1 rounded-full transition ${colors.tags === m ? "bg-ink text-app" : "text-muted hover:text-ink"}`}>
                  {m === "multi" ? "Warna-warni" : "Satu warna"}
                </button>
              ))}
            </div>
            {colors.tags === "single" ? (
              <div className="flex flex-wrap items-center gap-2">
                {TAG_SWATCHES.map((c) => (
                  <button key={c} type="button" aria-label={`Penanda ${c}`} aria-pressed={colors.tag === c} onClick={() => patch({ tag: c })} className={dot} style={{ background: c }} />
                ))}
                <OtherColor label="Warna penanda lain" value={colors.tag} onChange={(v) => patch({ tag: v })} />
              </div>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-1.5">
                  {TAGS.map((t) => {
                    const bg = colors.tagColors[t.key] ?? t.bg;
                    return (
                      <li key={t.key}>
                        {/* the tag itself is the picker: tap it to choose that part's color */}
                        <label className="relative flex h-8 cursor-pointer items-center justify-center rounded-[5px] px-2 text-[11px] font-extrabold uppercase tracking-[0.06em] transition hover:brightness-110" style={{ background: bg, color: light ? "#fff" : "#000" }} title={`Ubah warna ${t.name}`}>
                          {t.name}
                          <input type="color" value={bg} onChange={(e) => patch({ tagColors: { ...colors.tagColors, [t.key]: e.target.value } })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Warna ${t.name}`} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-muted">Ketuk penanda untuk mengganti warnanya.</p>
                {Object.keys(colors.tagColors).length > 0 && (
                  <button type="button" onClick={() => patch({ tagColors: {} })} className="mt-1 text-xs font-bold text-muted hover:text-ink hover:underline">
                    Kembalikan warna penanda bawaan
                  </button>
                )}
              </>
            )}
          </fieldset>

          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className={`rounded px-2 py-1 text-sm ${light ? "bg-white" : ""}`}>
              <span className="font-bold" style={{ color: colors[keys[0]] }}>G</span> <span style={{ color: colors[keys[1]] }}>Contoh lirik</span>
            </span>
            <button type="button" onClick={() => setColors(DEFAULT_COLORS)} className="text-xs font-bold text-muted hover:text-ink hover:underline">Atur ulang semua</button>
          </div>
        </div>
      )}
    </Popover>
  );
}

