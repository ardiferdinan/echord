import { Suspense } from "react";
import { SetlistEditor } from "@/components/SetlistEditor";

export default function SetlistPage({ params }: PageProps<"/setlists/[id]">) {
  return <Suspense>{params.then((p) => <SetlistEditor id={p.id} />)}</Suspense>;
}
