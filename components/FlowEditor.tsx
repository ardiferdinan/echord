"use client";
import { Fragment, useId, useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { diatonic, flowCollapsed, flowId, fromChordRow, lineSlots, parseSections, serialize, toChordRow, transposeChord, transposeKey, transposeSections, typeOfLabel, uniqueChords, type Line, type Section } from "@/lib/chordpro";
import type { SetlistItem } from "@/lib/storage";
import { SectionLabel, useSheetColors } from "./ChordSheet";
import { ChevronIcon, CopyIcon, DotsIcon, PencilIcon } from "./icons";
import { Popover, menuItem } from "./Popover";

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
export function FlowEditor({ item, onChange, collapsible = true }: {
  item: Pick<SetlistItem, "content" | "order" | "transpose" | "originalKey">;
  onChange: (p: Partial<Pick<SetlistItem, "content" | "order">>) => void;
  collapsible?: boolean; // song form: the flow IS the song, nothing to collapse
}) {
  const sections = useMemo(() => parseSections(item.content), [item.content]);
  const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : undefined;
  const shown = useMemo(() => transposeSections(sections, item.transpose, key), [sections, item.transpose, key]);
  const byId = new Map(shown.map((s, i) => [s.id, i]));
  const groups = groupsOf(item.order).filter((g) => byId.has(g.id));
  const keys = groups.map((g) => `${g.start}:${g.id}`);
  const [colors] = useSheetColors();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const orderOf = (gs: Group[]) => gs.flatMap((g) => Array(g.count).fill(g.id + (g.collapsed ? "*" : "")));
  const setOrder = (gs: Group[]) => onChange({ order: orderOf(gs) });
  const move = (i: number, by: number) => setOrder(arrayMove(groups, i, i + by));
  /** An independent copy right below (its own chords & lyrics), to move elsewhere or change: e.g. a second Pre-Chorus. */
  const duplicate = (i: number) => {
    const src = sections[byId.get(groups[i].id)!];
    const id = "s" + sections.length;
    const copy = { id, count: 1, start: -1, collapsed: false };
    onChange({ content: serialize([...sections, { ...src, id }]), order: orderOf([...groups.slice(0, i + 1), copy, ...groups.slice(i + 1)]) });
  };
  // chord picker: the song's chords plus the chords of the key
  const options = useMemo(() => [...new Set([...uniqueChords(shown), ...(key ? diatonic(key) : [])])], [shown, key]);
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
                  collapsible={collapsible}
                  onToggle={() => setGroup(i, { collapsed: !g.collapsed })}
                  onCount={(n) => setGroup(i, { count: n })}
                  onSave={(next) => saveSection(si, next)}
                  onMove={(by) => move(i, by)}
                  canUp={i > 0}
                  canDown={i < groups.length - 1}
                  onDuplicate={() => duplicate(i)}
                  options={options}
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
            if (id) onChange({ order: [...item.order, collapsible && item.order.some((x) => flowId(x) === id) ? id + "*" : id] });
          }}
          className="h-9 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted"
          aria-label="Tambah bagian ke alur"
        >
          <option value="">{collapsible ? "+ Ulangi bagian…" : "+ Salin bagian…"}</option>
          {shown.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button type="button" onClick={addPart} className="h-9 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted hover:text-ink">+ Bagian baru</button>
      </div>
    </div>
  );
}

