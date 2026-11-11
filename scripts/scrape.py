# /// script
# requires-python = ">=3.10"
# dependencies = ["scrapling[fetchers]>=0.5.1"]
# ///
"""Fetch chord pages one by one (personal use). Prints one JSON object per line:
{url, title, artist, key, text} where text is the raw chords-over-lyrics block.
Run: uv run scripts/scrape.py <url> [<url> ...]
Plain HTTP only, 3 s between requests, no anti-bot bypass.
"""
import json
import re
import sys
import time

from scrapling.fetchers import Fetcher


def jrchord(page):
    pre = page.css("pre[data-key]").first
    if not pre:
        return None
    text = (pre.get_all_text(strip=False) if hasattr(pre, "get_all_text") else str(pre.text)).strip("\n")
    tempo = re.search(r"^\s*Tempo\s*:?\s*(\d+)", text, re.M | re.I)
    text = re.sub(r"^\s*(Tempo\s*:?.*|\d/\d)\s*$\n?", "", text, flags=re.M | re.I)  # meta lines, not lyrics
    head = (page.css("h1.song-detail-title::text").get("") or "").strip()
    m = re.match(r"^(?:Chord\s+)?(.+?)\s*\((.+)\)\s*$", text.split("\n", 1)[0].strip())
    title, artist = (m.group(1), m.group(2)) if m else (head, "")
    body = text.split("\n", 1)[1] if m else text  # drop the "Chord Judul (Artis)" first line
    return {"title": title or head, "artist": artist, "key": pre.attrib.get("data-key", ""), "bpm": int(tempo.group(1)) if tempo else None, "text": body.strip("\n")}


for i, url in enumerate(sys.argv[1:]):
    if i:
        time.sleep(3)
    try:
        page = Fetcher.get(url, timeout=30)
        song = jrchord(page) if page.status == 200 else None
        out = song or {"error": f"HTTP {page.status} / format tidak dikenali"}
    except Exception as e:  # network hiccup: report and keep going
        out = {"error": str(e)[:200]}
    print(json.dumps({"url": url, **out}), flush=True)
