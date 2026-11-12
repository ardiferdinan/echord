"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { detectKey, transposeKey } from "@/lib/chordpro";
import { useLocal, useSetlists, type Setlist } from "@/lib/storage";
import { ChordSheet } from "@/components/ChordSheet";
import { arranged } from "@/components/SetlistEditor";
import { Blob } from "@/components/Blob";

/** Stage for a setlist saved in this browser. */
export function LocalStage({ id }: { id: string }) {
  const [setlists] = useSetlists();
  const setlist = setlists.find((s) => s.id === id);
  return setlist ? <Stage setlist={setlist} backHref={`/setlists/${id}`} /> : null;
}

export function Stage({ setlist, backHref }: { setlist: Setlist; backHref: string }) {
  const [i, setI] = useState(0);
  const [font, setFont] = useLocal("echord:stage-font", 24);
  const [numbers, setNumbers] = useLocal("echord:numbers", false); // same choice as the song page
  const [theme, setTheme] = useLocal<"dark" | "light">("echord:stage-theme", "dark");
  const [speed, setSpeed] = useLocal("echord:scroll-speed", 20); // px per second
  const [scrolling, setScrolling] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const items = setlist.items;
  const item = items[i];
  const next = items[i + 1];

  const go = (n: number) => {
    if (n < 0 || n >= items.length) return;
    setI(n);
    setScrolling(false);
    box.current?.scrollTo({ top: 0 });
  };

  // stage is dark by default (dim stage, less glare); restore page theme on exit
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.dataset.theme;
    el.dataset.theme = theme;
    return () => {
      if (prev) el.dataset.theme = prev;
      else delete el.dataset.theme;
    };
  }, [theme]);

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
        setScrolling((s) => !s);
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

  // swipe left/right
  const touch = useRef<{ x: number; y: number } | null>(null);

  const key = item?.originalKey ? transposeKey(item.originalKey, item.transpose) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg text-ink">
      {/* floating top pill */}
      <div className="glass mx-3 mt-3 flex items-center gap-1.5 rounded-full border border-line p-1.5 pr-2 text-sm shadow-lg shadow-black/10 sm:mx-6">
        <Link href={backHref} className="grid size-11 place-items-center rounded-full bg-surface-2 hover:bg-line sm:size-10" aria-label="Keluar stage mode">✕</Link>
        <span className="display px-2 text-xl italic tabular-nums">
          {String(i + 1).padStart(2, "0")}
          <span className="text-muted">/{String(items.length).padStart(2, "0")}</span>
        </span>
        <div className="mr-auto hidden min-w-0 gap-1 sm:flex" aria-hidden>
          {items.map((it, k) => (
            <button key={it.id} onClick={() => go(k)} tabIndex={-1} title={it.title} className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-brand" : k < i ? "w-2 bg-muted" : "w-2 bg-line"}`} />
          ))}
        </div>
        <span className="flex-1 sm:hidden" />
        <button className="btn-icon" onClick={() => setFont(Math.max(14, font - 2))} aria-label="Perkecil teks">A−</button>
        <button className="btn-icon" onClick={() => setFont(Math.min(48, font + 2))} aria-label="Perbesar teks">A+</button>
        <button className="grid h-11 shrink-0 place-items-center rounded-full px-3 font-display font-bold italic transition hover:bg-surface-2 sm:h-10" onClick={() => setNumbers(!numbers)} aria-pressed={numbers} title="Nama chord / chord angka">
          {numbers ? "123" : "Abc"}
        </button>
        <button className="btn-icon hidden sm:grid" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Ganti tema">{theme === "dark" ? "☀" : "☾"}</button>
        <button className="btn-icon hidden sm:grid" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Layar penuh">⛶</button>
      </div>

      <div
        ref={box}
        className="flex-1 overflow-y-auto px-3 pb-28 pt-5 sm:px-6"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) go(dx < 0 ? i + 1 : i - 1);
        }}
      >
        {item ? (
          <div className="mx-auto max-w-4xl">
            <Blob
              fill="var(--brand)"
              radius={32}
              className="mb-8 min-h-[150px] p-6 pr-32 text-on-brand sm:min-h-[180px] sm:p-8 sm:pr-40"
              slots={{
                br: {
                  node: (
                    <div className="grid size-24 place-items-center rounded-3xl bg-dark text-on-dark sm:size-28">
                      <span className="display text-4xl italic sm:text-5xl">{key ?? "♪"}</span>
                    </div>
                  ),
                },
              }}
            >
              <span className="dots pointer-events-none absolute right-40 top-5 hidden h-16 w-28 opacity-50 sm:block" aria-hidden />
              <h1 className="display relative text-[clamp(28px,5vw,48px)] uppercase">{item.title}</h1>
              {item.artist && <p className="relative mt-2 text-sm font-medium opacity-90">{item.artist}</p>}
              {item.notes && <p className="relative mt-4 inline-block rounded-2xl bg-white/15 px-3 py-2 text-base font-medium">📝 {item.notes}</p>}
            </Blob>
            <div className="px-2 sm:px-4">
              <ChordSheet sections={arranged(item)} fontSize={font} interactive={false} numberKey={numbers ? key || detectKey(arranged(item)) : undefined} />
            </div>
            {next && (
              <Blob
                fill="var(--surface-2)"
                radius={28}
                className="group mt-12 w-full max-w-md p-6 pr-28 sm:ml-auto"
                slots={{
                  br: {
                    node: (
                      <span className="grid size-20 place-items-center rounded-[24px] bg-brand text-3xl text-on-brand transition group-hover:brightness-110" aria-hidden>
                        →
                      </span>
                    ),
                  },
                }}
              >
                <button onClick={() => go(i + 1)} className="absolute inset-0 z-20 rounded-[28px]" aria-label={`Lagu berikutnya: ${next.title}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Berikutnya</span>
                <span className="mt-1 block truncate font-display text-2xl font-black uppercase">{next.title}</span>
                {next.originalKey && <span className="text-sm text-muted">Key {transposeKey(next.originalKey, next.transpose)}</span>}
              </Blob>
            )}
          </div>
        ) : (
          <p className="text-center text-muted">Setlist kosong.</p>
        )}
      </div>

      {/* floating bottom control pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="glass pointer-events-auto flex w-full max-w-xl items-center gap-1.5 rounded-full border border-line p-1.5 text-sm shadow-2xl shadow-black/20">
          <button className="grid size-12 place-items-center rounded-full text-xl hover:bg-surface-2 disabled:opacity-30" disabled={i === 0} onClick={() => go(i - 1)} aria-label="Lagu sebelumnya">‹</button>
          <button className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-display font-bold italic transition ${scrolling ? "bg-brand text-on-brand" : "hover:bg-surface-2"}`} onClick={() => setScrolling(!scrolling)}>
            {scrolling ? "❚❚ Auto-scroll" : "▶ Auto-scroll"}
          </button>
          <input type="range" min={5} max={80} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-16 accent-[var(--brand)] sm:w-28" aria-label="Kecepatan auto-scroll" />
          <button className="grid size-12 place-items-center rounded-full bg-brand text-xl text-on-brand hover:brightness-110 disabled:opacity-30" disabled={i >= items.length - 1} onClick={() => go(i + 1)} aria-label="Lagu berikutnya">›</button>
        </div>
      </div>
    </div>
  );
}
