"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { importText, parseSections } from "@/lib/chordpro";
import { ChordSheet } from "@/components/ChordSheet";
import { ClickEditor } from "@/components/ClickEditor";
import { saveSong } from "@/app/(main)/admin/actions";

type Lyric = { id: number; trackName: string; artistName: string; plainLyrics: string };
const EMPTY = { title: "", artist: "", key: "", bpm: "" };

export function SongForm() {
  const [text, setText] = useState("");
  const [meta, setMeta] = useState(EMPTY); // user overrides; empty = use auto-detected
  const [mode, setMode] = useState<"paste" | "click">("paste");
  const [queue, setQueue] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({});
  const [saving, setSaving] = useState(false);

  const imported = useMemo(() => importText(text), [text]);
  const title = meta.title || imported.title || "";
  const artist = meta.artist || imported.artist || "";
  const key = meta.key || imported.key;
  const sections = useMemo(() => parseSections(imported.content), [imported.content]);

  const load = (t: string) => {
    setText(t);
    setMeta(EMPTY);
  };

  const onPaste = (t: string) => {
    const parts = t.split(/^\s*-{3,}\s*$/m).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      load(parts[0]);
      setQueue(parts.slice(1));
    } else setText(t);
  };

  const onFiles = async (files: FileList) => {
    const texts = await Promise.all([...files].filter((f) => /\.(txt|cho|chopro|pro)$/i.test(f.name) || f.type.startsWith("text/")).map((f) => f.text()));
    if (!texts.length) return;
    if (!text.trim()) {
      load(texts[0]);
      setQueue((q) => [...q, ...texts.slice(1)]);
    } else setQueue((q) => [...q, ...texts]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const input = { title, artist, originalKey: key, bpm: meta.bpm, content: imported.content };
    const r = await saveSong(input);
    setSaving(false);
    if (r.error) return setStatus({ error: r.error });
    setStatus({ ok: r.slug });
    load(queue[0] ?? "");
    setQueue((q) => q.slice(1));
    setMode("paste");
  };

  return (
    <div
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          save();
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Tambah lagu</h1>
          <p className="mt-1 text-sm text-muted">
            Paste teks chord dari mana saja, atau cari lirik lalu klik suku kata untuk menaruh chord.
          </p>
        </div>
      </div>

      <LyricsSearch
        onPick={(l) => {
          load(l.plainLyrics);
          setMeta({ ...EMPTY, title: l.trackName, artist: l.artistName });
          setMode("click");
        }}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr]">
        <input value={title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Judul" className="input col-span-2 sm:col-span-1" aria-label="Judul" />
        <input value={artist} onChange={(e) => setMeta({ ...meta, artist: e.target.value })} placeholder="Penyanyi / pencipta" className="input col-span-2 sm:col-span-1" aria-label="Penyanyi" />
        <input value={key} onChange={(e) => setMeta({ ...meta, key: e.target.value })} placeholder="Key" className="input" aria-label="Kunci asli" />
        <input value={meta.bpm} onChange={(e) => setMeta({ ...meta, bpm: e.target.value })} placeholder="BPM" inputMode="numeric" className="input" aria-label="BPM" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-11 rounded-full bg-surface-2 p-1 text-sm sm:h-10">
              {(["paste", "click"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`rounded-full px-4 font-semibold ${mode === m ? "bg-ink text-app" : "text-muted hover:text-ink"}`}>
                  {m === "paste" ? "Teks" : "Klik chord"}
                </button>
              ))}
            </div>
            <label className="btn ml-auto cursor-pointer">
              Import .txt
              <input type="file" multiple accept=".txt,.cho,.chopro,.pro,text/plain" className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
            </label>
          </div>
          {mode === "paste" ? (
            <textarea
              value={text}
              onChange={(e) => onPaste(e.target.value)}
              spellCheck={false}
              placeholder={"Judul - Penyanyi\n\nIntro: G C D\n\nVerse 1\nG         C        G\nAmazing grace how sweet the sound\n\nReff\n…\n\n(Banyak lagu sekaligus? pisahkan dengan baris ---)"}
              className="input h-auto py-3 min-h-[28rem] font-mono text-base leading-relaxed sm:text-[13px]"
              aria-label="Teks lagu"
            />
          ) : (
            <div className="min-h-[28rem] rounded-lg bg-card p-5">
              {sections.length ? (
                <ClickEditor
                  content={imported.content}
                  songKey={key}
                  onChange={(c) => {
                    // serialized ChordPro drops the "Title - Artist" line: pin detected meta first
                    setMeta((m) => ({ ...m, title: m.title || title, artist: m.artist || artist }));
                    setText(c);
                  }}
                />
              ) : (
                <p className="text-sm text-muted">Belum ada lirik. Cari lirik di atas atau paste di tab Teks.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Preview</p>
          {sections.length ? <ChordSheet sections={sections} fontSize={15} /> : <p className="text-sm text-muted">Preview muncul di sini.</p>}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button className="btn btn-primary px-5 py-2" onClick={save} disabled={saving || !sections.length}>
          {saving ? "Menyimpan…" : `Simpan${queue.length ? ` & berikutnya (${queue.length} lagi)` : ""}`}
        </button>
        <span className="text-xs text-muted">⌘/Ctrl + Enter</span>
        {status.ok && (
          <span className="text-sm">
            ✓ Tersimpan · <Link href={`/songs/${status.ok}`} className="text-accent underline">lihat lagu</Link>
          </span>
        )}
        {status.error && <span className="text-sm text-hot">{status.error}</span>}
        {queue.length > 0 && (
          <button className="btn ml-auto" onClick={() => (load(queue[0]), setQueue(queue.slice(1)))}>Lewati</button>
        )}
      </div>
    </div>
  );
}

function LyricsSearch({ onPick }: { onPick: (l: Lyric) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Lyric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/lyrics?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (e) {
      setErr((e as Error).message || "Gagal mencari lirik");
    }
    setLoading(false);
  };

  return (
    <div className="mb-4 rounded-lg bg-card p-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari lirik otomatis (LRCLIB): judul + penyanyi" className="input" aria-label="Cari lirik" />
        <button className="btn" disabled={loading}>{loading ? "…" : "Cari lirik"}</button>
      </form>
      {err && <p className="mt-2 text-sm text-hot">{err}</p>}
      {results && (
        <ul className="mt-2 max-h-56 overflow-y-auto">
          {results.length === 0 && <li className="px-2 py-2 text-sm text-muted">Tidak ditemukan, silakan input manual.</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => (onPick(r), setResults(null))}
                className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
              >
                <b>{r.trackName}</b> <span className="text-muted">· {r.artistName}</span>
                <span className="block truncate text-xs text-muted">{r.plainLyrics.split("\n").slice(0, 2).join(" / ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">Lirik dari LRCLIB (komunitas). Hak cipta lirik tetap milik pencipta/penerbit.</p>
    </div>
  );
}
