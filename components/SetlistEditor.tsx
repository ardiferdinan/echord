"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flowCollapsed, flowId, parseSections, transposeKey, transposeSections, type Section } from "@/lib/chordpro";
import type { Song } from "@/lib/db";
import { newItem, uid, useHydrated, useSetlists, type Setlist, type SetlistItem } from "@/lib/storage";
import { shareSetlist } from "@/app/(main)/setlists/actions";
import { FlowEditor } from "./FlowEditor";
import { MedleyCard, medleyMeta } from "./Medley";
import { ConfirmButton } from "./ConfirmButton";
import { SourceChips, withVersion } from "./AddToSetlist";
import { sourceName } from "@/lib/sources";
import type { Version } from "@/lib/db";

type Full = Omit<Song, "versions"> & { versions?: Version[] };
import { TransposeControl } from "./Controls";
import { Mosaic } from "./shell/Mosaic";
import { PlayIcon, TrashIcon } from "./icons";

/** The sections to play, in order; a medley is its songs one after another, each under a title row. */
export function arranged(item: SetlistItem): Section[] {
  if (item.parts?.length)
    return item.parts.flatMap((p, k) => {
      const key = p.originalKey ? transposeKey(p.originalKey, p.transpose) : undefined;
      return [{ id: `h${k}`, label: p.title, type: "part" as const, lines: [], heading: `${p.title}${key ? ` · Kunci ${key}` : ""}`, key }, ...arranged(p).map((s) => ({ ...s, key }))];
    });
  const secs = parseSections(item.content);
  const byId = new Map(secs.map((s) => [s.id, s]));
  const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : undefined;
  // the same part several times in a row (Intro 4X) is written once with its count, like in the editor
  const flow: Section[] = [];
  for (const e of item.order) {
    const s = byId.get(flowId(e)), last = flow.at(-1);
    if (!s) continue;
    if (last && last.id === s.id && !!last.collapsed === flowCollapsed(e)) last.repeat = (last.repeat ?? 1) + 1;
    else flow.push({ ...s, collapsed: flowCollapsed(e) });
  }
  return transposeSections(flow, item.transpose, key);
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

  /** Song (or medley) n and the one after it become one medley; the songs keep their own flow and key. */
  const mergeNext = (n: number) =>
    update((s) => {
      const a = s.items[n], b = s.items[n + 1];
      const songs = (x: SetlistItem) => (x.parts?.length ? x.parts : [{ ...x, notes: undefined }]);
      const medley: SetlistItem = { id: a.parts?.length ? a.id : uid(), songId: 0, slug: "", artist: null, originalKey: null, content: "", transpose: 0, order: [], notes: a.parts?.length ? a.notes : undefined, ...medleyMeta([...songs(a), ...songs(b)]) };
      return { ...s, items: [...s.items.slice(0, n), medley, ...s.items.slice(n + 2)] };
    });
  /** A medley back into separate songs, in place. */
  const split = (n: number) => update((s) => ({ ...s, items: s.items.flatMap((x, i) => (i === n ? (x.parts ?? []) : [x])) }));

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
        <ConfirmButton
          className="btn-icon"
          armedClassName="!w-auto !px-4 bg-hot/20 text-hot text-sm font-bold"
          label="Hapus setlist"
          confirmLabel="Yakin hapus setlist?"
          onConfirm={() => (setSetlists((all) => all.filter((s) => s.id !== id)), router.push("/setlists"))}
        >
          <TrashIcon className="size-5" />
        </ConfirmButton>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={setlist.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {setlist.items.map((item, n) => {
              const common = {
                n: n + 1,
                item,
                onChange: (p: Partial<SetlistItem>) => updateItem(item.id, p),
                onRemove: () => update((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) })),
                onMergeNext: n < setlist.items.length - 1 ? () => mergeNext(n) : undefined,
              };
              return item.parts?.length ? <MedleyCard key={item.id} {...common} onSplit={() => split(n)} /> : <SongCard key={item.id} {...common} />;
            })}
          </ol>
        </SortableContext>
      </DndContext>

      <AddSong onAdd={(song) => update((s) => ({ ...s, items: [...s.items, newItem(song)] }))} />
    </div>
  );
}

