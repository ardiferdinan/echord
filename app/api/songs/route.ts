import { searchSongs } from "@/lib/db";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return Response.json(await searchSongs(q, 20));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
