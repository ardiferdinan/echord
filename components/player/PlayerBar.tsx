"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AddToSetlist } from "../AddToSetlist";
import { Popover } from "../Popover";
import { ChordIcon, NextIcon, NoteIcon, PauseIcon, PlayIcon, PrevIcon, QueueIcon, RepeatIcon, ShuffleIcon, VolumeIcon } from "../icons";
import { usePlayer, type Track } from "./PlayerProvider";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const icon = "relative grid size-8 place-items-center rounded-full text-muted transition hover:scale-[1.06] hover:text-ink disabled:opacity-40 disabled:hover:scale-100";
// a green dot under shuffle / repeat when they are on
const on = "!text-brand after:absolute after:-bottom-0.5 after:size-1 after:rounded-full after:bg-brand";

/** Bottom bar: now playing + add (left), shuffle · prev · play · next · repeat + scrubber (center), chords · queue · volume (right). */
export function PlayerBar() {
  const p = usePlayer();
  const t = p.track;
  const dur = p.duration || 30;
  const pct = `${(p.time / dur) * 100}%`;
  const nextRepeat = { off: "all", all: "one", one: "off" } as const;

  return (
    <section aria-label="Pemutar preview" className="relative flex h-16 items-center gap-3 rounded-lg bg-[#181818] px-2 lg:h-[72px] lg:rounded-none lg:bg-app lg:px-2">
      {/* now playing */}
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:w-[30%] lg:flex-none">
        <span className="grid size-12 shrink-0 place-items-center overflow-clip rounded bg-surface-2 text-muted lg:size-14">
          {t?.artwork_url ? <Image src={t.artwork_url} alt="" width={56} height={56} className="size-full object-cover" /> : <NoteIcon className="size-5" />}
        </span>
        <span className="min-w-0">
          {t ? (
            <>
              <Link href={`/songs/${t.slug}`} className="block truncate text-sm font-semibold hover:underline">{t.title}</Link>
              <span className="block truncate text-xs text-muted">{p.error ?? (t.artist || "Tanpa nama penyanyi")}</span>
            </>
          ) : (
            <span className="block text-sm text-muted">Pilih lagu untuk memutar preview</span>
          )}
        </span>
        {t && <AddToSetlist song={t} size="sm" className="ml-1" />}
      </div>

      {/* transport */}
      <div className="flex shrink-0 flex-col items-center gap-1 lg:flex-1">
        <div className="flex items-center gap-2 lg:gap-4">
          <button type="button" onClick={() => p.setShuffle(!p.shuffle)} disabled={!t} aria-pressed={p.shuffle} aria-label="Acak" title="Acak" className={`${icon} hidden lg:grid ${p.shuffle ? on : ""}`}>
            <ShuffleIcon className="size-[18px]" />
          </button>
          <button type="button" onClick={p.prev} disabled={!t} aria-label="Sebelumnya" title="Sebelumnya" className={`${icon} hidden lg:grid`}>
            <PrevIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={p.toggle}
            disabled={!t || !!p.error}
            aria-label={p.playing ? "Jeda" : "Putar"}
            className="grid size-10 place-items-center rounded-full bg-ink text-app transition hover:scale-[1.06] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 lg:size-8"
          >
            {p.playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </button>
          <button type="button" onClick={p.next} disabled={!t || (p.queue.length < 2 && p.repeat === "off")} aria-label="Berikutnya" title="Berikutnya" className={`${icon} hidden lg:grid`}>
            <NextIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => p.setRepeat(nextRepeat[p.repeat])}
            disabled={!t}
            aria-label={{ off: "Ulangi", all: "Ulangi satu lagu", one: "Matikan ulangi" }[p.repeat]}
            title={{ off: "Ulangi", all: "Ulangi satu lagu", one: "Matikan ulangi" }[p.repeat]}
            className={`${icon} hidden lg:grid ${p.repeat !== "off" ? on : ""}`}
          >
            <RepeatIcon one={p.repeat === "one"} className="size-[18px]" />
          </button>
        </div>
        <div className="hidden w-full max-w-[600px] items-center gap-2 text-[11px] tabular-nums text-muted lg:flex">
          <span className="w-9 text-right">{mmss(p.time)}</span>
          <input
            type="range"
            min={0}
            max={dur}
            step={0.1}
            value={Math.min(p.time, dur)}
            onChange={(e) => p.seek(Number(e.target.value))}
            disabled={!t}
            aria-label="Posisi lagu"
            aria-valuetext={`${mmss(p.time)} dari ${mmss(dur)}`}
            className="range flex-1"
            style={{ ["--fill" as string]: pct }}
          />
          <span className="w-9">{mmss(dur)}</span>
        </div>
      </div>

      {/* chords · queue · volume */}
      <div className="hidden w-[30%] items-center justify-end gap-1 pr-2 text-muted lg:flex">
        {t && (
          <Suspense fallback={<ChordButton slug={t.slug} here={false} />}>
            <LiveChordButton slug={t.slug} />
          </Suspense>
        )}
        <Popover label="Antrean" buttonClass={`${icon} data-[open]:!text-brand`} button={<QueueIcon className="size-[18px]" />} panelClass="w-80">
          {() => <Queue />}
        </Popover>
        <button type="button" onClick={() => p.setVolume(p.volume ? 0 : 0.8)} aria-label={p.volume ? "Bisukan" : "Nyalakan suara"} className={icon}>
          <VolumeIcon muted={!p.volume} className="size-5" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p.volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="range w-24 xl:w-28"
          style={{ ["--fill" as string]: `${p.volume * 100}%` }}
        />
      </div>

      {/* phone: thin progress line along the bottom of the mini bar */}
      <span aria-hidden className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 overflow-clip rounded-full bg-white/20 lg:hidden">
        <span className="block h-full bg-ink" style={{ width: pct }} />
      </span>
    </section>
  );
}

