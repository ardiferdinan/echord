import { getSong } from "@/lib/db";

/** Full song (with ChordPro) for adding to a setlist from a list, the player or a menu. */
export async function GET(_req: Request, ctx: RouteContext<"/api/songs/[slug]">) {
  const song = await getSong((await ctx.params).slug);
  return song ? Response.json(song) : Response.json({ error: "Lagu tidak ditemukan" }, { status: 404 });
}
