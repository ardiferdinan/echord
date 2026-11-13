import Image from "next/image";
import { NoteIcon } from "../icons";

/** Playlist-style cover: one image, or a 2×2 grid of the first four covers. */
export function Mosaic({ covers, className = "size-12", rounded = "rounded" }: { covers: (string | null | undefined)[]; className?: string; rounded?: string }) {
  const c = [...new Set(covers.filter((x): x is string => !!x))];
  if (!c.length)
    return (
      <span className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#3a3a3a] to-[#1d1d1d] text-muted ${rounded} ${className}`}>
        <NoteIcon className="size-1/3" />
      </span>
    );
  if (c.length < 4)
    return (
      <span className={`relative shrink-0 overflow-clip ${rounded} ${className}`}>
        <Image src={c[0]} alt="" fill sizes="240px" className="object-cover" />
      </span>
    );
  return (
    <span className={`grid shrink-0 grid-cols-2 overflow-clip ${rounded} ${className}`}>
      {c.slice(0, 4).map((src) => (
        <span key={src} className="relative">
          <Image src={src} alt="" fill sizes="120px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}
