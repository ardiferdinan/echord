import { Suspense } from "react";
import { PrintSetlist } from "./PrintSetlist";

export const metadata = { title: "Cetak setlist" };

export default function PrintPage({ params }: PageProps<"/setlists/[id]/print">) {
  return <Suspense>{params.then((p) => <PrintSetlist id={p.id} />)}</Suspense>;
}
