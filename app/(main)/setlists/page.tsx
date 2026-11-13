"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uid, useHydrated, useSetlists } from "@/lib/storage";
import { Mosaic } from "@/components/shell/Mosaic";
import { PlayIcon, PlusIcon } from "@/components/icons";

export default function SetlistsPage() {
  const [setlists, setSetlists] = useSetlists();
  const mounted = useHydrated();
  const router = useRouter();
  const create = () => {
    const id = uid();
    setSetlists((p) => [{ id, name: "Setlist baru", items: [], updatedAt: Date.now() }, ...p]);
    router.push(`/setlists/${id}`);
  };
  const sorted = mounted ? [...setlists].sort((a, b) => b.updatedAt - a.updatedAt) : [];

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Setlist</h1>
          <p className="mt-1 text-sm text-muted">Tersimpan di browser ini. Bagikan link supaya band bisa membukanya.</p>
        </div>
        <button onClick={create} className="btn btn-dark"><PlusIcon className="size-4" /> Setlist baru</button>
      </div>

      {mounted && !setlists.length && (
        <div className="mt-10 rounded-lg bg-card p-8 text-center">
          <p className="text-xl font-bold">Belum ada setlist</p>
          <p className="mt-2 text-muted">Buat setlist baru, atau buka lagu lalu tekan tombol + di sebelah tombol putar.</p>
        </div>
      )}

      <ul className="-mx-3 mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
        {sorted.map((s) => (
          <li key={s.id} className="play-host group relative rounded-lg p-3 transition hover:bg-card-hover focus-within:bg-card-hover">
            <div className="relative">
              <Mosaic covers={s.items.map((i) => i.artwork)} className="aspect-square w-full shadow-lg shadow-black/40" rounded="rounded-md" />
              {s.items.length > 0 && (
                <Link href={`/setlists/${s.id}/play`} aria-label={`Mulai stage ${s.name}`} className="play-pop absolute bottom-2 right-2 z-10 grid size-12 place-items-center rounded-full bg-brand text-on-brand shadow-lg shadow-black/40 transition hover:scale-[1.06]">
                  <PlayIcon className="size-5 translate-x-[1px]" />
                </Link>
              )}
            </div>
            <Link href={`/setlists/${s.id}`} className="mt-3 block truncate font-bold after:absolute after:inset-0 after:rounded-lg">{s.name}</Link>
            <p className="mt-1 truncate text-sm text-muted">
              {s.date ? new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " · " : ""}
              {s.items.length} lagu
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
