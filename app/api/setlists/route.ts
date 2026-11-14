import { currentUser } from "@/lib/session";
import { getSetlists, saveSetlists } from "@/lib/users";

const MAX = 3_000_000; // bytes of setlist JSON per account

/** This account's setlists (the browser keeps a copy and syncs; see components/SetlistSync.tsx). */
export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ error: "Perlu login" }, { status: 401 });
  return Response.json({ userId: u.id, ...(await getSetlists(u.id)) });
}

export async function PUT(req: Request) {
  const u = await currentUser();
  if (!u) return Response.json({ error: "Perlu login" }, { status: 401 });
  const text = await req.text();
  if (text.length > MAX) return Response.json({ error: "Setlist terlalu besar untuk disimpan." }, { status: 413 });
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return Response.json({ error: "Data tidak valid" }, { status: 400 });
  }
  if (!Array.isArray(data) || !data.every((s) => s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string")) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  await saveSetlists(u.id, data);
  return Response.json({ ok: true });
}
