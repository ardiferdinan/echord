"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { transposeKey } from "@/lib/chordpro";
import { uid, useHydrated, useSetlists, type Setlist } from "@/lib/storage";
import { ChordSheet } from "./ChordSheet";
import { arranged } from "./SetlistEditor";

export function SharedSetlist({ setlist, shareId }: { setlist: Setlist; shareId: string }) {
  const [mine, setMine] = useSetlists();
  const hydrated = useHydrated();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const own = hydrated ? mine.find((s) => s.share?.id === shareId) : undefined;

  const saveCopy = () => {
    const id = uid();
    setMine((p) => [{ ...setlist, id, share: undefined, sharedAt: undefined, updatedAt: Date.now() }, ...p]);
    router.push(`/setlists/${id}`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">Setlist dibagikan</p>
          <h1 className="display text-4xl sm:text-5xl">{setlist.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {setlist.date ? new Date(setlist.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) + " · " : ""}
            {setlist.items.length} lagu · diperbarui {new Date(setlist.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        {own ? (
          <Link href={`/setlists/${own.id}`} className="btn">✎ Edit (setlist kamu)</Link>
        ) : (
          <button className="btn" onClick={saveCopy}>Simpan salinan</button>
        )}
        <Link href={`/s/${shareId}/play`} className="btn btn-primary px-4 py-2">▶ Stage mode</Link>
      </div>

      <ol className="space-y-2">
        {setlist.items.map((item, n) => {
          const sections = arranged(item);
          const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : null;
          return (
            <li key={item.id} className="card">
              <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}>
                <span className="w-5 text-right text-sm tabular-nums text-muted">{n + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted">{sections.map((s) => s.label).join(" → ")}</span>
                </span>
                {key && <span className="rounded-md bg-accent-soft px-2 py-1 text-sm font-bold text-accent">{key}</span>}
              </button>
              {open === item.id && (
                <div className="border-t border-line p-4">
                  {item.notes && <p className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm">📝 {item.notes}</p>}
                  <ChordSheet sections={sections} fontSize={16} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
