import { Suspense } from "react";
import { ChordLibrary } from "@/components/ChordLibrary";

export const metadata = { title: "Kamus chord gitar & piano" };

export default function ChordsPage() {
  return (
    <Suspense>
      <ChordLibrary />
    </Suspense>
  );
}
