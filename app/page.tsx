import { Suspense } from "react";
import { connection } from "next/server";
import { searchSongs } from "@/lib/db";
import { Hero } from "@/components/Hero";
import { SearchPill } from "@/components/Frame";
import { SongPanelSkeleton, SongPanelView } from "@/components/SongPanel";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="p-3 sm:p-4">
      <Hero
        search={
          <Suspense fallback={<SearchPill q="" />}>
            {searchParams.then((p) => <SearchPill q={String(p.q ?? "")} />)}
          </Suspense>
        }
        songs={
          <Suspense fallback={<SongPanelSkeleton />}>
            <SongPanel searchParams={searchParams} />
          </Suspense>
        }
      />
    </div>
  );
}


async function SongPanel({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await connection();
  const q = String((await searchParams).q ?? "");
  const res = await searchSongs(q).then(
    (songs) => ({ songs, error: undefined }),
    (e: Error) => ({ songs: [], error: e.message }),
  );
  return <SongPanelView songs={res.songs} q={q} error={res.error} />;
}