function SongCard({ item, n, onChange, onRemove, onMergeNext }: { item: SetlistItem; n: number; onChange: (p: Partial<SetlistItem>) => void; onRemove: () => void; onMergeNext?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("edit") === item.id); // from stage's "Edit lagu ini"; items render client-side only
  const [raw, setRaw] = useState(false); // advanced: the ChordPro text itself
  // other sites' chords for this song, loaded when the card opens
  const [full, setFull] = useState<Full | null>(null);
  useEffect(() => {
    if (!open || full) return;
    fetch(`/api/songs/${encodeURIComponent(item.slug)}`).then((r) => (r.ok ? r.json() : null)).then(setFull, () => {});
  }, [open, full, item.slug]);
  const sources = full ? [full.source_url ?? null, ...(full.versions ?? []).map((v) => v.source_url ?? null)] : [];
  const current = item.source === undefined ? 0 : sources.indexOf(item.source); // items saved before sources existed = main
  const applySource = (s: Song) => onChange({ content: s.content, order: parseSections(s.content).map((x) => x.id), transpose: 0, originalKey: s.original_key, source: s.source_url ?? null });
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  /** Back to the song as it is in the library: chords & lyrics, full flow, original key (notes stay). */
  const resetAll = async () => {
    setResetting(true);
    setResetError("");
    try {
      const res = await fetch(`/api/songs/${encodeURIComponent(item.slug)}`);
      if (!res.ok) throw new Error("Lagu asli tidak ditemukan");
      const song = (await res.json()) as Full;
      const all = [song.source_url ?? null, ...(song.versions ?? []).map((v) => v.source_url ?? null)];
      // back to the original of the source this item uses (JRChord or PsalmNote…)
      applySource(withVersion(song, Math.max(0, item.source === undefined ? 0 : all.indexOf(item.source))));
      onChange({ artwork: song.artwork_url ?? item.artwork });
    } catch (e) {
      setResetError((e as Error).message);
    } finally {
      setResetting(false);
    }
  };
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
            {item.order.map((e) => byId.get(flowId(e))?.label).filter(Boolean).join(" → ") || "Belum ada section"}
          </span>
        </button>
        <TransposeControl value={item.transpose} onChange={(t) => onChange({ transpose: t })} originalKey={item.originalKey} />
        <ConfirmButton className="btn-icon text-muted hover:text-hot" armedClassName="!w-auto !px-3 bg-hot/20 !text-hot text-xs font-bold" label={`Hapus ${item.title} dari setlist`} confirmLabel="Hapus?" onConfirm={onRemove}>
          <TrashIcon className="size-5" />
        </ConfirmButton>
        <button className="btn-icon hidden sm:grid" onClick={() => setOpen(!open)} aria-label={open ? "Tutup" : "Atur alur"}>{open ? "▴" : "▾"}</button>
      </div>

      {open && (
        <div className="px-3 pb-5 pt-2 sm:pl-[104px]">
          <p className="mb-2 text-xs text-muted">Klik suku kata untuk menaruh chord · ✎ edit lirik · ↑ ↓ atau geser penanda untuk memindah bagian · ⧉ duplikat · ⋯ opsi lain.</p>
          {sources.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Sumber chord">
              <span className="font-semibold text-muted">Sumber chord:</span>
              {sources.map((u, i) =>
                i === current ? (
                  <span key={i} className="grid h-7 place-items-center rounded-full bg-ink px-3 font-bold text-app" aria-current="true">{sourceName(u)}</span>
                ) : (
                  <ConfirmButton key={i} className="h-7 rounded-full bg-white/10 px-3 font-bold text-ink hover:bg-white/20" armedClassName="!bg-ink !text-app" confirmLabel={`Ganti ke ${sourceName(u)}? Editan lagu ini hilang`} onConfirm={() => applySource(withVersion(full!, i))}>
                    {sourceName(u)}
                  </ConfirmButton>
                ),
              )}
            </div>
          )}
          <FlowEditor item={item} onChange={onChange} />

          <textarea
            value={item.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Catatan (mis. drum masuk di Reff 2, ending ritardando)…"
            rows={1}
            className="input mt-4 h-auto resize-y py-3"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => onChange({ order: sections.map((s) => s.id) })} title="Urutan bagian kembali seperti lagu, tanpa ulangan atau ciutan">Reset alur</button>
            <ConfirmButton
              className={`btn ${resetting ? "pointer-events-none opacity-50" : ""}`}
              armedClassName="!border-ink !bg-ink !text-app"
              label="Kembalikan chord, lirik, alur dan kunci seperti lagu asli"
              confirmLabel="Yakin? Semua editan hilang"
              onConfirm={resetAll}
            >
              Reset ke lagu asli
            </ConfirmButton>
            <Link href={`/songs/${item.slug}`} className="btn">Lagu asli</Link>
            {onMergeNext && <button className="btn" onClick={onMergeNext} title="Lagu ini dan lagu di bawahnya jadi satu medley">Jadikan medley dengan lagu berikutnya</button>}
            <button className="btn" onClick={() => setRaw(!raw)} aria-expanded={raw}>{raw ? "Tutup teks ChordPro" : "Teks ChordPro"}</button>
            <ConfirmButton className="btn ml-auto border-hot/50 text-hot hover:border-hot" armedClassName="!border-hot !bg-hot !text-black" confirmLabel="Ya, hapus dari setlist" onConfirm={onRemove}>
              Hapus dari setlist
            </ConfirmButton>
          </div>

          {resetError && <p className="mt-2 text-sm text-hot" role="alert">{resetError}</p>}
          {raw && (
            <textarea
              value={item.content}
              onChange={(e) => {
                const content = e.target.value;
                const ids = parseSections(content).map((s) => s.id);
                onChange({ content, order: ids.length === sections.length ? item.order : ids });
              }}
              spellCheck={false}
              className="input mt-3 h-auto min-h-80 py-3 font-mono text-base leading-relaxed sm:text-[13px]"
              aria-label="Teks ChordPro (lanjutan)"
            />
          )}
        </div>
      )}
    </li>
  );
}

