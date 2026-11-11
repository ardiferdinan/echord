import Link from "next/link";
import type { ReactNode } from "react";
import { Blob } from "./Blob";
import { Frame } from "./Frame";
import { GuitarDiagram } from "./Diagrams";

const CARD_TAB = "color-mix(in srgb, var(--ink) 16%, transparent)";

export function Hero({ search, songs }: { search: ReactNode; songs: ReactNode }) {
  return (
    <section className="relative">
      <Frame search={search} className="px-5 pb-8 pt-28 sm:px-10 sm:pb-10 sm:pt-32 lg:min-h-[max(600px,calc(100svh-2rem))]">
        {/*
          Left column. lg+: fills the slab height left of the cards (card A sits 384/448px from the right
          and is 256/288px wide, +24px gap) and the song list takes the remaining height, scrolling inside.
        */}
        <div className="@container relative flex flex-col lg:absolute lg:inset-y-0 lg:left-0 lg:w-[calc(100%-664px)] lg:pb-10 lg:pl-10 lg:pt-28 xl:w-[calc(100%-760px)]">
          {/* "CHORD" is ~3.7em wide: size it to the column so it never runs under the cards */}
          <h1 className="display relative text-[clamp(56px,25cqw,240px)] uppercase">Chord</h1>

          <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-7">
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-bg px-4 font-display text-sm font-bold italic text-accent">
              <Sparkle /> Rohani & worship
            </span>
            <p className="max-w-64 text-sm font-bold leading-snug">transpose sekali klik, diagram gitar & piano, setlist untuk pelayanan</p>
          </div>

          <Link href="/setlists" className="relative mt-6 inline-flex h-12 w-fit items-center gap-4 rounded-full border-2 border-on-brand px-6 text-base font-bold transition hover:bg-on-brand hover:text-brand sm:h-14 sm:px-7 sm:text-lg">
            Buat setlist <Play />
          </Link>

          <div className="relative mt-8 flex min-h-0 flex-1 flex-col lg:min-h-64">{songs}</div>
        </div>


        {/* floating card A: setlist */}
        <div className="float relative mt-8 max-w-80 lg:absolute lg:bottom-10 lg:right-[384px] lg:mt-0 lg:w-64 xl:right-[448px] xl:w-72">
          <Blob
            fill="var(--bg)"
            radius={28}
            gap={10}
            className="p-6 pb-24 text-ink"
            slots={{
              br: {
                node: (
                  <Link href="/setlists" className="grid h-16 w-28 place-items-center rounded-[22px] bg-dark font-display text-lg font-bold italic text-on-dark transition hover:brightness-110">
                    Atur ↗
                  </Link>
                ),
              },
            }}
          >
            <p className="font-display text-xl font-extrabold">Ibadah Minggu</p>
            <p className="text-sm text-muted">5 lagu · Key G</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-2"><Note /> Drag & drop Intro, Verse, Reff</li>
              <li className="flex gap-2"><Note /> Ulangi Reff 2×, lewati Bridge</li>
            </ul>
            <p className="absolute bottom-6 left-6 font-display text-lg font-bold italic leading-tight text-muted">
              Intro →<br />Reff ×2
            </p>
          </Blob>
          <Pick className="absolute -right-5 -top-6 z-20 size-14 rotate-[18deg]" />
        </div>

        {/* floating card B: chord hover, with translucent arrow tabs tucked into its corners */}
        <div className="float-slow relative ml-auto mt-24 max-w-80 sm:mt-20 lg:absolute lg:bottom-10 lg:right-10 lg:mt-0 lg:w-80 xl:w-96 xl:max-w-none">
          <p className="display absolute -right-2 -top-14 z-20 text-right text-[52px] italic text-ink lg:-top-20 lg:text-[64px]" aria-hidden>
            ±12
            <br />
            <span className="text-[0.55em]">TRANSPOSE</span>
          </p>
          <Blob
            fill="var(--bg)"
            radius={32}
            className="p-7 pb-28 pt-24 text-ink"
            slots={{
              tl: {
                tint: CARD_TAB,
                node: (
                  <Link href="/chords?i=guitar" className="group grid size-20 place-items-center text-on-brand" aria-label="Kamus chord gitar" title="Kamus chord gitar">
                    <span className="grid place-items-center gap-0.5">
                      <Arrow className="size-6 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Gitar</span>
                    </span>
                  </Link>
                ),
              },
              bl: {
                tint: CARD_TAB,
                node: (
                  <Link href="/chords?i=piano" className="group grid h-24 w-24 place-items-center text-on-brand" aria-label="Kamus chord piano" title="Kamus chord piano">
                    <span className="grid place-items-center gap-0.5">
                      <Arrow className="size-7 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Piano</span>
                    </span>
                  </Link>
                ),
              },
            }}
          >
            <div className="flex items-start gap-3">
              <div>
                <p className="font-display text-3xl font-black">Chord G</p>
                <p className="font-medium text-muted">hover → gitar & piano</p>
              </div>
              <div className="-mr-2 -mt-3 ml-auto shrink-0">
                <GuitarDiagram v={{ frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1, barres: [] }} size={0.7} />
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-snug">
              <li>Saran voicing saat main full band</li>
              <li>Gitar elektrik + piano? register diatur supaya tidak tabrakan</li>
            </ul>
            <p className="display absolute bottom-7 right-7 text-4xl italic text-muted">G → A</p>
          </Blob>
        </div>
      </Frame>
    </section>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" strokeLinecap="round" opacity=".35" />
      <path d="M12 4c.8 4.5 3.5 7.2 8 8-4.5.8-7.2 3.5-8 8-.8-4.5-3.5-7.2-8-8 4.5-.8 7.2-3.5 8-8Z" />
    </svg>
  );
}

function Play() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M7 4.5v15l12-7.5-12-7.5Z" />
    </svg>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

function Note() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-accent" fill="currentColor" aria-hidden>
      <path d="M9 18.5a3 3 0 1 1-2-2.83V5l12-2v12.5a3 3 0 1 1-2-2.83V6.4L9 7.8v10.7Z" />
    </svg>
  );
}

/** Guitar pick sticker, the "shuriken" of the reference. */
function Pick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 52" className={className} aria-hidden>
      <path d="M24 2C11 2 3 7.5 3 15.5 3 28 15 42 21.5 49c1.4 1.5 3.6 1.5 5 0C33 42 45 28 45 15.5 45 7.5 37 2 24 2Z" fill="var(--hot)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M14 13c3-3 7-4 10-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
    </svg>
  );
}

