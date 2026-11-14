import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 24 24", "aria-hidden": true, ...p });

// optically centred: the triangle's weight sits left of its box, so the box is nudged a little right of the middle (≈ +5%)
export const PlayIcon = (p: P) => <svg {...base(p)} fill="currentColor"><path d="M6.3 4.6v14.8a1 1 0 0 0 1.5.9l12-7.4a1 1 0 0 0 0-1.8l-12-7.4a1 1 0 0 0-1.5.9Z" /></svg>;
export const PauseIcon = (p: P) => <svg {...base(p)} fill="currentColor"><rect x="5.5" y="4" width="4.5" height="16" rx="1.2" /><rect x="14" y="4" width="4.5" height="16" rx="1.2" /></svg>;
export const HomeIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" /></svg>
);
export const SearchIcon = (p: P) => <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.5-4.5" /></svg>;
export const LibraryIcon = (p: P) => <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 3v18M10 3v18M15 4l5 16.5" /></svg>;
export const PlusIcon = (p: P) => <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
export const ChordIcon = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 8h14M9.5 3v18M14.5 3v18" /><circle cx="9.5" cy="12" r="1.6" fill="currentColor" /><circle cx="14.5" cy="15.5" r="1.6" fill="currentColor" /></svg>
);
export const NoteIcon = (p: P) => <svg {...base(p)} fill="currentColor"><path d="M9 18.5a3 3 0 1 1-2-2.83V5l12-2v12.5a3 3 0 1 1-2-2.83V6.4L9 7.8v10.7Z" /></svg>;
export const VolumeIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {muted ? <path d="m16 9.5 5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
  </svg>
);
export const LogoutIcon = (p: P) => <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" /></svg>;
export const ChevronIcon = ({ dir = "left", ...p }: P & { dir?: "left" | "right" }) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={dir === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} /></svg>
);

/** Echord mark: a guitar pick pointing right (it is also a play button) with one echo arc behind it: ech(o) + chord. */
export const MARK_PATHS = {
  pick: "M13.2 6.5c-4.1 0-6.7 3.6-6.7 9.5s2.6 9.5 6.7 9.5c3.3 0 9.3-4.6 12.6-8 .8-.8.8-2.2 0-3-3.3-3.4-9.3-8-12.6-8Z",
  echo: "M5 8.2C2.9 10.4 2 13 2 16s.9 5.6 3 7.8",
};
export function Mark({ className = "size-8", tile = false }: { className?: string; tile?: boolean }) {
  const glyph = (
    <>
      <path d={MARK_PATHS.pick} fill="currentColor" />
      <path d={MARK_PATHS.echo} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
  if (!tile) return <svg viewBox="0 0 32 32" className={`text-brand ${className}`} aria-hidden>{glyph}</svg>;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--green)" />
      <g transform="translate(4.6 4.5) scale(.72)" color="#000">{glyph}</g>
    </svg>
  );
}
export const TrashIcon = (p: P) => <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>;
const line = (p: P) => ({ ...base(p), fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
export const ShuffleIcon = (p: P) => <svg {...line(p)}><path d="M16 4h4v4M4 18h3.5a4 4 0 0 0 3.3-1.7l3.4-4.6A4 4 0 0 1 17.5 10H20M16 20h4v-4M20 4l-4 4M4 6h3.5a4 4 0 0 1 2.9 1.2M20 20l-3-3M14 17.4a4 4 0 0 0 3.5 2.6H20" /></svg>;
export const PrevIcon = (p: P) => <svg {...base(p)} fill="currentColor"><rect x="4" y="4" width="2.6" height="16" rx="1" /><path d="M20 5.2v13.6a1 1 0 0 1-1.6.8L9 12.8a1 1 0 0 1 0-1.6l9.4-6.8a1 1 0 0 1 1.6.8Z" /></svg>;
export const NextIcon = (p: P) => <svg {...base(p)} fill="currentColor"><rect x="17.4" y="4" width="2.6" height="16" rx="1" /><path d="M4 5.2v13.6a1 1 0 0 0 1.6.8l9.4-6.8a1 1 0 0 0 0-1.6L5.6 4.4A1 1 0 0 0 4 5.2Z" /></svg>;
export const RepeatIcon = ({ one, ...p }: P & { one?: boolean }) => (
  <svg {...line(p)}><path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4" />{one && <text x="12" y="14.5" fontSize="7" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none">1</text>}</svg>
);
export const PlusCircleIcon = (p: P) => <svg {...line(p)} strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
export const CheckCircleIcon = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="10" fill="var(--green)" /><path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export const DotsIcon = (p: P) => <svg {...base(p)} fill="currentColor"><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></svg>;
export const QueueIcon = (p: P) => <svg {...line(p)}><path d="M3 5h12M3 10h12M3 15h7M15 15v5a2 2 0 1 0 2-2h-2M17 13l4-1" /></svg>;
export const QueueAddIcon = (p: P) => <svg {...line(p)}><path d="M3 6h12M3 11h12M3 16h8M18 13v8M14 17h8" /></svg>;
export const UserIcon = (p: P) => <svg {...line(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const LinkIcon = (p: P) => <svg {...line(p)}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>;
export const CloseIcon = (p: P) => <svg {...line(p)} strokeWidth={2.2}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const ExpandIcon = (p: P) => <svg {...line(p)}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
export const ArrowRightIcon = (p: P) => <svg {...line(p)} strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const MinusIcon = (p: P) => <svg {...line(p)} strokeWidth={2.4}><path d="M5 12h14" /></svg>;
export const CopyIcon = (p: P) => <svg {...line(p)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
export const PencilIcon = (p: P) => <svg {...line(p)}><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>;
export const ColumnsIcon = (p: P) => <svg {...line(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>;
