import { getPreview } from "@/lib/db";

/** 30 s preview for the player bar. Behind the login proxy like every /api route. */
export async function GET(_req: Request, ctx: RouteContext<"/api/preview/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "id tidak valid" }, { status: 400 });
  const p = await getPreview(id).catch(() => undefined);
  return p ? Response.json(p) : Response.json({ error: "Preview tidak tersedia" }, { status: 404 });
}
