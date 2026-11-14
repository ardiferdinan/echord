"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitColumns } from "@/lib/fit";
import { detectKey, transposeKey } from "@/lib/chordpro";
import { useLocal, useSetlists, type Setlist } from "@/lib/storage";
import { ChordSheet } from "@/components/ChordSheet";
import { arranged } from "@/components/SetlistEditor";
import { ChordShapes } from "@/components/ChordShapes";
import { SheetColorButton } from "@/components/SheetColors";
import { Popover } from "@/components/Popover";
import { ArrowRightIcon, ChevronIcon, ChordIcon, CloseIcon, ColumnsIcon, DotsIcon, ExpandIcon, MinusIcon, NoteIcon, PauseIcon, PlayIcon, PlusIcon } from "@/components/icons";

type WebkitDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
type WebkitEl = HTMLElement & { webkitRequestFullscreen?: () => void };
/** Full screen on and off; iPad browsers (all WebKit, Brave too) only have the webkit-prefixed API. false = not supported. */
function toggleFullscreen() {
  const d = document as WebkitDoc, el = document.documentElement as WebkitEl;
  if (d.fullscreenElement ?? d.webkitFullscreenElement) {
    if (d.exitFullscreen) d.exitFullscreen();
    else d.webkitExitFullscreen?.();
    return true;
  }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => el.webkitRequestFullscreen?.());
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else return false;
  return true;
}

/** Stage for a setlist saved in this browser. */
export function LocalStage({ id }: { id: string }) {
  const [setlists, setSetlists] = useSetlists();
  const setlist = setlists.find((s) => s.id === id);
  // a key change on stage is saved to the setlist (the editor and the PDF follow)
  const onTranspose = (itemId: string, t: number) =>
    setSetlists((all) => all.map((s) => (s.id === id ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, transpose: t } : it)), updatedAt: Date.now() } : s)));
  return setlist ? <Stage setlist={setlist} backHref={`/setlists/${id}`} printHref={`/setlists/${id}/print`} editHref={(itemId) => `/setlists/${id}?edit=${itemId}`} onTranspose={onTranspose} /> : null;
}

