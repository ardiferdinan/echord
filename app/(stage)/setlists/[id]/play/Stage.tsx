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
import { ArrowRightIcon, ChevronIcon, ChordIcon, CloseIcon, ExpandIcon, MinusIcon, NoteIcon, PauseIcon, PlayIcon, PlusIcon } from "@/components/icons";

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-panel text-ink">
      {/* floating top pill */}
      <div className="mx-3 mt-3 flex items-center gap-1 overflow-x-auto rounded-full bg-[#1f1f1f] p-1.5 pr-2 text-sm [scrollbar-width:none] sm:mx-6 sm:gap-1.5 [&>*]:shrink-0">
        <Link href={backHref} className="grid size-11 place-items-center rounded-full bg-black/40 text-muted hover:text-ink sm:size-10" aria-label="Keluar stage mode"><CloseIcon className="size-5" /></Link>
        <span className="px-1 text-base font-bold tabular-nums sm:px-2 sm:text-lg">
          {String(i + 1).padStart(2, "0")}
          <span className="text-muted">/{String(items.length).padStart(2, "0")}</span>
        </span>
        <div className="mr-auto hidden min-w-0 gap-1 sm:flex" aria-hidden>
          {items.map((it, k) => (
            <button key={it.id} onClick={() => go(k)} tabIndex={-1} title={it.title} className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-brand" : k < i ? "w-2 bg-muted" : "w-2 bg-white/20"}`} />
          ))}
        </div>
        <span className="!shrink flex-1 sm:hidden" />
        <button className="btn-icon" onClick={() => setFont(Math.max(14, font - 2))} aria-label="A− perkecil teks">A−</button>
        <button className="btn-icon" onClick={() => setFont(Math.min(48, font + 2))} aria-label="A+ perbesar teks">A+</button>
        <button className="grid h-11 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 aria-pressed:bg-ink aria-pressed:text-app sm:h-10" onClick={() => setNumbers(!numbers)} aria-pressed={numbers} title="Nama chord / chord angka">
          {numbers ? "123" : "Abc"}
        </button>
        <SheetColorButton />
        <button className="grid h-11 shrink-0 place-items-center rounded-full px-3 transition hover:bg-white/10 aria-pressed:bg-ink aria-pressed:text-app sm:h-10" onClick={() => setShapes(!shapes)} aria-pressed={shapes} aria-label="Bentuk chord" title="Bentuk chord">
          <ChordIcon className="size-5" />
        </button>
        {printHref && <Link href={printHref} target="_blank" className="hidden h-10 shrink-0 place-items-center rounded-full px-3 font-bold transition hover:bg-white/10 sm:grid" title="Cetak / simpan PDF">PDF</Link>}
        <button className="btn-icon hidden sm:grid" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Layar penuh"><ExpandIcon className="size-5" /></button>
      </div>

      <div
        ref={box}
        className={`flex-1 px-3 pt-5 sm:px-6 ${all ? "overflow-hidden pb-24" : "overflow-y-auto pb-28"}`}
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
                  <span className="inline-flex h-9 items-center rounded-full bg-accent-soft font-bold text-accent" role="group" aria-label="Transpose">
                    <button type="button" onClick={() => transpose(item.transpose - 1)} className="grid h-full w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Turun setengah nada"><MinusIcon className="size-4" /></button>
                    <span className="px-1 tabular-nums" aria-live="polite">
                      {key ? `Kunci ${key}` : "Nada"}
                      {!key && item.transpose !== 0 && ` ${item.transpose > 0 ? "+" : ""}${item.transpose}`}
                    </span>
                    <button type="button" onClick={() => transpose(item.transpose + 1)} className="grid h-full w-9 place-items-center rounded-full hover:bg-white/10" aria-label="Naik setengah nada"><PlusIcon className="size-4" /></button>
                  </span>
                  {item.transpose !== 0 && (
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

      {/* floating bottom control pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-1.5 rounded-full bg-[#282828] p-1.5 text-sm shadow-2xl shadow-black/60">
          <button className="grid size-12 shrink-0 place-items-center rounded-full text-muted hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => go(i - 1)} aria-label="Lagu sebelumnya">
            <ChevronIcon className="size-5" />
          </button>
          {all && <span className="flex-1" />}
          {!all && (
            <>
              <button className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-bold transition ${scrolling ? "bg-ink text-app" : "hover:bg-white/10"}`} onClick={() => setScrolling(!scrolling)}>
                {scrolling ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />} Auto-scroll
              </button>
              <input type="range" min={5} max={80} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="range w-14 sm:w-24" style={{ ["--fill" as string]: `${((speed - 5) / 75) * 100}%` }} aria-label="Kecepatan auto-scroll" />
            </>
          )}
          <button
            className={`flex h-12 items-center justify-center gap-2 rounded-full px-4 font-bold transition ${all ? "bg-ink text-app" : "hover:bg-white/10"}`}
            onClick={() => {
              setScrolling(false);
              box.current?.scrollTo({ top: 0 });
              setAll(!all);
            }}
            aria-pressed={all}
            title="Tampilkan seluruh lagu dalam satu layar"
          >
            <ExpandIcon className="size-4" /> Semua
          </button>
          {all && <span className="flex-1" />}
          <button className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand hover:brightness-110 disabled:opacity-30" disabled={i >= items.length - 1} onClick={() => go(i + 1)} aria-label="Lagu berikutnya">
            <ChevronIcon dir="right" className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
