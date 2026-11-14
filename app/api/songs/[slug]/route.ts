import { getSong, songVersions } from "@/lib/db";

/** Full song (with ChordPro) for adding to a setlist, plus other sources' chords for it (versions). */
export async function GET(_req: Request, ctx: RouteContext<"/api/songs/[slug]">) {
  const song = await getSong((await ctx.params).slug);
  if (!song) return Response.json({ error: "Lagu tidak ditemukan" }, { status: 404 });
  return Response.json({ ...song, versions: await songVersions(song.id) });
}
