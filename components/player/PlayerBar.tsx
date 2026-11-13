"use client";
import Image from "next/image";
import Link from "next/link";
import { NoteIcon, PauseIcon, PlayIcon, VolumeIcon } from "../icons";
import { usePlayer } from "./PlayerProvider";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Bottom bar: now playing (left), transport + scrubber (center), volume (right). Mini bar on phones. */
export function PlayerBar() {
  const p = usePlayer();
  const t = p.track;
  const dur = p.duration || 30;
  const pct = `${(p.time / dur) * 100}%`;

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
      </div>

      {/* transport */}
      <div className="flex shrink-0 flex-col items-center gap-1 lg:flex-1">
        <button
          type="button"
          onClick={p.toggle}
          disabled={!t || !!p.error}
          aria-label={p.playing ? "Jeda" : "Putar"}
          className="grid size-10 place-items-center rounded-full bg-ink text-app transition hover:scale-[1.06] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 lg:size-8"
        >
          {p.playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4 translate-x-[1px]" />}
        </button>
        <div className="hidden w-full max-w-[560px] items-center gap-2 text-[11px] tabular-nums text-muted lg:flex">
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

      {/* volume */}
      <div className="hidden w-[30%] items-center justify-end gap-2 pr-2 text-muted lg:flex">
        <button type="button" onClick={() => p.setVolume(p.volume ? 0 : 0.8)} aria-label={p.volume ? "Bisukan" : "Nyalakan suara"} className="btn-icon size-8 sm:size-8">
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
          className="range w-28"
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
