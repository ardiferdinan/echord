/** "https://www.jrchord.com/…" -> "JRChord"; songs typed in by hand have no source. */
export function sourceName(url: string | null | undefined) {
  if (!url) return "Manual";
  const host = new URL(url).hostname.replace(/^www\./, "");
  return ({ "jrchord.com": "JRChord", "psalmnote.com": "PsalmNote" } as Record<string, string>)[host] ?? host;
}
