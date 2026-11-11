import { Suspense } from "react";
import { Stage } from "@/app/(main)/setlists/[id]/play/Stage";
import { loadShared } from "../data";

export default function SharedPlayPage({ params }: PageProps<"/s/[id]/play">) {
  return (
    <Suspense>
      {Promise.all([loadShared(params), params]).then(([s, p]) => <Stage setlist={s} backHref={`/s/${p.id}`} />)}
    </Suspense>
  );
}