function AddSong({ onAdd }: { onAdd: (s: Song) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [err, setErr] = useState("");
  const [choosing, setChoosing] = useState<{ id: number; song?: Full; vi: number } | null>(null); // a song with several sources
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
  const add = (s: Song) => (onAdd(s), setQ(""), setChoosing(null));
  const choose = async (s: Song) => {
    setChoosing({ id: s.id, vi: 0 });
    const res = await fetch(`/api/songs/${encodeURIComponent(s.slug)}`);
    if (!res.ok) return setErr("Lagu gagal dimuat");
    const song = (await res.json()) as Full;
    setChoosing((c) => (c?.id === s.id ? { ...c, song } : c));
  };

  return (
    <div className="mt-10 border-t border-line pt-6">
      <h2 className="text-2xl font-bold tracking-[-0.02em]">Tambahkan lagu ke setlist</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau penyanyi" aria-label="Cari lagu untuk ditambahkan" className="input mt-4 max-w-md rounded-md" />
      {err && <p className="mt-2 text-sm text-hot">{err}</p>}
      {q.trim() && results.length > 0 && (
        <ul className="mt-3">
          {results.map((s) => (
            <li key={s.id}>
              <div className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2 hover:bg-white/10">
                <Mosaic covers={[s.artwork_url]} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.artist}{s.original_key ? ` · ${s.original_key}` : ""}
                    {s.version_count ? ` · ${s.version_count + 1} sumber` : ""}
                  </span>
                </span>
                {choosing?.id === s.id ? (
                  choosing.song ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <SourceChips song={choosing.song} value={choosing.vi} onChange={(vi) => setChoosing({ ...choosing, vi })} />
                      <button onClick={() => add(withVersion(choosing.song!, choosing.vi))} className="btn btn-primary h-8 px-4 sm:h-8">Tambah</button>
                    </span>
                  ) : (
                    <span className="text-sm text-muted">Memuat sumber…</span>
                  )
                ) : (
                  <button onClick={() => (s.version_count ? choose(s) : add(s))} className="btn h-8 px-4 sm:h-8">Tambah</button>
                )}
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
          {/* links made before covers were shared (or anything else was added) get today's version */}
          <button className="mt-2 w-full text-xs font-semibold text-muted hover:text-ink hover:underline" onClick={() => share()} disabled={busy}>
            {busy ? "Memperbarui…" : "Perbarui isi link (cover, chord terbaru)"}
          </button>
          <p className="mt-2 text-xs text-muted">Kalau kamu ubah setlist, klik <b>Update link band</b>. Link tetap sama, anggota tinggal refresh.</p>
        </div>
      )}
    </div>
  );
}
