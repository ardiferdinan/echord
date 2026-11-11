import { Suspense } from "react";
import { connection } from "next/server";
import { searchSongs } from "@/lib/db";
import { Hero } from "@/components/Hero";
import { SearchPill } from "@/components/Frame";
import { SongPanelSkeleton, SongPanelView } from "@/components/SongPanel";

export default function Home() {
  return (
    <div className="p-3 sm:p-4">
      <Hero
        search={<SearchPill />}
        songs={
          <Suspense fallback={<SongPanelSkeleton />}>
            <SongPanel />
          </Suspense>
        }
      />
    </div>
  );
}

async function SongPanel() {
  await connection();
  const res = await searchSongs("", 12).then(
    (songs) => ({ songs, error: undefined }),
    (e: Error) => ({ songs: [], error: e.message }),
  );
  return <SongPanelView songs={res.songs} error={res.error} />;
}
