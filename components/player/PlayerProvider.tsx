"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Repeat = "off" | "all" | "one";
export type Track = { id: number; slug: string; title: string; artist: string | null; artwork_url?: string | null };

type Player = {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
  queue: Track[];
  index: number;
  shuffle: boolean;
  repeat: Repeat;
  /** Play t; with a list, that list becomes the queue (next/previous walk it). */
  play: (t: Track, list?: Track[]) => void;
  cue: (t: Track) => void;
  next: () => void;
  prev: () => void;
  jump: (i: number) => void;
  enqueue: (t: Track) => void;
  setShuffle: (on: boolean) => void;
  setRepeat: (r: Repeat) => void;
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
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");

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

  const play = (t: Track, list?: Track[]) => {
    const a = audio.current;
    if (a && current.current === t.id && a.src) return void (a.paused ? a.play() : a.pause());
    const q = list?.some((x) => x.id === t.id) ? list : [t];
    setQueue(q);
    setIndex(q.findIndex((x) => x.id === t.id));
    load(t);
  };

  /** Opening a song page: start that song unless it is already the one loaded. */
  const cue = (t: Track) => {
    if (current.current === t.id) return;
    const i = queue.findIndex((x) => x.id === t.id); // opened from the queue: stay in it
    if (i >= 0) setIndex(i);
    else {
      setQueue([t]);
      setIndex(0);
    }
    load(t);
  };

  const jump = (i: number) => {
    if (!queue[i]) return;
    setIndex(i);
    load(queue[i]);
  };

  /** auto = the song ended by itself (repeat one replays it; at the end of the queue, stop unless repeat all). */
  const next = (auto = false) => {
    const a = audio.current;
    if (auto && repeat === "one" && a) return void ((a.currentTime = 0), a.play());
    if (shuffle && queue.length > 1) {
      let i = index;
      while (i === index) i = Math.floor(Math.random() * queue.length);
      return jump(i);
    }
    if (index + 1 < queue.length) return jump(index + 1);
    if (repeat !== "off" && queue.length) return jump(0);
    if (auto) setPlaying(false);
  };

  /** Back to the start of the song, or to the previous one in the first 3 seconds. */
  const prev = () => {
    const a = audio.current;
    if (a && (a.currentTime > 3 || index === 0)) return void (a.currentTime = 0);
    jump(index - 1);
  };

  /** "Add to queue": plays next, right after the current song. */
  const enqueue = (t: Track) => {
    if (!track) return play(t);
    setQueue((q) => [...q.slice(0, index + 1), t, ...q.slice(index + 1)]);
  };

  const value: Player = {
    track,
    playing,
    loading,
    error,
    time,
    duration,
    volume,
    queue,
    index,
    shuffle,
    repeat,
    play,
    cue,
    next: () => next(),
    prev,
    jump,
    enqueue,
    setShuffle,
    setRepeat,
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
        onEnded={() => next(true)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 30)}
        hidden
      />
    </Ctx.Provider>
  );
}
