# /// script
# requires-python = ">=3.10"
# dependencies = ["scrapling[fetchers]>=0.5.1"]
# ///
"""KPPK hymns from bukupujian2.blogspot.com (personal use). Reads the KPPK index, fetches each song page
once and appends {url, title, artist, key, bpm, lang, text} lines to scripts/kppk.jsonl (pages already in
the file are skipped, so a stopped run just continues). Plain HTTP, 3 s between requests, no anti-bot bypass.
Run: uv run scripts/kppk.py   then   npx tsx --env-file=.env.local scripts/import.mts --jsonl scripts/kppk.jsonl [--save]
"""
import json
import pathlib
import re
import time

from scrapling.fetchers import Fetcher

INDEX = "https://bukupujian2.blogspot.com/p/indeks-lagu-kppk.html"
OUT = pathlib.Path(__file__).with_name("kppk.jsonl")


def song(page, url):
    pre = page.css(".post-body pre").first
    if not pre:
        return {"url": url, "error": "no <pre> on page"}
    text = (pre.get_all_text(strip=False) if hasattr(pre, "get_all_text") else str(pre.text)).replace("\r", "").strip("\n")
    lines = text.split("\n")
    title = lines[0].strip()  # "Tuhan Berada di Bait Suci-Nya (KPPK 1)"
    rest = lines[1:]
    key = ""
    if rest and (m := re.match(r"^\s*Key\s*:\s*([A-G][#b]?m?)\s*$", rest[0], re.I)):
        key, rest = m.group(1), rest[1:]
    return {"url": url, "title": title, "artist": "KPPK", "key": key, "bpm": None, "lang": "ind", "text": "\n".join(rest).strip("\n")}


def main():
    index = Fetcher.get(INDEX, timeout=30)
    urls = list(dict.fromkeys(a.attrib.get("href", "") for a in index.css("a") if re.search(r"kppk-\d+\.html$", a.attrib.get("href", ""), re.I)))
    done = {json.loads(l)["url"] for l in OUT.read_text().splitlines() if l.strip()} if OUT.exists() else set()
    todo = [u for u in urls if u not in done]
    print(f"{len(urls)} lagu KPPK di indeks, {len(done)} sudah diambil, {len(todo)} sisa", flush=True)
    with OUT.open("a") as f:
        for i, url in enumerate(todo, 1):
            time.sleep(3)
            try:
                row = song(Fetcher.get(url, timeout=30), url)
            except Exception as e:  # network hiccup: logged, retried on the next run
                print(f"[{i}/{len(todo)}] ✗ {url}: {e}", flush=True)
                continue
            if "error" not in row:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                f.flush()
            print(f"[{i}/{len(todo)}] {'✓ ' + row['title'] if 'error' not in row else '✗ ' + row['error']}", flush=True)


if __name__ == "__main__":
    main()
