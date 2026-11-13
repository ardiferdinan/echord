import { Suspense } from "react";
import { LocalStage } from "./Stage";

export default function PlayPage({ params }: PageProps<"/setlists/[id]/play">) {
  return <Suspense>{params.then((p) => <LocalStage id={p.id} />)}</Suspense>;
}
