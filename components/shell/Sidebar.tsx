"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uid, useHydrated, useSetlists } from "@/lib/storage";
import { ActiveLink } from "../NavLink";
import { ChordIcon, HomeIcon, LibraryIcon, Mark, PlusIcon, SearchIcon } from "../icons";
import { Mosaic } from "./Mosaic";

const nav = (on: boolean) => `flex h-10 items-center gap-4 rounded-md px-3 font-bold transition ${on ? "text-ink" : "text-muted hover:text-ink"}`;
const item = (on: boolean) => `flex items-center gap-3 rounded-md p-2 transition ${on ? "bg-[#232323]" : "hover:bg-[#1a1a1a]"}`;

/** Desktop sidebar: navigation on top, the library (setlists + chord dictionary) below. */
export function Sidebar() {
  const [setlists, setSetlists] = useSetlists();
  const hydrated = useHydrated();
  const router = useRouter();
  const create = () => {
    const id = uid();
    setSetlists((p) => [{ id, name: "Setlist baru", items: [], updatedAt: Date.now() }, ...p]);
    router.push(`/setlists/${id}`);
  };
  const sorted = hydrated ? [...setlists].sort((a, b) => b.updatedAt - a.updatedAt) : [];

  return (
    <nav aria-label="Navigasi utama" className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
      <div className="rounded-lg bg-panel px-3 py-4">
        <Link href="/" className="mb-3 flex items-center gap-2 px-3" aria-label="Echord beranda">
          <Mark className="size-8" />
          <span className="text-xl font-black tracking-[-0.03em]">echord</span>
        </Link>
        <ActiveLink href="/" exact className={nav}>{(on) => <><HomeIcon filled={on} className="size-6" /> Beranda</>}</ActiveLink>
        <ActiveLink href="/search" className={nav}>{() => <><SearchIcon className="size-6" /> Cari</>}</ActiveLink>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-panel">
        <div className="flex items-center gap-2 px-6 pb-2 pt-4">
          <Link href="/setlists" className="flex flex-1 items-center gap-3 font-bold text-muted transition hover:text-ink">
            <LibraryIcon className="size-6" /> Pustakamu
          </Link>
          <button onClick={create} className="btn-icon size-8 sm:size-8" aria-label="Buat setlist baru" title="Buat setlist baru">
            <PlusIcon className="size-4" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          <li>
            <ActiveLink href="/chords" className={item}>
              {() => (
                <>
                  <span className="grid size-12 shrink-0 place-items-center rounded bg-gradient-to-br from-[#1ed760] to-[#0e6b30] text-black"><ChordIcon className="size-6" /></span>
                  <span className="min-w-0"><span className="block truncate font-semibold">Kamus chord</span><span className="block truncate text-sm text-muted">Gitar dan piano</span></span>
                </>
              )}
            </ActiveLink>
          </li>
          {sorted.map((s) => (
            <li key={s.id}>
              <ActiveLink href={`/setlists/${s.id}`} className={item}>
                {(on) => (
                  <>
                    <Mosaic covers={s.items.map((i) => i.artwork)} />
                    <span className="min-w-0">
                      <span className={`block truncate font-semibold ${on ? "text-brand" : ""}`}>{s.name}</span>
                      <span className="block truncate text-sm text-muted">Setlist · {s.items.length} lagu</span>
                    </span>
                  </>
                )}
              </ActiveLink>
            </li>
          ))}
          {hydrated && !setlists.length && (
            <li className="m-2 rounded-lg bg-[#1f1f1f] p-4">
              <p className="font-bold">Buat setlist pertamamu</p>
              <p className="mt-1 text-sm text-muted">Susun lagu untuk ibadah atau latihan band.</p>
              <button onClick={create} className="btn btn-dark mt-4 h-8 px-4 text-sm sm:h-8">Buat setlist</button>
            </li>
          )}
        </ul>
        <div className="border-t border-line p-2">
          <ActiveLink href="/admin/new" className={item}>
            {() => (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded bg-[#2a2a2a] text-muted"><PlusIcon className="size-5" /></span>
                <span className="font-semibold">Tambah lagu</span>
              </>
            )}
          </ActiveLink>
        </div>
      </div>
    </nav>
  );
}
