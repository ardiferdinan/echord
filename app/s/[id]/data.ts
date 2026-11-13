import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getShared } from "@/lib/db";
import type { Setlist } from "@/lib/storage";

export async function loadShared(params: Promise<{ id: string }>) {
  await connection(); // always fresh: the leader may have just updated it
  const data = (await getShared((await params).id)) as Setlist | undefined;
  if (!data) notFound();
  return data;
}
