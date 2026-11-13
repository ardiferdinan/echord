"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Track = { id: number; slug: string; title: string; artist: string | null; artwork_url?: string | null };

type Player = {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
  play: (t: Track) => void;
  cue: (t: Track) => void;
  toggle: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
};

const Ctx = createContext<Player | null>(null);
export const usePlayer = () => useContext(Ctx)!;

/** One <audio> for the whole app shell, so a preview keeps playing while you browse. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(0.8);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  const current = useRef<number | null>(null);

  /** Fetch the preview for t and start it. A browser that blocks autoplay leaves it loaded and paused (the bar's play button starts it). */
  const load = async (t: Track) => {
    const a = audio.current;
    if (!a) return;
    current.current = t.id;
    setTrack(t);
    setError(null);
    setLoading(true);
    setTime(0);
    try {
      const res = await fetch(`/api/preview/${t.id}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (current.current !== t.id) return; // another song was picked meanwhile
      if (!data.url) throw new Error(data.error ?? "Preview tidak tersedia");
      a.src = data.url;
      await a.play().catch((e: Error) => {
        if (e.name !== "NotAllowedError") throw e;
      });
    } catch (e) {
      if (current.current !== t.id) return;
      setError((e as Error).message || "Preview gagal diputar");
      setPlaying(false);
    } finally {
      if (current.current === t.id) setLoading(false);
    }
  };

  const play = (t: Track) => {
    const a = audio.current;
    if (a && current.current === t.id && a.src) return void (a.paused ? a.play() : a.pause());
    load(t);
  };

  /** Opening a song page: start that song unless it is already the one loaded. */
  const cue = (t: Track) => {
    if (current.current !== t.id) load(t);
  };

  const value: Player = {
    track,
    playing,
    loading,
    error,
    time,
    duration,
    volume,
    play,
    cue,
    toggle: () => {
      const a = audio.current;
      if (!a?.src) return void (track && load(track));
      if (a.paused) a.play();
      else a.pause();
    },
    seek: (s) => {
      if (audio.current) audio.current.currentTime = s;
      setTime(s);
    },
    setVolume: setVol,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 30)}
        hidden
      />
    </Ctx.Provider>
  );
}