function Part({ sortId, s, group, collapsible, onToggle, onCount, onSave, onMove, canUp, canDown, onDuplicate, options }: {
  sortId: string; s: Section; group: Group; collapsible: boolean; onToggle: () => void; onCount: (n: number) => void; onSave: (s: Section) => void;
  onMove: (by: number) => void; canUp: boolean; canDown: boolean; onDuplicate: () => void; options: string[];
}) {
  const expanded = !group.collapsed;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const [editing, setEditing] = useState<number | null>(null);
  // a new line being typed, to go in at this index; blank lines are not stored, so it is only saved once it has content
  const [adding, setAdding] = useState<number | null>(null);
  const blank = (l: Line) => !l.text.trim() && !l.chords.length;
  const insert = (at: number, l: Line) => setLines([...s.lines.slice(0, at), l, ...s.lines.slice(at)]);
  const draft = (at: number) => (
    <LineEditor
      key={"new" + at}
      line={{ text: "", chords: [] }}
      onSave={(nl) => { if (!blank(nl)) insert(at, nl); setAdding(null); }}
      onAddBelow={(nl) => { if (!blank(nl)) { insert(at, nl); setAdding(at + 1); } }}
      onDelete={() => setAdding(null)}
      onCancel={() => setAdding(null)}
    />
  );
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
        {collapsible && <button
          type="button"
          onClick={onToggle}
          aria-pressed={group.collapsed}
          className={`rounded px-1.5 font-mono text-sm font-bold transition ${group.collapsed ? "text-ink hover:bg-white/10" : "text-muted/60 hover:bg-white/10 hover:text-ink"}`}
          title={group.collapsed ? "Diciutkan: di stage & PDF hanya penanda + [...]. Klik untuk tampilkan isinya." : "Ciutkan jadi [...] (mis. bagian yang sudah dinyanyikan sebelumnya)"}
          aria-label={group.collapsed ? `Tampilkan isi ${s.label}` : `Ciutkan ${s.label} jadi [...]`}
        >
          [...]
        </button>}
        <span className="ml-auto flex items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-open]]:opacity-100 [@media(hover:none)]:opacity-100">
          <button type="button" className={tool} onClick={() => onMove(-1)} disabled={!canUp} aria-label={`Pindahkan ${s.label} ke atas`} title="Pindah ke atas"><ChevronIcon className="size-4 rotate-90" /></button>
          <button type="button" className={tool} onClick={() => onMove(1)} disabled={!canDown} aria-label={`Pindahkan ${s.label} ke bawah`} title="Pindah ke bawah"><ChevronIcon className="size-4 -rotate-90" /></button>
          <button type="button" className={tool} onClick={onDuplicate} aria-label={`Duplikat ${s.label}`} title="Duplikat jadi bagian baru di bawahnya (bisa dipindah & diedit terpisah)"><CopyIcon className="size-4" /></button>
          <Popover label={`Opsi ${s.label}`} buttonClass={tool} button={<DotsIcon className="size-4" />} panelClass="w-60">
            {(close) => (
              <ul role="menu">
                <li><button type="button" role="menuitem" className={menuItem} onClick={() => { onCount(group.count + 1); close(); }}>Ulangi sekali lagi ({group.count + 1}X)</button></li>
                {group.count > 1 && <li><button type="button" role="menuitem" className={menuItem} onClick={() => { onCount(group.count - 1); close(); }}>Kurangi ulangan</button></li>}
                <li><button type="button" role="menuitem" className={menuItem} onClick={() => { setNaming(true); close(); }}>Ganti nama</button></li>
                <li><button type="button" role="menuitem" className={menuItem} onClick={() => { onDuplicate(); close(); }}>Duplikat di bawahnya</button></li>
                <li role="separator" className="my-1 border-t border-white/10" />
                <li><button type="button" role="menuitem" className={`${menuItem} !text-hot`} onClick={() => { onCount(0); close(); }}>Hapus dari alur</button></li>
              </ul>
            )}
          </Popover>
        </span>
      </div>

      {expanded && (
        <div className="mt-1 space-y-1 text-[16px] leading-tight">
          {adding === 0 && draft(0)}
          {s.lines.map((l, k) => (
            <Fragment key={k}>
            {editing === k ? (
              <LineEditor
                key={k}
                line={l}
                onSave={(nl) => { setLines(s.lines.map((x, j) => (j === k ? nl : x))); setEditing(null); }}
                onAddBelow={(nl) => { setLines(s.lines.map((x, j) => (j === k ? nl : x))); setEditing(null); setAdding(k + 1); }}
                onDelete={() => { setLines(s.lines.filter((_, j) => j !== k)); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <SyllableLine
                key={k}
                line={l}
                options={options}
                onChord={(at, name) => setLines(s.lines.map((x, j) => (j === k ? withChord(x, at, name) : x)))}
                onEdit={() => (setAdding(null), setEditing(k))}
              />
            )}
            {adding === k + 1 && draft(k + 1)}
            </Fragment>
          ))}
          {adding === null && editing === null && (
            <button type="button" onClick={() => setAdding(s.lines.length)} className="px-1 text-sm text-muted opacity-0 transition hover:text-ink focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">+ Tambah baris</button>
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
    <div className="my-1 rounded-md bg-black/40 p-1 font-mono text-[15px] ring-2 ring-white/70">
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

/** Put a chord on a character position (or remove the one there when name is empty). */
function withChord(l: Line, at: number, name: string): Line {
  const chords = l.chords.filter((c) => c.at !== at);
  if (name.trim()) chords.push({ at, name: name.trim() });
  return { ...l, chords: chords.sort((a, b) => a.at - b.at) };
}

/**
 * A lyric line split into syllables: tap a syllable to put a chord on it (type it, or pick one of the
 * song's / key's chords), tap a chord to change or remove it. The pencil edits the line's text.
 */
function SyllableLine({ line, options, onChord, onEdit }: { line: Line; options: string[]; onChord: (at: number, name: string) => void; onEdit: () => void }) {
  const [pick, setPick] = useState<{ at: number; value: string } | null>(null);
  const list = useId();
  const { items, after } = lineSlots(line);
  const chordAt = (at: number) => line.chords.find((c) => c.at === at)?.name;
  const end = Math.max(line.text.length + 1, ...line.chords.map((c) => c.at + 1));
  const commit = (name: string) => {
    if (pick && name !== (chordAt(pick.at) ?? "")) onChord(pick.at, name);
    setPick(null);
  };

  const chordCell = (at: number) =>
    pick?.at === at ? (
      <input
        autoFocus
        list={list}
        value={pick.value}
        onChange={(e) => setPick({ at, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(pick.value); }
          if (e.key === "Escape") setPick(null);
        }}
        onBlur={() => commit(pick.value)}
        className="chord-input h-[1.4em] w-16 rounded border border-white/70 bg-black/60 px-1 text-[0.9em] font-bold text-[var(--sheet-chord,var(--accent))] outline-none"
        aria-label="Chord"
      />
    ) : (
      <span className="h-[1.4em] pr-[0.35em] font-bold text-[var(--sheet-chord,var(--accent))]">{chordAt(at)}</span>
    );
  const syl = (at: number, label: React.ReactNode) => (
    <button key={at} type="button" onClick={() => setPick({ at, value: chordAt(at) ?? "" })} className={`rounded-sm transition hover:bg-white/15 ${pick?.at === at ? "bg-white/15" : ""}`} title="Klik untuk menaruh chord di suku kata ini">
      {label}
    </button>
  );
  // a word only breaks where a chord sits (or is being typed), so lyrics read normally between chords
  const cuts = new Set([...line.chords.map((c) => c.at), ...(pick ? [pick.at] : [])]);
  const segs = (w: { at: number; s: string }[]) =>
    w.reduce<{ at: number; s: string }[][]>((out, x, i) => (i === 0 || cuts.has(x.at) ? [...out, [x]] : (out[out.length - 1].push(x), out)), []);

  return (
    <div className="group/line rounded px-1 hover:bg-white/[.04]">
      <div className="flex flex-wrap items-end">
        {items.map((it) =>
          "word" in it ? (
            <span key={it.word[0].at} className="mr-[0.3em] inline-flex items-end">
              {segs(it.word).map((g) => (
                <span key={g[0].at} className="inline-flex flex-col">
                  {chordCell(g[0].at)}
                  <span>{g.map((x) => syl(x.at, x.s))}</span>
                </span>
              ))}
            </span>
          ) : (
            // a chord over a space between words
            <span key={"sp" + it.space} className="mr-[0.3em] inline-flex flex-col">
              {chordCell(it.space)}
              <span>{syl(it.space, "\u00a0")}</span>
            </span>
          ),
        )}
        {[...after, ...(after.includes(end) ? [] : [end])].map((at) => (
          <span key={"x" + at} className="inline-flex flex-col">
            {chordCell(at)}
            <span>{syl(at, at === end && !chordAt(at) ? <span className="px-0.5 text-muted opacity-0 group-hover/line:opacity-100">+</span> : <span className="text-muted">·</span>)}</span>
          </span>
        ))}
        {!line.text && !line.chords.length && <span className="self-end text-sm text-muted">(baris kosong)</span>}
        <button type="button" onClick={onEdit} className="ml-2 grid size-7 place-items-center self-end rounded-full text-muted opacity-0 transition hover:bg-white/10 hover:text-ink focus:opacity-100 group-hover/line:opacity-100 [@media(hover:none)]:opacity-100" aria-label="Edit teks baris ini" title="Edit lirik baris ini">
          <PencilIcon className="size-4" />
        </button>
      </div>
      {pick && (
        // quick picks; mousedown keeps the chord input focused so the tap lands here, not on blur
        <div className="mt-1 flex flex-wrap items-center gap-1 pb-1 text-sm" onMouseDown={(e) => e.preventDefault()}>
          {options.map((o) => (
            <button key={o} type="button" onClick={() => commit(o)} className="h-7 rounded-full bg-white/10 px-2.5 font-bold text-[var(--sheet-chord,var(--accent))] hover:bg-white/20">{o}</button>
          ))}
          {chordAt(pick.at) && <button type="button" onClick={() => commit("")} className="h-7 rounded-full px-2.5 font-semibold text-hot hover:bg-hot/15">Hapus chord</button>}
        </div>
      )}
      <datalist id={list}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </div>
  );
}
