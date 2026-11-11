import type { ReactNode } from "react";
import { Blob } from "./Blob";
import { Brand, NavLinks } from "./Nav";

/** Glass search pill that sits in the frame's top cut. Submits to the home song panel. */
export function SearchPill({ q = "" }: { q?: string }) {
  return (
    <form action="/" className="glass flex h-14 items-center gap-3 rounded-full border border-line px-5 text-ink shadow-xl shadow-black/10 sm:h-16 sm:px-6">
      <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        name="q"
        defaultValue={q}
        placeholder="Cari lagu…"
        aria-label="Cari judul atau penyanyi"
        className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
      />
    </form>
  );
}

/**
 * The blue "blobby" frame shared by every page: search pill biting into the top edge,
 * logo + menu in the shoulders on md+ (above the frame on phones).
 */
export function Frame({ search, className = "", children }: { search: ReactNode; className?: string; children: ReactNode }) {
  return (
    <>
      {/* phones: shoulders are too narrow for the nav, so it sits above the frame */}
      <div className="mb-3 flex h-14 items-center justify-between px-1 md:hidden">
        <Brand />
        <NavLinks />
      </div>
      <Blob
        fill="var(--brand)"
        radius={40}
        gap={12}
        className={`text-on-brand ${className}`}
        slots={{ t: { node: <div className="w-[min(480px,calc(100vw-136px))] md:w-[clamp(240px,calc(100vw-820px),480px)]">{search}</div> } }}
      >
        <div className="absolute inset-x-5 top-0 z-10 hidden h-[76px] items-center justify-between md:flex lg:inset-x-8">
          <Brand onBrand />
          <NavLinks onBrand />
        </div>
        {children}
      </Blob>
    </>
  );
}
