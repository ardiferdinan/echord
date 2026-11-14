"use client";
import { PauseIcon, PlayIcon } from "../icons";
import { createContext, useContext, type ReactNode } from "react";
import { usePlayer, type Track } from "./PlayerProvider";

/** The list a play button sits in becomes the queue (one copy per list, not per row). */
const Scope = createContext<Track[] | undefined>(undefined);
export const QueueScope = ({ tracks, children }: { tracks: Track[]; children: ReactNode }) => <Scope.Provider value={tracks}>{children}</Scope.Provider>;

/** Green circle: plays the song's preview in the player bar, or pauses it when it is the one playing. */
export function PlayButton({ track, queue, size = "md", className = "" }: { track: Track; queue?: Track[]; size?: "sm" | "md" | "lg"; className?: string }) {
  const p = usePlayer();
  const scope = useContext(Scope);
  const current = p.track?.id === track.id;
  const on = current && (p.playing || p.loading);
  const dim = { sm: "size-9 [&_svg]:size-4", md: "size-12 [&_svg]:size-5", lg: "size-14 [&_svg]:size-6" }[size];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        p.play(track, queue ?? scope);
      }}
      aria-label={on ? `Jeda ${track.title}` : `Putar preview ${track.title}`}
      data-active={on}
      className={`grid shrink-0 place-items-center rounded-full bg-brand text-on-brand shadow-lg shadow-black/40 transition hover:scale-[1.06] hover:brightness-110 active:scale-95 ${dim} ${className}`}
    >
      {on ? <PauseIcon /> : <PlayIcon className="translate-x-[1px]" />}
    </button>
  );
}
