import { Suspense } from "react";
import { SharedSetlist } from "@/components/SharedSetlist";
import { loadShared } from "./data";

export default function SharedPage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-2" />}>
      {Promise.all([loadShared(params), params]).then(([s, p]) => <SharedSetlist setlist={s} shareId={p.id} />)}
    </Suspense>
  );
}
