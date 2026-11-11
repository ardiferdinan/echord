"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { parseSections, transposeKey, transposeSections, type Section } from "@/lib/chordpro";
import type { Song } from "@/lib/db";
import { newItem, useHydrated, useSetlists, type Setlist, type SetlistItem } from "@/lib/storage";
import { shareSetlist } from "@/app/(main)/setlists/actions";
import { ChordSheet, SECTION_COLOR } from "./ChordSheet";
import { TransposeControl } from "./Controls";
import { Blob } from "./Blob";

export function arranged(item: SetlistItem): Section[] {
  const secs = parseSections(item.content);
  const byId = new Map(secs.map((s) => [s.id, s]));
  const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : undefined;
  return transposeSections(item.order.map((id) => byId.get(id)).filter((s): s is Section => !!s), item.transpose, key);
}

function useDnd() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function SetlistEditor({ id }: { id: string }) {
  const [setlists, setSetlists] = useSetlists();
  const mounted = useHydrated();
  const sensors = useDnd();
  const setlist = setlists.find((s) => s.id === id);
  if (!mounted) return null;
  if (!setlist)
    return (
      <p className="text-muted">
        Setlist tidak ditemukan di browser ini. <Link href="/setlists" className="text-accent underline">Lihat semua setlist</Link>
      </p>
    );

  const update = (fn: (s: Setlist) => Setlist) => setSetlists((all) => all.map((s) => (s.id === id ? { ...fn(s), updatedAt: Date.now() } : s)));
  const updateItem = (itemId: string, patch: Partial<SetlistItem>) =>
    update((s) => ({ ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    update((s) => {
      const from = s.items.findIndex((i) => i.id === active.id);
      const to = s.items.findIndex((i) => i.id === over.id);
      return { ...s, items: arrayMove(s.items, from, to) };
    });
  };

  return (
    <div>
      <Blob
        fill="var(--brand)"
        radius={32}
        className="z-20 mb-8 min-h-[200px] p-6 pr-32 text-on-brand sm:min-h-[220px] sm:p-8 sm:pr-44"
        slots={{
          br: {
            node: (
              <Link
                href={`/setlists/${id}/play`}
                aria-disabled={!setlist.items.length}
                className={`grid size-24 place-items-center rounded-3xl bg-dark text-on-dark sm:size-32 ${setlist.items.length ? "transition hover:brightness-110" : "pointer-events-none"}`}
              >
                <span className={`text-center ${setlist.items.length ? "" : "opacity-40"}`}>
                  <span className="display block text-4xl sm:text-5xl">▶</span>
                  <span className="font-display text-sm font-bold italic">Stage mode</span>
                </span>
              </Link>
            ),
          },
        }}
      >
        <span className="dots pointer-events-none absolute right-44 top-6 hidden h-24 w-40 opacity-50 sm:block" aria-hidden />
        <Link href="/setlists" className="relative text-sm font-medium opacity-80 hover:opacity-100">← Semua setlist</Link>
        <textarea
          value={setlist.name}
          rows={1}
          onChange={(e) => update((s) => ({ ...s, name: e.target.value.replace(/\n/g, " ") }))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
          aria-label="Nama setlist"
          className="display relative mt-2 block w-full resize-none rounded-2xl bg-transparent text-[clamp(32px,6vw,56px)] uppercase outline-none [field-sizing:content] placeholder:text-on-brand/60 hover:bg-white/10 focus:bg-white/10 sm:text-6xl"
        />
        <div className="relative mt-3 flex flex-wrap items-center gap-3 font-medium">
          <input
            type="date"
            value={setlist.date ?? ""}
            onChange={(e) => update((s) => ({ ...s, date: e.target.value }))}
            className="h-10 rounded-full bg-on-brand/15 px-3 text-sm [color-scheme:dark] hover:bg-on-brand/25"
            aria-label="Tanggal"
          />
          <span className="text-sm">{setlist.items.length} lagu</span>
          <ShareButton
            setlist={setlist}
            onShared={(share) => setSetlists((all) => all.map((s) => (s.id === id ? { ...s, share, sharedAt: s.updatedAt } : s)))}
          />
        </div>
      </Blob>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={setlist.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-5">
            {setlist.items.map((item, n) => (
              <SongCard
                key={item.id}
                n={n + 1}
                item={item}
                onChange={(p) => updateItem(item.id, p)}
                onRemove={() => update((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <AddSong onAdd={(song) => update((s) => ({ ...s, items: [...s.items, newItem(song)] }))} />
    </div>
  );
}

function SongCard({ item, n, onChange, onRemove }: { item: SetlistItem; n: number; onChange: (p: Partial<SetlistItem>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const sections = useMemo(() => parseSections(item.content), [item.content]);
  const byId = new Map(sections.map((s) => [s.id, s]));

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative rounded-3xl ${isDragging ? "z-10 ring-2 ring-brand" : ""}`}
    >
      <Blob
        fill="var(--surface-2)"
        radius={24}
        gap={8}
        slots={{
          tl: {
            node: (
              <button
                {...attributes}
                {...listeners}
                className={`grid size-16 cursor-grab touch-none place-items-center rounded-[22px] text-on-brand active:cursor-grabbing ${n % 3 === 2 ? "bg-hot" : "bg-brand"}`}
                aria-label={`Geser ${item.title} (urutan ${n})`}
                title="Geser untuk mengubah urutan"
              >
                <span className="text-center leading-none">
                  <span className="display block text-2xl italic">{String(n).padStart(2, "0")}</span>
                  <span className="text-[10px] opacity-80">⠿</span>
                </span>
              </button>
            ),
          },
        }}
      >
      <div className="flex min-h-[88px] items-center gap-2 py-3 pl-[84px] pr-3 sm:pr-4">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="block truncate font-display text-base font-black uppercase sm:text-lg">{item.title}</span>
          <span className="block truncate text-xs text-muted">
            {item.order.map((id) => byId.get(id)?.label).filter(Boolean).join(" → ") || "Belum ada section"}
          </span>
        </button>
        <TransposeControl value={item.transpose} onChange={(t) => onChange({ transpose: t })} originalKey={item.originalKey} />
        <button className="btn-icon hidden border border-line sm:grid" onClick={() => setOpen(!open)} aria-label={open ? "Tutup" : "Atur"}>{open ? "▴" : "▾"}</button>
      </div>

      {open && (
        <div className="border-t border-line p-4 pt-5">
          <SectionArranger sections={sections} order={item.order} onChange={(order) => onChange({ order })} />

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => setEditing(!editing)}>{editing ? "Selesai edit" : "✎ Edit chord & lirik"}</button>
            <button className="btn" onClick={() => onChange({ order: sections.map((s) => s.id) })}>Reset urutan</button>
            <Link href={`/songs/${item.slug}`} className="btn">Lagu asli</Link>
            <button className="btn ml-auto text-hot" onClick={() => confirm(`Hapus "${item.title}" dari setlist?`) && onRemove()}>Hapus</button>
          </div>

          <textarea
            value={item.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Catatan (mis. drum masuk di Reff 2, ending ritardando)…"
            rows={1}
            className="input h-auto py-3 mt-3 resize-y"
          />

          <div className={`mt-4 grid gap-4 ${editing ? "lg:grid-cols-2" : ""}`}>
            {editing && (
              <textarea
                defaultValue={item.content}
                onChange={(e) => {
                  const content = e.target.value;
                  const ids = parseSections(content).map((s) => s.id);
                  const same = ids.length === sections.length;
                  onChange({ content, order: same ? item.order : ids });
                }}
                spellCheck={false}
                className="input h-auto py-3 min-h-96 font-mono text-base leading-relaxed sm:text-[13px]"
                aria-label="ChordPro"
              />
            )}
            <div className="rounded-lg bg-bg p-4">
              <ChordSheet sections={arranged(item)} fontSize={15} />
            </div>
          </div>
        </div>
      )}
      </Blob>
    </li>
  );
}

function SectionArranger({ sections, order, onChange }: { sections: Section[]; order: string[]; onChange: (o: string[]) => void }) {
  const sensors = useDnd();
  const byId = new Map(sections.map((s) => [s.id, s]));
  const keys = order.map((id, i) => `${i}:${id}`);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(order, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))));
  };

  return (
    <div>
      <p className="mb-2 text-xs text-muted">Geser untuk mengatur alur lagu. ⧉ ulangi section, ✕ lewati.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={keys} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap items-center gap-2">
            {order.map((id, i) => {
              const s = byId.get(id);
              if (!s) return null;
              return (
                <Chip
                  key={keys[i]}
                  id={keys[i]}
                  s={s}
                  onDup={() => onChange([...order.slice(0, i + 1), id, ...order.slice(i + 1)])}
                  onRemove={() => onChange(order.filter((_, k) => k !== i))}
                />
              );
            })}
            <select
              value=""
              onChange={(e) => e.target.value && onChange([...order, e.target.value])}
              className="h-10 rounded-full border border-dashed border-line bg-transparent px-4 text-sm text-muted"
              aria-label="Tambah section"
            >
              <option value="">+ section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Chip({ id, s, onDup, onRemove }: { id: string; s: Section; onDup: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const color = SECTION_COLOR[s.type];
  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, borderColor: color }}
      className={`inline-flex h-10 items-center rounded-full border-2 bg-bg text-sm ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <button {...attributes} {...listeners} className="h-full cursor-grab touch-none pl-4 pr-1 font-semibold active:cursor-grabbing" style={{ color }}>
        {s.label}
      </button>
      <button onClick={onDup} className="grid h-full w-8 place-items-center text-muted hover:text-ink" aria-label={`Ulangi ${s.label}`} title="Ulangi">⧉</button>
      <button onClick={onRemove} className="grid h-full w-9 place-items-center pr-1 text-muted hover:text-hot" aria-label={`Lewati ${s.label}`} title="Lewati">✕</button>
    </span>
  );
}

function AddSong({ onAdd }: { onAdd: (s: Song) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setErr("");
      setResults(data);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mt-8 rounded-[28px] border-2 border-dashed border-line p-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="+ Tambah lagu ke setlist: cari judul…" className="input" />
      {err && <p className="mt-2 text-sm text-hot">{err}</p>}
      {q.trim() && results.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {results.map((s) => (
            <li key={s.id}>
              <button onClick={() => (onAdd(s), setQ(""))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                <span className="w-8 text-center text-sm font-bold text-accent">{s.original_key}</span>
                <span className="min-w-0 flex-1 truncate">{s.title} <span className="text-muted">· {s.artist}</span></span>
                <span className="text-sm text-accent">Tambah</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShareButton({ setlist, onShared }: { setlist: Setlist; onShared: (share: { id: string; token: string }) => void }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const url = setlist.share ? `${location.origin}/s/${setlist.share.id}` : "";
  const dirty = !!setlist.share && setlist.sharedAt !== setlist.updatedAt;

  const share = async () => {
    setBusy(true);
    setError("");
    const r = await shareSetlist(setlist, setlist.share);
    setBusy(false);
    if (r.error || !r.id || !r.token) return setError(r.error ?? "Gagal membagikan");
    onShared({ id: r.id, token: r.token });
    setOpen(true);
  };

  return (
    <div className="relative text-ink">
      <button
        className={`btn px-4 py-2 ${dirty ? "border-brand text-accent" : ""}`}
        disabled={busy || !setlist.items.length}
        onClick={() => (setlist.share && !dirty ? setOpen(!open) : share())}
      >
        {busy ? "…" : dirty ? "⟳ Update link band" : "↗ Bagikan"}
      </button>
      {error && <p className="absolute right-0 mt-1 w-60 text-right text-xs text-hot">{error}</p>}
      {open && url && (
        <div className="absolute right-0 z-30 mt-1 w-80 card p-3 shadow-xl shadow-black/10">
          <p className="mb-2 text-sm font-medium">Link untuk anggota band</p>
          <div className="flex gap-1.5">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="input font-mono text-xs" aria-label="Link setlist" />
            <button
              className="btn"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "✓" : "Salin"}
            </button>
          </div>
          {"share" in navigator && (
            <button className="btn btn-primary mt-2 w-full" onClick={() => navigator.share({ title: setlist.name, url }).catch(() => {})}>
              Kirim via WhatsApp / lainnya
            </button>
          )}
          <p className="mt-2 text-xs text-muted">Kalau kamu ubah setlist, klik <b>Update link band</b>. Link tetap sama, anggota tinggal refresh.</p>
        </div>
      )}
    </div>
  );
}
