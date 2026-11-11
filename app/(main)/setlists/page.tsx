"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blob } from "@/components/Blob";
import { uid, useHydrated, useSetlists } from "@/lib/storage";

export default function SetlistsPage() {
  const [setlists, setSetlists] = useSetlists();
  const mounted = useHydrated();
  const router = useRouter();

  const create = () => {
    const id = uid();
    setSetlists((p) => [{ id, name: "Setlist baru", items: [], updatedAt: Date.now() }, ...p]);
    router.push(`/setlists/${id}`);
  };

  return (
    <div>
      <Blob
        fill="var(--brand)"
        radius={32}
        className="mb-8 min-h-[168px] p-6 pr-32 text-on-brand sm:min-h-[200px] sm:p-8 sm:pr-44"
        slots={{
          br: {
            node: (
              <button onClick={create} className="grid size-24 place-items-center rounded-3xl bg-dark text-on-dark transition hover:brightness-110 sm:size-32">
                <span className="text-center">
                  <span className="display block text-4xl sm:text-5xl">+</span>
                  <span className="font-display text-sm font-bold italic">Setlist baru</span>
                </span>
              </button>
            ),
          },
        }}
      >
        <span className="dots pointer-events-none absolute right-44 top-6 hidden h-24 w-40 opacity-50 sm:block" aria-hidden />
        <h1 className="display relative text-[clamp(32px,6vw,56px)] uppercase">Setlist</h1>
        <p className="relative mt-3 max-w-sm text-[15px] font-medium sm:text-base">Susun lagu untuk ibadah atau gig, atur alur tiap lagu, lalu bawa ke stage mode.</p>
        <p className="relative mt-1 text-sm opacity-80">Tersimpan di browser ini.</p>
      </Blob>

      {mounted && !setlists.length && (
        <div className="rounded-[28px] border border-dashed border-line p-10 text-center text-muted">
          Belum ada setlist. Buat baru, atau buka lagu lalu klik <b>+ Setlist</b>.
        </div>
      )}
      {/* asymmetric: the 2nd column (2 cols) / middle column (3 cols) floats lower; row gap > offset so cards never touch */}
      <ul className="grid gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-y-14 sm:pb-8 xl:grid-cols-3 [&>li]:sm:even:translate-y-8 xl:[&>li]:even:translate-y-0 xl:[&>li:nth-child(3n+2)]:translate-y-8">
        {mounted &&
          [...setlists]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((s, n) => (
              <li key={s.id} className="group relative">
                <Blob
                  fill="var(--surface-2)"
                  radius={24}
                  gap={8}
                  className={`p-5 sm:p-6 ${s.items.length ? "pb-20 sm:pb-20" : ""}`}
                  slots={{
                    tl: {
                      node: (
                        <span className="grid size-16 place-items-center rounded-2xl bg-brand text-on-brand" aria-hidden>
                          <span className="display text-2xl italic">{String(n + 1).padStart(2, "0")}</span>
                        </span>
                      ),
                    },
                    ...(s.items.length > 0 && {
                      br: {
                        node: (
                          <Link href={`/setlists/${s.id}/play`} className="grid h-14 w-28 place-items-center rounded-2xl bg-dark font-display text-base font-bold italic text-on-dark transition hover:brightness-110">
                            ▶ Stage
                          </Link>
                        ),
                      },
                    }),
                  }}
                >
                  <div className="flex min-h-[60px] flex-col justify-center pl-[72px] pr-10">
                    <Link href={`/setlists/${s.id}`} className="block after:absolute after:inset-0 after:rounded-3xl">
                      <span className="block truncate font-display text-xl font-black uppercase">{s.name}</span>
                    </Link>
                    <span className="mt-0.5 block text-sm text-muted">
                      {s.date ? new Date(s.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) + " · " : ""}
                      {s.items.length} lagu
                    </span>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {s.items.slice(0, 4).map((i) => (
                      <li key={i.id} className="max-w-40 truncate rounded-full bg-surface px-2.5 py-1 text-xs font-medium">{i.title}</li>
                    ))}
                    {s.items.length > 4 && <li className="px-1 py-1 text-xs text-muted">+{s.items.length - 4}</li>}
                  </ul>
                  <button
                    onClick={() => confirm(`Hapus setlist "${s.name}"?`) && setSetlists((p) => p.filter((x) => x.id !== s.id))}
                    className="absolute right-3 top-3 z-10 grid size-11 sm:size-10 place-items-center rounded-full text-muted opacity-0 hover:bg-hot-soft hover:text-hot focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={`Hapus ${s.name}`}
                  >
                    ✕
                  </button>
                </Blob>
              </li>
            ))}
      </ul>
    </div>
  );
}
