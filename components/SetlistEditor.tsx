"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Mosaic } from "./shell/Mosaic";
import { PlayIcon, TrashIcon } from "./icons";

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
  const router = useRouter();
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
      <header className="-mx-4 -mt-16 flex flex-col gap-5 bg-gradient-to-b from-[#2a4d3a] to-panel px-4 pb-6 pt-24 sm:-mx-6 sm:flex-row sm:items-end sm:gap-6 sm:px-6">
        <Mosaic covers={setlist.items.map((i) => i.artwork)} className="size-44 shadow-2xl shadow-black/60 sm:size-[232px]" rounded="rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Setlist</p>
          <textarea
            value={setlist.name}
            rows={1}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value.replace(/\n/g, " ") }))}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
            aria-label="Nama setlist"
            className="headline mt-2 block w-full resize-none rounded-md bg-transparent text-[clamp(36px,6vw,88px)] outline-none [field-sizing:content] hover:bg-white/5 focus:bg-white/10"
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <input
              type="date"
              value={setlist.date ?? ""}
              onChange={(e) => update((s) => ({ ...s, date: e.target.value }))}
              className="h-8 rounded-full bg-black/30 px-3 text-sm [color-scheme:dark] hover:bg-black/50"
              aria-label="Tanggal"
            />
            <span className="text-ink/90">• {setlist.items.length} lagu</span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4 py-6">
        <Link
          href={`/setlists/${id}/play`}
          aria-disabled={!setlist.items.length}
          aria-label="Mulai stage mode"
          className={`grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-lg shadow-black/40 transition ${setlist.items.length ? "hover:scale-[1.06]" : "pointer-events-none opacity-40"}`}
        >
          <PlayIcon className="size-6" />
        </Link>
        <ShareButton
          setlist={setlist}
          onShared={(share) => setSetlists((all) => all.map((s) => (s.id === id ? { ...s, share, sharedAt: s.updatedAt } : s)))}
        />
        <Link href={`/setlists/${id}/print`} target="_blank" className="btn" aria-disabled={!setlist.items.length} title="Satu lagu per lembar A4">
          Cetak PDF
        </Link>
        <button
          className="btn-icon"
          onClick={() => confirm(`Hapus setlist "${setlist.name}"?`) && (setSetlists((all) => all.filter((s) => s.id !== id)), router.push("/setlists"))}
          aria-label="Hapus setlist"
          title="Hapus setlist"
        >
          <TrashIcon className="size-5" />
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={setlist.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
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
      className={`relative rounded-md transition ${open ? "bg-white/5" : "hover:bg-white/10"} ${isDragging ? "z-10 bg-card-hover ring-2 ring-brand" : ""}`}
    >
      <div className="flex min-h-16 items-center gap-3 px-2 py-2 sm:px-3">
        <button
          {...attributes}
          {...listeners}
          className="grid h-12 w-8 shrink-0 cursor-grab touch-none place-items-center rounded text-[15px] tabular-nums text-muted hover:text-ink active:cursor-grabbing"
          aria-label={`Geser ${item.title} (urutan ${n})`}
          title="Geser untuk mengubah urutan"
        >
          {n}
        </button>
        <Mosaic covers={[item.artwork]} className="size-12" />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="block truncate font-semibold">{item.title}</span>
          <span className="block truncate text-xs text-muted">
            {item.order.map((id) => byId.get(id)?.label).filter(Boolean).join(" → ") || "Belum ada section"}
          </span>
        </button>
        <TransposeControl value={item.transpose} onChange={(t) => onChange({ transpose: t })} originalKey={item.originalKey} />
        <button className="btn-icon hidden sm:grid" onClick={() => setOpen(!open)} aria-label={open ? "Tutup" : "Atur alur"}>{open ? "▴" : "▾"}</button>
      </div>

      {open && (
        <div className="px-3 pb-5 pt-2 sm:pl-[104px]">
          <SectionArranger sections={sections} order={item.order} onChange={(order) => onChange({ order })} />

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => setEditing(!editing)}>{editing ? "Selesai edit" : "✎ Edit chord & lirik"}</button>
            <button className="btn" onClick={() => onChange({ order: sections.map((s) => s.id) })}>Reset urutan</button>
            <Link href={`/songs/${item.slug}`} className="btn">Lagu asli</Link>
            <button className="btn ml-auto border-hot/50 text-hot hover:border-hot" onClick={() => confirm(`Hapus "${item.title}" dari setlist?`) && onRemove()}>Hapus dari setlist</button>
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
            <div className="rounded-md bg-black/30 p-4">
              <ChordSheet sections={arranged(item)} fontSize={15} />
            </div>
          </div>
        </div>
      )}
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
              className="h-10 rounded-full bg-surface-2 px-4 text-sm font-semibold text-muted"
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
      className={`inline-flex h-10 items-center rounded-full border-2 bg-black/30 text-sm ${isDragging ? "z-10 shadow-lg" : ""}`}
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
    <div className="mt-10 border-t border-line pt-6">
      <h2 className="text-2xl font-bold tracking-[-0.02em]">Tambahkan lagu ke setlist</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau penyanyi" aria-label="Cari lagu untuk ditambahkan" className="input mt-4 max-w-md rounded-md" />
      {err && <p className="mt-2 text-sm text-hot">{err}</p>}
      {q.trim() && results.length > 0 && (
        <ul className="mt-3">
          {results.map((s) => (
            <li key={s.id}>
              <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/10">
                <Mosaic covers={[s.artwork_url]} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.title}</span>
                  <span className="block truncate text-sm text-muted">{s.artist}{s.original_key ? ` · ${s.original_key}` : ""}</span>
                </span>
                <button onClick={() => (onAdd(s), setQ(""))} className="btn h-8 px-4 sm:h-8">Tambah</button>
              </div>
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
        className={`btn ${dirty ? "border-brand text-accent" : ""}`}
        disabled={busy || !setlist.items.length}
        onClick={() => (setlist.share && !dirty ? setOpen(!open) : share())}
      >
        {busy ? "…" : dirty ? "Update link band" : "Bagikan"}
      </button>
      {error && <p className="absolute right-0 mt-1 w-60 text-right text-xs text-hot">{error}</p>}
      {open && url && (
        <div className="absolute left-0 z-30 mt-2 w-80 rounded-md bg-[#282828] p-3 shadow-2xl shadow-black/60">
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