function LiveChordButton({ slug }: { slug: string }) {
  return <ChordButton slug={slug} here={usePathname() === `/songs/${slug}`} />;
}

/** Like a lyrics button: opens the playing song at its chord sheet; green when that page is open, then it just scrolls there. */
function ChordButton({ slug, here }: { slug: string; here: boolean }) {
  return (
    <Link
      href={`/songs/${slug}#chords`}
      onClick={(e) => {
        if (!here) return;
        e.preventDefault();
        document.getElementById("chords")?.scrollIntoView({ behavior: "smooth" });
      }}
      aria-current={here ? "page" : undefined}
      aria-label="Buka chord lagu ini"
      title="Buka chord"
      className={`${icon} ${here ? on : ""}`}
    >
      <ChordIcon className="size-[18px]" />
    </Link>
  );
}

/** Now playing + what comes next; pick one to jump to it. */
function Queue() {
  const p = usePlayer();
  const row = (t: Track, i: number, now = false) => (
    <li key={`${t.id}-${i}`}>
      <button type="button" onClick={() => p.jump(i)} className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-white/10">
        <span className="grid size-10 shrink-0 place-items-center overflow-clip rounded bg-surface-2 text-muted">
          {t.artwork_url ? <Image src={t.artwork_url} alt="" width={40} height={40} className="size-full object-cover" /> : <NoteIcon className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-sm font-semibold ${now ? "text-brand" : ""}`}>{t.title}</span>
          <span className="block truncate text-xs text-muted">{t.artist || "Tanpa nama penyanyi"}</span>
        </span>
      </button>
    </li>
  );
  const up = p.queue.map((t, i) => [t, i] as const).slice(p.index + 1);
  return (
    <div className="p-2">
      <p className="px-2 pb-2 font-bold">Antrean</p>
      {p.track ? (
        <>
          <p className="px-2 pb-1 text-xs font-bold text-muted">Sedang diputar</p>
          <ul>{row(p.track, p.index, true)}</ul>
          <p className="px-2 pb-1 pt-3 text-xs font-bold text-muted">Berikutnya</p>
          {up.length ? <ul>{up.map(([t, i]) => row(t, i))}</ul> : <p className="px-2 py-2 text-sm text-muted">Tidak ada lagu berikutnya. Putar dari daftar lagu, atau pilih “Tambahkan ke antrean” di menu ⋯.</p>}
        </>
      ) : (
        <p className="px-2 py-2 text-sm text-muted">Antrean masih kosong.</p>
      )}
    </div>
  );
}
