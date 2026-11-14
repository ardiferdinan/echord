"use client";
import { useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flowCollapsed, flowId, fromChordRow, parseSections, serialize, toChordRow, transposeChord, transposeKey, transposeSections, typeOfLabel, type Line, type Section } from "@/lib/chordpro";
import type { SetlistItem } from "@/lib/storage";
import { SectionLabel, useSheetColors } from "./ChordSheet";
import { CloseIcon, MinusIcon, PlusIcon } from "./icons";

type Group = { id: string; count: number; start: number; collapsed: boolean };

/** Runs of the same part in the flow: Interlude, Interlude -> one row "Interlude 2X". collapsed = shown as the tag + [...]. */
function groupsOf(order: string[]): Group[] {
  const out: Group[] = [];
  order.forEach((e, i) => {
    const id = flowId(e), last = out.at(-1);
    if (last && last.id === id && last.collapsed === flowCollapsed(e)) last.count++;
    else out.push({ id, count: 1, start: i, collapsed: flowCollapsed(e) });
  });
  return out;
}

const tool = "grid size-8 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink";

/**
 * Edit a setlist song in place: the flow as a list of part tags (a part already played shows [...],
 * a repeat right after itself shows 2X), lines edited right where they are (chords over lyrics).
 */
export function FlowEditor({ item, onChange }: { item: SetlistItem; onChange: (p: Partial<SetlistItem>) => void }) {
  const sections = useMemo(() => parseSections(item.content), [item.content]);
  const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : undefined;
  const shown = useMemo(() => transposeSections(sections, item.transpose, key), [sections, item.transpose, key]);
  const byId = new Map(shown.map((s, i) => [s.id, i]));
  const groups = groupsOf(item.order).filter((g) => byId.has(g.id));
  const keys = groups.map((g) => `${g.start}:${g.id}`);
  const [colors] = useSheetColors();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const setOrder = (gs: Group[]) => onChange({ order: gs.flatMap((g) => Array(g.count).fill(g.id + (g.collapsed ? "*" : ""))) });
  const setGroup = (i: number, p: Partial<Group>) => setOrder(groups.map((g, k) => (k === i ? { ...g, ...p } : g)).filter((g) => g.count > 0));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder(arrayMove(groups, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))));
  };

  /** Save a changed part; chords typed in the shown key go back to the song's key. */
  const saveSection = (si: number, next: Section) => {
    const back = item.transpose ? { ...next, lines: next.lines.map((l) => ({ ...l, chords: l.chords.map((c) => ({ ...c, name: transposeChord(c.name, -item.transpose, item.originalKey ?? undefined) })) })) } : next;
    onChange({ content: serialize(sections.map((s, i) => (i === si ? back : s))) });
  };
  const addPart = () => {
    const label = prompt("Nama bagian baru (mis. Tag, Interlude 2):")?.trim();
    if (!label) return;
    const id = "s" + sections.length;
    onChange({ content: serialize([...sections, { id, label, type: typeOfLabel(label), lines: [{ text: "", chords: [] }] }]), order: [...item.order, id] });
  };

  return (
    <div style={{ ["--sheet-chord" as string]: colors.chord, color: colors.lyric }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {groups.map((g, i) => {
              const si = byId.get(g.id)!;
              return (
                <Part
                  key={keys[i]}
                  sortId={keys[i]}
                  s={shown[si]}
                  group={g}
                  onToggle={() => setGroup(i, { collapsed: !g.collapsed })}
                  onCount={(n) => setGroup(i, { count: n })}
                  onSave={(next) => saveSection(si, next)}
                />
              );
            })}
          </ol>
        </SortableContext>
      </DndContext>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) onChange({ order: [...item.order, item.order.some((x) => flowId(x) === id) ? id + "*" : id] });
          }}
          className="h-9 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted"
          aria-label="Tambah bagian ke alur"
        >
          <option value="">+ Ulangi bagian…</option>
          {shown.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button type="button" onClick={addPart} className="h-9 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted hover:text-ink">+ Bagian baru</button>
      </div>
    </div>
  );
}

