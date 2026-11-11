// Proxy to LRCLIB (free, no key): https://lrclib.net/docs
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "echord/0.1" },
  });
  if (!res.ok) return Response.json({ error: `LRCLIB ${res.status}` }, { status: 502 });
  const rows = (await res.json()) as { id: number; trackName: string; artistName: string; plainLyrics: string | null }[];
  return Response.json(
    rows.filter((r) => r.plainLyrics).slice(0, 10).map(({ id, trackName, artistName, plainLyrics }) => ({ id, trackName, artistName, plainLyrics })),
  );
}
