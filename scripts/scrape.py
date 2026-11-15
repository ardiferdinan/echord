# /// script
# requires-python = ">=3.10"
# dependencies = ["scrapling[fetchers]>=0.5.1"]
# ///
"""Fetch chord pages one by one (personal use): jrchord.com, bukupujian2.blogspot.com. Prints one JSON object per line:
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


def bukupujian(page):
    """bukupujian2.blogspot.com: one <pre> whose first line is the title, then "Key : X", then chords over lyrics."""
    pre = page.css(".post-body pre").first
    if not pre:
        return None
    lines = (pre.get_all_text(strip=False) if hasattr(pre, "get_all_text") else str(pre.text)).replace("\r", "").strip("\n").split("\n")
    title, rest, key = lines[0].strip(), lines[1:], ""
    if rest and (m := re.match(r"^\s*Key\s*:\s*([A-G][#b]?m?)\s*$", rest[0], re.I)):
        key, rest = m.group(1), rest[1:]
    # "Judul (Artis)" names the singer, "Judul (KJ 346)" is a hymn number and stays in the title
    m = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", title)
    artist = m.group(2) if m and not re.match(r"^[A-Z]{1,4}\s*\d+$", m.group(2)) else ""
    return {"title": m.group(1) if artist else title, "artist": artist, "key": key, "bpm": None, "text": "\n".join(rest).strip("\n")}


PARSERS = {"jrchord.com": jrchord, "bukupujian2.blogspot.com": bukupujian}

for i, url in enumerate(sys.argv[1:]):
    if i:
        time.sleep(3)
    try:
        page = Fetcher.get(url, timeout=30)
        host = re.sub(r"^www\.", "", url.split("/")[2])
        parse = PARSERS.get(host, jrchord)
        song = parse(page) if page.status == 200 else None
        out = song or {"error": f"HTTP {page.status} / format tidak dikenali"}
    except Exception as e:  # network hiccup: report and keep going
        out = {"error": str(e)[:200]}
    print(json.dumps({"url": url, **out}), flush=True)