/** onTranspose: save key changes (own setlist); without it (shared link) they only last while the stage is open. */
export function Stage({ setlist, backHref, printHref, editHref, onTranspose }: { setlist: Setlist; backHref: string; printHref?: string; editHref?: (itemId: string) => string; onTranspose?: (itemId: string, t: number) => void }) {
  const [i, setI] = useState(0);
  const [font, setFont] = useLocal("echord:stage-font", 24);
  const [numbers, setNumbers] = useLocal("echord:numbers", false); // same choice as the song page
  const [speed, setSpeed] = useLocal("echord:scroll-speed", 20); // px per second
  const [scrolling, setScrolling] = useState(false);
  const [shapes, setShapes] = useLocal("echord:stage-shapes", false); // chord shapes panel
  const [all, setAll] = useLocal("echord:stage-all", false); // "show all": the whole song fitted on screen, no scrolling
  const fitBox = useRef<HTMLDivElement>(null);
  const [fsTip, setFsTip] = useState(false); // browser without the Fullscreen API (iPhone)
  const box = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState<Record<string, number>>({}); // key changes on a shared setlist (not saved)
  const items = setlist.items.map((it) => (it.id in shift ? { ...it, transpose: shift[it.id] } : it));
  const transpose = (t: number) => {
    if (!item) return;
    if (onTranspose) onTranspose(item.id, t);
    else setShift((m) => ({ ...m, [item.id]: t }));
  };
  const item = items[i];
  const next = items[i + 1];

  const go = (n: number) => {
    if (n < 0 || n >= items.length) return;
    setI(n);
    setScrolling(false);
    box.current?.scrollTo({ top: 0 });
  };


  // auto-scroll
  useEffect(() => {
    if (!scrolling) return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (t: number) => {
      const el = box.current;
      if (!el) return;
      acc += ((t - last) / 1000) * speed;
      last = t;
      if (acc >= 1) {
        el.scrollTop += Math.floor(acc);
        acc -= Math.floor(acc);
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return setScrolling(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrolling, speed]);

  // keyboard & Bluetooth page-turner pedals (they send PageDown / arrows)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = box.current;
      if (!el || (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === " ") {
        e.preventDefault();
        if (!all) setScrolling((s) => !s);
      }
      else if (e.key === "PageDown" || e.key === "ArrowDown") {
        e.preventDefault();
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) go(i + 1);
        else el.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" });
      } else if (e.key === "PageUp" || e.key === "ArrowUp") {
        e.preventDefault();
        if (el.scrollTop <= 0) go(i - 1);
        else el.scrollBy({ top: -el.clientHeight * 0.8, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // show all: fit the song into the space left on screen (more columns, then smaller text); refit on resize
  useLayoutEffect(() => {
    const el = fitBox.current;
    if (!all || !el) return;
    const fit = () => {
      el.style.overflowX = "hidden";
      // about one column per 300px (2 to 4); a song too long even then keeps its extra columns to the right, scrollable sideways
      const { fits } = fitColumns(el, el.firstElementChild as HTMLElement, { start: font, min: 10, maxCols: Math.min(4, Math.max(2, Math.floor(el.clientWidth / 300))) });
      el.style.overflowX = fits ? "hidden" : "auto";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [all, i, font, numbers, shapes, item?.id, item?.transpose, item?.content]);

  // swipe left/right
  const touch = useRef<{ x: number; y: number } | null>(null);

  const key = item?.originalKey ? transposeKey(item.originalKey, item.transpose) : null;

  // view settings, shown inline on wide screens and in the ⋯ menu on narrow ones
  const tools = (
    <>
      <button className="btn-icon" onClick={() => setFont(Math.max(14, font - 2))} aria-label="A− perkecil teks">A−</button>
      <button className="btn-icon" onClick={() => setFont(Math.min(48, font + 2))} aria-label="A+ perbesar teks">A+</button>
      <button className="grid h-11 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 aria-pressed:bg-ink aria-pressed:text-app sm:h-10" onClick={() => setNumbers(!numbers)} aria-pressed={numbers} title="Nama chord / chord angka">
        {numbers ? "123" : "Abc"}
      </button>
      <SheetColorButton />
      <button className="grid h-11 shrink-0 place-items-center rounded-full px-3 transition hover:bg-white/10 aria-pressed:bg-ink aria-pressed:text-app sm:h-10" onClick={() => setShapes(!shapes)} aria-pressed={shapes} aria-label="Bentuk chord" title="Bentuk chord">
        <ChordIcon className="size-5" />
      </button>
      {printHref && <Link href={printHref} target="_blank" className="grid h-11 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 sm:h-10" title="Cetak / simpan PDF">PDF</Link>}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-panel text-ink">
      {/* floating top pill */}
      <div className="mx-3 mt-3 flex items-center gap-1 overflow-x-auto rounded-full bg-[#1f1f1f] p-1.5 pr-2 text-sm [scrollbar-width:none] max-sm:[&_.btn-icon]:size-10 sm:mx-6 sm:gap-1.5 [&>*]:shrink-0">
        <Link href={backHref} className="grid size-10 place-items-center rounded-full bg-black/40 text-muted hover:text-ink sm:size-10" aria-label="Keluar stage mode"><CloseIcon className="size-5" /></Link>
        <span className="px-1 text-base font-bold tabular-nums sm:px-2 sm:text-lg">
          {String(i + 1).padStart(2, "0")}
          <span className="text-muted">/{String(items.length).padStart(2, "0")}</span>
        </span>
        <div className="hidden min-w-0 gap-1 md:flex" aria-hidden>
          {items.map((it, k) => (
            <button key={it.id} onClick={() => go(k)} tabIndex={-1} title={it.title} className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-brand" : k < i ? "w-2 bg-muted" : "w-2 bg-white/20"}`} />
          ))}
        </div>
        <button className="btn-icon disabled:opacity-30" disabled={i === 0} onClick={() => go(i - 1)} aria-label="Lagu sebelumnya" title="Lagu sebelumnya (←)">
          <ChevronIcon className="size-5" />
        </button>
        <button className="btn-icon bg-brand text-on-brand hover:brightness-110 disabled:opacity-30" disabled={i >= items.length - 1} onClick={() => go(i + 1)} aria-label="Lagu berikutnya" title="Lagu berikutnya (→)">
          <ChevronIcon dir="right" className="size-5" />
        </button>
        <span className="!shrink min-w-2 flex-1" />
        {!all && (
          <>
            <button className={`flex h-11 items-center gap-2 rounded-full px-3 font-bold transition sm:h-10 ${scrolling ? "bg-ink text-app" : "hover:bg-white/10"}`} onClick={() => setScrolling(!scrolling)} aria-pressed={scrolling} title="Auto-scroll (spasi)">
              {scrolling ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />} <span className="hidden lg:inline">Auto-scroll</span>
            </button>
            <input type="range" min={5} max={80} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="range hidden w-16 sm:block lg:w-24" style={{ ["--fill" as string]: `${((speed - 5) / 75) * 100}%` }} aria-label="Kecepatan auto-scroll" title="Kecepatan auto-scroll" />
          </>
        )}
        <button
          className={`flex h-11 items-center gap-2 rounded-full px-3 font-bold transition sm:h-10 ${all ? "bg-ink text-app" : "hover:bg-white/10"}`}
          onClick={() => {
            setScrolling(false);
            box.current?.scrollTo({ top: 0 });
            setAll(!all);
          }}
          aria-pressed={all}
          title="Tampilkan seluruh lagu dalam satu layar"
        >
          <ColumnsIcon className="size-4" /> <span className="hidden lg:inline">Semua</span>
        </button>
        <span className="mx-1 hidden h-6 w-px bg-white/10 lg:block" aria-hidden />
        {/* view settings: inline on wide screens, behind ⋯ on tablets in portrait and phones */}
        <div className="hidden items-center gap-1.5 lg:flex">{tools}</div>
        <Popover label="Pengaturan tampilan" buttonClass="btn-icon lg:hidden data-[open]:bg-white/10" button={<DotsIcon className="size-5" />} panelClass="w-auto p-2">
          {() => (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {tools}
                <button className="btn-icon sm:hidden" onClick={() => toggleFullscreen() || setFsTip(true)} aria-label="Layar penuh" title="Layar penuh"><ExpandIcon className="size-5" /></button>
              </div>
              {!all && (
                <label className="flex items-center gap-3 px-2 pb-1 text-sm text-muted sm:hidden">
                  Kecepatan scroll
                  <input type="range" min={5} max={80} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="range w-32" style={{ ["--fill" as string]: `${((speed - 5) / 75) * 100}%` }} />
                </label>
              )}
            </div>
          )}
        </Popover>
        <button className="btn-icon hidden sm:grid" onClick={() => toggleFullscreen() || setFsTip(true)} aria-label="Layar penuh" title="Layar penuh"><ExpandIcon className="size-5" /></button>
      </div>

      {fsTip && (
        <div role="status" className="mx-3 mt-2 flex items-start gap-3 rounded-lg bg-[#282828] p-3 text-sm sm:mx-6">
          <p className="flex-1">Browser ini tidak mendukung layar penuh. Cara lain: buka menu <b>Bagikan</b> → <b>Tambah ke Layar Utama</b>, lalu buka Echord dari ikon itu. Tampilannya tanpa bar browser.</p>
          <button className="btn-icon size-8 sm:size-8" onClick={() => setFsTip(false)} aria-label="Tutup"><CloseIcon className="size-4" /></button>
        </div>
      )}
      <div
        ref={box}
        className={`flex-1 px-3 pt-5 sm:px-6 ${all ? "overflow-hidden pb-4" : "overflow-y-auto pb-16"}`}
        onTouchStart={(e) => (touch.current = fitBox.current?.contains(e.target as Node) && fitBox.current.scrollWidth > fitBox.current.clientWidth ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) go(dx < 0 ? i + 1 : i - 1);
        }}
      >
        {item ? (
          <div className={`mx-auto ${all ? "h-full max-w-none" : shapes ? "max-w-6xl" : "max-w-4xl"} ${shapes ? "lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8" : ""}`}>
          <div className={`min-w-0 ${all ? "flex h-full flex-col" : ""}`}>
            <header className={`flex items-end gap-4 sm:gap-5 ${all ? "mb-4" : "mb-8"}`}>
              <span className="relative grid size-20 shrink-0 place-items-center overflow-clip rounded-md bg-gradient-to-br from-[#2f2f2f] to-[#1a1a1a] text-muted shadow-xl shadow-black/50 sm:size-24">
                {item.artwork ? <Image src={item.artwork} alt="" fill sizes="96px" className="object-cover" /> : <NoteIcon className="size-8" />}
              </span>
              <div className="min-w-0">
                <h1 className="text-[clamp(22px,2.6vw,34px)] font-black leading-tight tracking-[-0.03em]">{item.title}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  {item.parts?.length ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Medley · {item.parts.length} lagu, kunci diatur di editor</span>
                  ) : (
                  <span className="inline-flex h-9 items-center rounded-full bg-accent-soft font-bold text-accent" role="group" aria-label="Transpose">
                    <button type="button" onClick={() => transpose(item.transpose - 1)} className="grid h-full w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Turun setengah nada"><MinusIcon className="size-4" /></button>
                    <span className="px-1 tabular-nums" aria-live="polite">
                      {key ? `Kunci ${key}` : "Nada"}
                      {!key && item.transpose !== 0 && ` ${item.transpose > 0 ? "+" : ""}${item.transpose}`}
                    </span>
                    <button type="button" onClick={() => transpose(item.transpose + 1)} className="grid h-full w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Naik setengah nada"><PlusIcon className="size-4" /></button>
                  </span>
                  )}
                  {item.transpose !== 0 && !item.parts?.length && (
                    <button type="button" onClick={() => transpose(0)} className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/10 hover:text-ink" title="Kembali ke kunci asli">
                      {item.originalKey ? `asli ${item.originalKey}` : "asli"} · reset
                    </button>
                  )}
                  {item.artist && <span className="font-semibold">{item.artist}</span>}
                  {editHref && <Link href={editHref(item.id)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-white/20">Edit lagu ini</Link>}
                </p>
              </div>
            </header>
            {item.notes && <p className="mb-6 rounded-md bg-[#1f1f1f] px-4 py-3 text-base">{item.notes}</p>}
            {shapes && <ChordShapes sections={arranged(item)} className="mb-8 lg:hidden" />}
            {all ? (
              <div ref={fitBox} className="flow min-h-0 flex-1 overflow-hidden px-2 [column-fill:auto] [column-gap:3rem] [column-rule:1px_solid_rgb(255_255_255/.1)] sm:px-4">
                <ChordSheet key="fit" sections={arranged(item)} fontSize={font} numberKey={numbers ? key || detectKey(arranged(item)) : undefined} />
              </div>
            ) : (
              <div className="px-2 sm:px-4">
                <ChordSheet key="scroll" sections={arranged(item)} fontSize={font} numberKey={numbers ? key || detectKey(arranged(item)) : undefined} />
              </div>
            )}
            {next && !all && (
              <button onClick={() => go(i + 1)} className="group mt-12 flex w-full max-w-md items-center gap-4 rounded-lg bg-[#1f1f1f] p-4 text-left transition hover:bg-card-hover sm:ml-auto" aria-label={`Lagu berikutnya: ${next.title}`}>
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Berikutnya</span>
                  <span className="mt-1 block truncate text-xl font-black tracking-[-0.03em]">{next.title}</span>
                  {next.originalKey && <span className="text-sm text-muted">Kunci {transposeKey(next.originalKey, next.transpose)}</span>}
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition group-hover:scale-[1.06]" aria-hidden><ArrowRightIcon className="size-5" /></span>
              </button>
            )}
          </div>
          {shapes && (
            <aside className="hidden lg:block" aria-label="Bentuk chord">
              <ChordShapes sections={arranged(item)} className={all ? "max-h-full" : "sticky top-0"} />
            </aside>
          )}
          </div>
        ) : (
          <p className="text-center text-muted">Setlist kosong.</p>
        )}
      </div>

    </div>
  );
}
