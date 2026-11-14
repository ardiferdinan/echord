"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { ChevronIcon, LogoutIcon, Mark, SearchIcon } from "../icons";

/** Sticky bar at the top of the main panel: history arrows, the search pill, sign out. */
export function TopBar() {
  const router = useRouter();
  // transparent over the page header, solid once the main panel scrolls
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const el = document.getElementById("content");
    if (!el) return;
    const on = () => setSolid(el.scrollTop > 48);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  const arrow = "hidden size-8 place-items-center rounded-full bg-black/70 text-ink transition hover:scale-[1.06] lg:grid";
  return (
    <header className={`sticky top-0 z-30 flex h-16 items-center gap-2 px-4 transition-colors duration-300 sm:px-6 ${solid ? "bg-[#101010]/95 backdrop-blur-md" : "bg-transparent"}`}>
      <Link href="/" className="lg:hidden" aria-label="Echord beranda"><Mark tile className="size-9" /></Link>
      <button onClick={() => router.back()} className={arrow} aria-label="Kembali"><ChevronIcon className="size-4" /></button>
      <button onClick={() => router.forward()} className={arrow} aria-label="Maju"><ChevronIcon dir="right" className="size-4" /></button>
      <Suspense fallback={<Search q="" />}>
        <SearchFromUrl />
      </Suspense>
      <form action={logout} className="ml-auto">
        <button className="grid size-10 place-items-center rounded-full bg-black/70 text-muted transition hover:scale-[1.06] hover:text-ink" aria-label="Keluar" title="Keluar">
          <LogoutIcon className="size-5" />
        </button>
      </form>
    </header>
  );
}

function SearchFromUrl() {
  return <Search q={useSearchParams().get("q") ?? ""} />;
}

/** Search as you type, like a music app: results update on /search while typing, Enter goes at once. */
function Search({ q }: { q: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // follow the URL (back button, links) but never overwrite what is being typed
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = q;
  }, [q]);
  const go = (v: string, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const url = v.trim() ? `/search?q=${encodeURIComponent(v.trim())}` : "/search";
      if (window.location.pathname === "/search") router.replace(url, { scroll: false });
      else router.push(url);
    }, delay);
  };
  return (
    <form
      action="/search"
      role="search"
      onSubmit={(e) => { e.preventDefault(); go(input.current?.value ?? "", 0); }}
      className="group ml-1 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#1f1f1f] px-4 ring-white/80 transition hover:bg-[#2a2a2a] focus-within:ring-2 sm:max-w-[420px] lg:ml-3 lg:h-12"
    >
      <SearchIcon className="size-5 shrink-0 text-muted group-focus-within:text-ink" />
      <input
        ref={input}
        type="search"
        name="q"
        defaultValue={q}
        onChange={(e) => go(e.target.value, 300)}
        onFocus={() => window.location.pathname !== "/search" && !input.current?.value && router.push("/search")}
        placeholder="Mau main lagu apa?"
        aria-label="Cari lagu atau penyanyi"
        autoComplete="off"
        className="search-input min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted sm:text-[15px]"
      />
    </form>
  );
}
