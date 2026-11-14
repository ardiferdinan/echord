"use client";
import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRESETS, flowId, parseSections, presetOf, presetOrder, transposeKey, type Preset } from "@/lib/chordpro";
import type { SetlistItem } from "@/lib/storage";
import { TransposeControl } from "./Controls";
import { FlowEditor } from "./FlowEditor";
import { ConfirmButton } from "./ConfirmButton";
import { Mosaic } from "./shell/Mosaic";
import { ChevronIcon, CloseIcon, TrashIcon } from "./icons";

/** Title, cover and flow summary a medley shows everywhere (stage header, PDF, lists). */
export function medleyMeta(parts: SetlistItem[]): Pick<SetlistItem, "title" | "artwork" | "parts"> {
  return { parts, title: `Medley: ${parts.map((p) => p.title).join(" · ")}`, artwork: parts.find((p) => p.artwork)?.artwork ?? null };
}

/** A medley in the setlist: its songs in order, each with the parts to play and its own key. */
export function MedleyCard({ item, n, onChange, onRemove, onSplit, onMergeNext }: {
  item: SetlistItem; n: number; onChange: (p: Partial<SetlistItem>) => void; onRemove: () => void; onSplit: () => void; onMergeNext?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("edit") === item.id);
  const parts = item.parts ?? [];
  const setParts = (next: SetlistItem[]) => (next.length < 2 ? onSplit() : onChange(medleyMeta(next)));
  const patch = (k: number, p: Partial<SetlistItem>) => setParts(parts.map((x, i) => (i === k ? { ...x, ...p } : x)));
  const move = (k: number, by: number) => {
    const next = [...parts];
    [next[k], next[k + by]] = [next[k + by], next[k]];
    setParts(next);
  };

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={`relative rounded-md transition ${open ? "bg-white/5" : "hover:bg-white/10"} ${isDragging ? "z-10 bg-card-hover ring-2 ring-brand" : ""}`}>
      <div className="flex min-h-16 items-center gap-3 px-2 py-2 sm:px-3">
        <button {...attributes} {...listeners} className="grid h-12 w-8 shrink-0 cursor-grab touch-none place-items-center rounded text-[15px] tabular-nums text-muted hover:text-ink active:cursor-grabbing" aria-label={`Geser medley (urutan ${n})`} title="Geser untuk mengubah urutan">
          {n}
        </button>
        <Mosaic covers={parts.map((p) => p.artwork)} className="size-12" />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="flex items-center gap-2">
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]">Medley</span>
            <span className="truncate font-semibold">{parts.map((p) => p.title).join(" · ")}</span>
          </span>
          <span className="block truncate text-xs text-muted">{parts.map((p) => (keyOf(p) ? `${p.title} (${keyOf(p)})` : p.title)).join(" → ")}</span>
        </button>
        <ConfirmButton className="btn-icon text-muted hover:text-hot" armedClassName="!w-auto !px-3 bg-hot/20 !text-hot text-xs font-bold" label="Hapus medley dari setlist" confirmLabel="Hapus?" onConfirm={onRemove}>
          <TrashIcon className="size-5" />
        </ConfirmButton>
        <button className="btn-icon hidden sm:grid" onClick={() => setOpen(!open)} aria-label={open ? "Tutup" : "Atur medley"}>{open ? "▴" : "▾"}</button>
      </div>

      {open && (
        <div className="px-3 pb-5 pt-2 sm:pl-[104px]">
          <p className="mb-3 text-xs text-muted">Pilih bagian yang dimainkan dan nada dasar tiap lagu. Di stage & PDF medley tampil satu halaman, judul tiap lagu jadi pemisah.</p>
          <ol className="space-y-2">
            {parts.map((p, k) => (
              <MedleyPart
                key={p.id}
                part={p}
                k={k}
                last={k === parts.length - 1}
                onChange={(x) => patch(k, x)}
                onMove={(by) => move(k, by)}
                onRemove={() => setParts(parts.filter((_, i) => i !== k))}
              />
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {onMergeNext && <button className="btn" onClick={onMergeNext}>+ Gabungkan lagu berikutnya ke medley</button>}
            <button className="btn" onClick={onSplit}>Pisahkan jadi lagu terpisah</button>
          </div>
          <textarea value={item.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Catatan medley (mis. transisi ke lagu 2 lewat interlude)…" rows={1} className="input mt-3 h-auto resize-y py-3" />
        </div>
      )}
    </li>
  );
}

const keyOf = (p: SetlistItem) => (p.originalKey ? transposeKey(p.originalKey, p.transpose) : "");

function MedleyPart({ part, k, last, onChange, onMove, onRemove }: {
  part: SetlistItem; k: number; last: boolean; onChange: (p: Partial<SetlistItem>) => void; onMove: (by: number) => void; onRemove: () => void;
}) {
  const sections = useMemo(() => parseSections(part.content), [part.content]);
  const preset = presetOf(sections, part.order);
  const [custom, setCustom] = useState(false);
  const tool = "grid size-8 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink disabled:opacity-30";
  return (
    <li className="rounded-md bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-5 text-right text-sm tabular-nums text-muted">{k + 1}</span>
        <Mosaic covers={[part.artwork]} className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{part.title}</span>
          <span className="block truncate text-xs text-muted">{part.artist}</span>
        </span>
        <TransposeControl value={part.transpose} onChange={(t) => onChange({ transpose: t })} originalKey={part.originalKey} />
        <span className="flex items-center">
          <button type="button" className={tool} onClick={() => onMove(-1)} disabled={k === 0} aria-label={`Pindahkan ${part.title} ke atas`}><ChevronIcon className="size-4 rotate-90" /></button>
          <button type="button" className={tool} onClick={() => onMove(1)} disabled={last} aria-label={`Pindahkan ${part.title} ke bawah`}><ChevronIcon className="size-4 -rotate-90" /></button>
          <button type="button" className={`${tool} hover:!text-hot`} onClick={onRemove} aria-label={`Keluarkan ${part.title} dari medley`} title="Keluarkan dari medley"><CloseIcon className="size-4" /></button>
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7" role="group" aria-label={`Bagian ${part.title} yang dimainkan`}>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" aria-pressed={preset === p.id && !custom} onClick={() => (setCustom(false), onChange({ order: presetOrder(sections, p.id as Preset) }))} className="chip h-8 text-xs">
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={preset === "custom" || custom} onClick={() => setCustom(!custom)} className="chip h-8 text-xs">Atur sendiri</button>
        <span className="ml-1 truncate text-xs text-muted">{part.order.map((id) => sections.find((s) => s.id === flowId(id))?.label).filter(Boolean).join(" → ")}</span>
      </div>
      {custom && (
        <div className="mt-3 pl-7">
          <FlowEditor item={part} onChange={onChange} />
        </div>
      )}
    </li>
  );
}