function Part({ sortId, s, group, onToggle, onCount, onSave }: {
  sortId: string; s: Section; group: Group; onToggle: () => void; onCount: (n: number) => void; onSave: (s: Section) => void;
}) {
  const expanded = !group.collapsed;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const [editing, setEditing] = useState<number | null>(null);
  const [naming, setNaming] = useState(false);
  const setLines = (lines: Line[]) => onSave({ ...s, lines });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={`group rounded-md px-2 py-2 ${isDragging ? "z-10 bg-card-hover shadow-lg" : "hover:bg-white/[.03]"}`}>
      <div className="flex min-h-9 items-center gap-2">
        {naming ? (
          <input
            autoFocus
            defaultValue={s.label}
            aria-label="Nama bagian"
            className="input h-8 w-48 rounded-md text-sm sm:h-8"
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.label) onSave({ ...s, label: v, type: typeOfLabel(v) }); setNaming(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setNaming(false); }}
          />
        ) : (
          <button type="button" {...attributes} {...listeners} onDoubleClick={() => setNaming(true)} className="cursor-grab touch-none active:cursor-grabbing" aria-label={`${s.label}: geser untuk mengubah urutan, klik dua kali untuk ganti nama`} title="Geser untuk memindah · klik dua kali untuk ganti nama">
            <SectionLabel s={s} />
          </button>
        )}
        {group.count > 1 && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#2b3a8c] px-1.5 text-xs font-black text-white" aria-label={`diulang ${group.count} kali`}>{group.count}X</span>}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={group.collapsed}
          className={`rounded px-1.5 font-mono text-sm font-bold transition ${group.collapsed ? "text-ink hover:bg-white/10" : "text-muted/60 hover:bg-white/10 hover:text-ink"}`}
          title={group.collapsed ? "Diciutkan: di stage & PDF hanya penanda + [...]. Klik untuk tampilkan isinya." : "Ciutkan jadi [...] (mis. bagian yang sudah dinyanyikan sebelumnya)"}
          aria-label={group.collapsed ? `Tampilkan isi ${s.label}` : `Ciutkan ${s.label} jadi [...]`}
        >
          [...]
        </button>
        <span className="ml-auto flex items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          <button type="button" className={tool} onClick={() => onCount(group.count - 1)} disabled={group.count < 2} aria-label={`Kurangi ulangan ${s.label}`} title="Kurangi ulangan"><MinusIcon className="size-4" /></button>
          <button type="button" className={tool} onClick={() => onCount(group.count + 1)} aria-label={`Ulangi ${s.label} sekali lagi`} title="Ulangi sekali lagi"><PlusIcon className="size-4" /></button>
          <button type="button" className={`${tool} hover:!text-hot`} onClick={() => onCount(0)} aria-label={`Lewati ${s.label}`} title="Hapus dari alur"><CloseIcon className="size-4" /></button>
        </span>
      </div>

      {expanded && (
        <div className="mt-1 font-mono text-[15px] leading-tight">
          {s.lines.map((l, k) =>
            editing === k ? (
              <LineEditor
                key={k}
                line={l}
                onSave={(nl) => { setLines(s.lines.map((x, j) => (j === k ? nl : x))); setEditing(null); }}
                onAddBelow={(nl) => { setLines([...s.lines.slice(0, k), nl, { text: "", chords: [] }, ...s.lines.slice(k + 1)]); setEditing(k + 1); }}
                onDelete={() => { setLines(s.lines.filter((_, j) => j !== k)); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <button key={k} type="button" onClick={() => setEditing(k)} className="block w-full whitespace-pre rounded px-1 py-0.5 text-left hover:bg-white/5 focus-visible:bg-white/5" title="Klik untuk edit baris ini">
                {(() => {
                  const r = toChordRow(l);
                  return (
                    <>
                      {r.chords && <span className="block font-bold text-[var(--sheet-chord,var(--accent))]">{r.chords}</span>}
                      <span className="block">{r.text || (r.chords ? " " : <span className="text-muted">(baris kosong)</span>)}</span>
                    </>
                  );
                })()}
              </button>
            ),
          )}
          {!s.lines.length && (
            <button type="button" onClick={() => setLines([{ text: "", chords: [] }])} className="px-1 text-sm text-muted hover:text-ink">+ Tambah baris</button>
          )}
        </div>
      )}
    </li>
  );
}

/** Two aligned monospace rows, like a chord sheet on paper: chords on top, lyric below. Enter saves, Esc cancels. */
function LineEditor({ line, onSave, onAddBelow, onDelete, onCancel }: { line: Line; onSave: (l: Line) => void; onAddBelow: (l: Line) => void; onDelete: () => void; onCancel: () => void }) {
  const start = toChordRow(line);
  const [chords, setChords] = useState(start.chords);
  const [text, setText] = useState(start.text);
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); (e.shiftKey ? onAddBelow : onSave)(fromChordRow(chords, text)); }
    if (e.key === "Escape") onCancel();
  };
  const field = "block w-full bg-transparent px-1 py-0.5 outline-none";
  return (
    <div className="my-1 rounded-md bg-black/40 p-1 ring-2 ring-white/70">
      <input autoFocus value={chords} onChange={(e) => setChords(e.target.value)} onKeyDown={keys} placeholder="G       C        D" aria-label="Chord (di atas lirik)" spellCheck={false} className={`${field} font-bold text-[var(--sheet-chord,var(--accent))] placeholder:text-white/20`} />
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} placeholder="Lirik" aria-label="Lirik" className={`${field} placeholder:text-white/20`} />
      <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1 pb-0.5 font-sans">
        <button type="button" onClick={() => onSave(fromChordRow(chords, text))} className="btn btn-primary h-8 px-3 text-xs sm:h-8">Simpan</button>
        <button type="button" onClick={() => onAddBelow(fromChordRow(chords, text))} className="btn h-8 px-3 text-xs sm:h-8">+ Baris di bawah</button>
        <button type="button" onClick={onDelete} className="btn h-8 border-hot/50 px-3 text-xs text-hot hover:border-hot sm:h-8">Hapus baris</button>
        <button type="button" onClick={onCancel} className="h-8 px-2 text-xs font-semibold text-muted hover:text-ink">Batal</button>
        <span className="ml-auto hidden text-[11px] text-muted sm:inline">Taruh chord tepat di atas suku katanya · Enter simpan · Shift+Enter baris baru</span>
      </div>
    </div>
  );
}
