# /// script
# requires-python = ">=3.10"
# dependencies = ["scrapling[fetchers]>=0.5.1"]
# ///
"""Crawl PsalmNote's server-rendered "lite" pages (personal use) and save songs as JSON lines.
Follows /artist/, /album/ and /song/ links from the homepage (song pages link other versions).
Plain HTTP only, 3 s between requests, no anti-bot bypass. Resumable: state in scripts/psalmnote-state.json.
Run: uv run scripts/psalmnote.py [--max N]   -> appends to scripts/psalmnote.jsonl
"""
import json
import re
import sys
import time
from pathlib import Path

from scrapling.fetchers import Fetcher

BASE = "https://www.psalmnote.com"
DIR = Path(__file__).parent
STATE, OUT = DIR / "psalmnote-state.json", DIR / "psalmnote.jsonl"
LINK = re.compile(r"^/(artist|album|song)/[^/?#]+$")


def text(el):
    return re.sub(r"\s+", " ", el.get_all_text(strip=True) if el else "").strip()


def song(page, url):
    h1 = page.css("h1.songviewer-h1").first
    if not h1:
        return None
    meta = {}
    for label in page.css("div.text-bold"):
        nxt = label.next
        if nxt is not None:
            meta[text(label).lower()] = text(nxt)
    parts = []
    for part in page.css("div.songviewer-content > div.mb-2"):
        btn = part.css("button.song-part-tag").first
        lines = []
        for sec in part.css("section.chords-line, section.lyric"):
            line = sec.get_all_text(strip=False).replace(" ", " ").rstrip()
            if "chords-line" in sec.attrib.get("class", ""):
                line = line.replace("Maj", "maj")
            lines.append(line)
        if lines:
            parts.append("\n".join(([text(btn)] if btn else []) + lines))
    tempo = re.match(r"(\d+)", meta.get("tempo", ""))
    key = page.css('[data-cy="chord-base"]').first
    return {
        "url": url,
        "title": text(h1),
        "artist": text(page.css('[data-cy="artist"]').first),
        "key": text(key),
        "bpm": int(tempo.group(1)) if tempo else None,
        "lang": meta.get("language", ""),
        "text": "\n\n".join(parts),
    }


state = json.loads(STATE.read_text()) if STATE.exists() else {"seen": [BASE + "/"], "queue": [BASE + "/"]}
seen, queue = set(state["seen"]), state["queue"]
limit = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 10**9
n = 0
with OUT.open("a") as out:
    while queue and n < limit:
        url = queue.pop(0)
        if n:
            time.sleep(3)
        n += 1
        try:
            page = Fetcher.get(url, timeout=30)
        except Exception as e:  # network hiccup: retry later
            queue.append(url)
            print(f"! {url}: {str(e)[:120]}", flush=True)
            continue
        if page.status == 200:
            for href in page.css("a::attr(href)").getall():
                if LINK.match(href) and BASE + href not in seen:
                    seen.add(BASE + href)
                    # songs first: they are the payload and link to more versions
                    queue.insert(0, BASE + href) if href.startswith("/song/") else queue.append(BASE + href)
            if "/song/" in url and (s := song(page, url)):
                out.write(json.dumps(s, ensure_ascii=False) + "\n")
                out.flush()
        print(f"[{n}] {page.status} {url} · antrian {len(queue)}", flush=True)
        if n % 20 == 0 or not queue:
            STATE.write_text(json.dumps({"seen": sorted(seen), "queue": queue}))
STATE.write_text(json.dumps({"seen": sorted(seen), "queue": queue}))
