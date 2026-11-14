"use client";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { transposeKey } from "@/lib/chordpro";
import { useHydrated, useSetlists, type SetlistItem } from "@/lib/storage";
import { ChordSheet } from "@/components/ChordSheet";
import { arranged } from "@/components/SetlistEditor";

const BASE = 15; // px, about 11pt on paper

/** A4 sheets, one song per page; a long song goes to two columns and shrinks until it fits. */
export function PrintSetlist({ id }: { id: string }) {
  const [setlists] = useSetlists();
  const hydrated = useHydrated();
  const setlist = setlists.find((s) => s.id === id);
  if (!hydrated) return null;
  if (!setlist) return <p className="p-8 text-muted">Setlist tidak ditemukan di browser ini.</p>;

  return (
    <div className="print-root min-h-svh bg-[#3a3a3a] pb-10">
      <div className="print-hide sticky top-0 z-10 flex items-center gap-3 bg-panel px-4 py-3">
        <Link href={`/setlists/${id}`} className="btn h-10">Kembali</Link>
        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          {setlist.name} · {setlist.items.length} lagu · satu lagu per lembar A4
        </p>
        <button type="button" onClick={() => print()} className="btn btn-primary h-10">Cetak / simpan PDF</button>
      </div>
      {setlist.items.map((item, n) => (
        <Page key={item.id} item={item} n={n + 1} total={setlist.items.length} setName={setlist.name} />
      ))}
    </div>
  );
}

function Page({ item, n, total, setName }: { item: SetlistItem; n: number; total: number; setName: string }) {
  const body = useRef<HTMLDivElement>(null);
  const key = item.originalKey ? transposeKey(item.originalKey, item.transpose) : null;
  const sections = arranged(item);

  // fit: one column if it fits, else two columns, then smaller text until nothing spills past the page
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const sheet = el.firstElementChild as HTMLElement;
    let font = BASE;
    // "" = not a multi-column box at all (with column-count 1 the overflow would spill into extra columns sideways)
    const set = (cols: number) => {
      el.style.columnCount = cols > 1 ? String(cols) : "";
      sheet.style.fontSize = `${font}px`;
    };
    const spills = () => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    set(1);
    if (!spills()) return;
    set(2);
    while (spills() && font > 9) {
      font -= 0.5;
      set(2);
    }
  }, [item]);

  return (
    <article className="print-page mx-auto mt-8 flex flex-col bg-white text-[#111] shadow-2xl">
      <header className="mb-[5mm] flex items-end justify-between gap-4 border-b-2 border-[#111] pb-[3mm]">
        <div className="min-w-0">
          <h1 className="text-[22px] font-black leading-tight tracking-[-0.02em]">{item.title}</h1>
          <p className="mt-1 text-[12px] text-[#444]">
            {item.artist}
            {item.notes && <> · {item.notes}</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {key && <p className="text-[20px] font-black">Kunci {key}</p>}
          <p className="text-[10px] text-[#666]">{setName} · {n}/{total}</p>
        </div>
      </header>
      <div ref={body} className="print-body min-h-0 flex-1 overflow-hidden">
        <ChordSheet sections={sections} fontSize={BASE} interactive={false} />
      </div>
    </article>
  );
}
