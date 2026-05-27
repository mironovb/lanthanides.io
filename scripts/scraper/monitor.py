#!/usr/bin/env python3
"""
REE Regulatory & Policy Scrapper.

Polls a configured list of government and policy sources once per
invocation. New articles are extracted, optionally translated from
Chinese to English via DeepL Free, filtered against a keyword list,
and written to data/articles/{source_id}/{YYYY-MM-DD}/*.md as
LLM-ready markdown.

Schedule via cron (see README.md). Default cadence is every 6 hours.

Usage:
    python scraper.py                    # poll all sources once
    python scraper.py --source mofcom_zcfb  # poll one source only
    python scraper.py --debug             # verbose logging, dump candidate links
    python scraper.py --list              # list configured sources and exit
"""

import argparse
import hashlib
import logging
import os
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import feedparser
import requests
import trafilatura
import yaml
from bs4 import BeautifulSoup
from dotenv import load_dotenv


# ---------------------------------------------------------------
# Config
# ---------------------------------------------------------------

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

OUTPUT_DIR = (ROOT / os.getenv("OUTPUT_DIR", "data")).resolve()
ARTICLES_DIR = OUTPUT_DIR / "articles"
SEEN_DB = OUTPUT_DIR / "seen.sqlite"
LOG_FILE = ROOT / "scraper.log"

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "").strip()
KEYWORD_FILTER = [
    k.strip().lower()
    for k in os.getenv("KEYWORD_FILTER", "").split(",")
    if k.strip()
]
REQUEST_DELAY = float(os.getenv("REQUEST_DELAY_SECONDS", "1.5"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
)


# ---------------------------------------------------------------
# Logging
# ---------------------------------------------------------------

def setup_logging(debug: bool = False):
    level = logging.DEBUG if debug else logging.INFO
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
        ],
        force=True,
    )

log = logging.getLogger("scraper")


# ---------------------------------------------------------------
# Storage
# ---------------------------------------------------------------

def init_db() -> sqlite3.Connection:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(SEEN_DB)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS seen (
            url TEXT PRIMARY KEY,
            content_hash TEXT,
            first_seen TIMESTAMP,
            source_id TEXT,
            status TEXT
        )"""
    )
    conn.commit()
    return conn

def is_seen(conn: sqlite3.Connection, url: str) -> bool:
    cur = conn.execute("SELECT 1 FROM seen WHERE url = ?", (url,))
    return cur.fetchone() is not None

def mark_seen(conn: sqlite3.Connection, url: str, content_hash: str,
              source_id: str, status: str = "saved"):
    conn.execute(
        "INSERT OR REPLACE INTO seen (url, content_hash, first_seen, "
        "source_id, status) VALUES (?, ?, ?, ?, ?)",
        (url, content_hash, datetime.now(timezone.utc).isoformat(),
         source_id, status),
    )
    conn.commit()


# ---------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------

def fetch(url: str) -> str | None:
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en,zh-CN;q=0.9"}
    try:
        r = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT,
                         allow_redirects=True)
        r.raise_for_status()
        # Fix encoding for Chinese sites that mis-declare as ISO-8859-1
        if r.encoding and r.encoding.lower() in ("iso-8859-1", "us-ascii"):
            r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except requests.exceptions.RequestException as e:
        log.warning("fetch failed for %s: %s", url, e)
        return None


# ---------------------------------------------------------------
# Listing-page link extraction
# ---------------------------------------------------------------

def extract_links(html: str, source: dict, debug: bool = False) -> list[str]:
    pattern = re.compile(source["link_pattern"])
    soup = BeautifulSoup(html, "lxml")
    base = source.get("link_base", source["list_url"])

    candidates = [a.get("href", "") for a in soup.find_all("a", href=True)]
    if debug:
        log.debug("  %d <a> tags on page", len(candidates))
        for c in candidates[:30]:
            log.debug("    raw: %s", c)

    links = []
    seen_local = set()
    for href in candidates:
        if pattern.search(href):
            full = urljoin(base, href)
            if full not in seen_local:
                seen_local.add(full)
                links.append(full)
    return links


# ---------------------------------------------------------------
# Content extraction
# ---------------------------------------------------------------

def extract_content(html: str, url: str) -> dict | None:
    """Returns {title, text, date, author} or None on failure."""
    text = trafilatura.extract(
        html,
        output_format="markdown",
        with_metadata=False,
        include_comments=False,
        include_tables=True,
        url=url,
    )
    if not text or len(text.strip()) < 50:
        return None

    metadata = trafilatura.extract_metadata(html, default_url=url)
    return {
        "title": (metadata.title if metadata else None) or "(no title)",
        "text": text,
        "date": (metadata.date if metadata else None),
        "author": (metadata.author if metadata else None),
    }


# ---------------------------------------------------------------
# Translation (DeepL Free)
# ---------------------------------------------------------------

_deepl = None
def deepl_client():
    global _deepl
    if _deepl is None and DEEPL_API_KEY:
        try:
            import deepl
            _deepl = deepl.Translator(DEEPL_API_KEY)
        except ImportError:
            log.warning("deepl package not installed; skipping translation")
            return None
    return _deepl

def translate(text: str, source_lang: str) -> str | None:
    if not text or source_lang.lower().startswith("en"):
        return None
    client = deepl_client()
    if not client:
        return None
    try:
        # DeepL Free has a 128 KiB per-request limit; chunk if needed.
        max_chunk = 100_000
        if len(text) <= max_chunk:
            result = client.translate_text(
                text, source_lang="ZH", target_lang="EN-US"
            )
            return result.text
        parts = []
        for i in range(0, len(text), max_chunk):
            chunk = text[i:i + max_chunk]
            result = client.translate_text(
                chunk, source_lang="ZH", target_lang="EN-US"
            )
            parts.append(result.text)
        return "\n\n".join(parts)
    except Exception as e:
        log.warning("translation failed: %s", e)
        return None


# ---------------------------------------------------------------
# Filtering & output
# ---------------------------------------------------------------

def passes_keyword_filter(*texts: str | None) -> bool:
    if not KEYWORD_FILTER:
        return True
    haystack = " ".join(t for t in texts if t).lower()
    return any(k in haystack for k in KEYWORD_FILTER)

def slugify(s: str) -> str:
    # Keep CJK characters; replace whitespace and punctuation
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"[\\/:*?\"<>|]+", "", s)
    s = s.strip("-_")[:80]
    return s or "article"

def yaml_str(s: str) -> str:
    """Safely YAML-quote a single-line string for frontmatter."""
    if s is None:
        return '""'
    s = str(s).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return f'"{s}"'

def write_article(source: dict, url: str, content: dict,
                  translated: str | None) -> Path:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    src_dir = ARTICLES_DIR / source["id"] / today
    src_dir.mkdir(parents=True, exist_ok=True)
    url_hash = hashlib.sha1(url.encode()).hexdigest()[:10]
    filename = f"{slugify(content['title'])}-{url_hash}.md"
    path = src_dir / filename

    fm = ["---"]
    fm.append(f"source_id: {yaml_str(source['id'])}")
    fm.append(f"source_name: {yaml_str(source['name'])}")
    fm.append(f"url: {yaml_str(url)}")
    fm.append(f"title: {yaml_str(content['title'])}")
    fm.append(f"language: {yaml_str(source.get('language', 'en'))}")
    fm.append(f"scraped_at: {yaml_str(datetime.now(timezone.utc).isoformat())}")
    if content.get("date"):
        fm.append(f"published_date: {yaml_str(content['date'])}")
    if content.get("author"):
        fm.append(f"author: {yaml_str(content['author'])}")
    fm.append(f"translated: {'true' if translated else 'false'}")
    fm.append("---")

    body = ["", f"# {content['title']}", ""]
    if translated:
        body.append("## Translation (English)")
        body.append("")
        body.append(translated)
        body.append("")
        body.append("---")
        body.append("")
        body.append("## Original")
        body.append("")
        body.append(content["text"])
    else:
        body.append(content["text"])

    path.write_text("\n".join(fm + body), encoding="utf-8")
    return path


# ---------------------------------------------------------------
# Source handlers
# ---------------------------------------------------------------

def handle_html_list(conn: sqlite3.Connection, source: dict,
                     debug: bool = False) -> tuple[int, int]:
    """Returns (new_saved, new_filtered)."""
    log.info("[%s] polling html list: %s", source["id"], source["list_url"])
    html = fetch(source["list_url"])
    if not html:
        return 0, 0
    links = extract_links(html, source, debug=debug)
    log.info("[%s]   %d candidate links match pattern", source["id"], len(links))
    saved = filtered = 0
    for url in links:
        if is_seen(conn, url):
            continue
        time.sleep(REQUEST_DELAY)
        article_html = fetch(url)
        if not article_html:
            continue
        content = extract_content(article_html, url)
        if not content:
            log.debug("[%s]   no content extracted from %s", source["id"], url)
            continue
        translated = translate(content["text"], source.get("language", "en"))
        if not passes_keyword_filter(content["title"], content["text"], translated):
            mark_seen(conn, url, "filtered", source["id"], "filtered")
            filtered += 1
            continue
        try:
            path = write_article(source, url, content, translated)
            log.info("[%s]   saved: %s", source["id"], path.name)
        except Exception as e:
            log.exception("[%s]   write failed: %s", source["id"], e)
            continue
        content_hash = hashlib.sha1(content["text"].encode()).hexdigest()
        mark_seen(conn, url, content_hash, source["id"], "saved")
        saved += 1
    return saved, filtered

def handle_rss(conn: sqlite3.Connection, source: dict,
               debug: bool = False) -> tuple[int, int]:
    log.info("[%s] polling rss: %s", source["id"], source["feed_url"])
    try:
        feed = feedparser.parse(source["feed_url"],
                                request_headers={"User-Agent": USER_AGENT})
    except Exception as e:
        log.warning("[%s] feed parse failed: %s", source["id"], e)
        return 0, 0
    log.info("[%s]   %d entries in feed", source["id"], len(feed.entries))
    saved = filtered = 0
    for entry in feed.entries:
        url = entry.get("link")
        if not url or is_seen(conn, url):
            continue
        time.sleep(REQUEST_DELAY)
        article_html = fetch(url)
        content = None
        if article_html:
            content = extract_content(article_html, url)
        if not content:
            content = {
                "title": entry.get("title", "(no title)"),
                "text": entry.get("summary", "") or entry.get("description", ""),
                "date": entry.get("published"),
                "author": entry.get("author"),
            }
            if not content["text"] or len(content["text"]) < 50:
                continue
        translated = translate(content["text"], source.get("language", "en"))
        if not passes_keyword_filter(content["title"], content["text"], translated):
            mark_seen(conn, url, "filtered", source["id"], "filtered")
            filtered += 1
            continue
        try:
            path = write_article(source, url, content, translated)
            log.info("[%s]   saved: %s", source["id"], path.name)
        except Exception as e:
            log.exception("[%s]   write failed: %s", source["id"], e)
            continue
        content_hash = hashlib.sha1(content["text"].encode()).hexdigest()
        mark_seen(conn, url, content_hash, source["id"], "saved")
        saved += 1
    return saved, filtered


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def load_sources() -> list[dict]:
    sources_file = ROOT / "sources.yaml"
    if not sources_file.exists():
        log.error("sources.yaml not found at %s", sources_file)
        sys.exit(1)
    config = yaml.safe_load(sources_file.read_text(encoding="utf-8"))
    sources = config.get("sources", [])
    return [s for s in sources if s.get("enabled", True)]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", help="run only this source_id")
    parser.add_argument("--debug", action="store_true",
                        help="verbose logging")
    parser.add_argument("--list", action="store_true",
                        help="list configured sources and exit")
    args = parser.parse_args()

    setup_logging(debug=args.debug)

    sources = load_sources()
    if args.list:
        for s in sources:
            print(f"  {s['id']:35s} {s['type']:10s} {s['name']}")
        return

    if args.source:
        sources = [s for s in sources if s["id"] == args.source]
        if not sources:
            log.error("no source with id=%s", args.source)
            sys.exit(1)

    log.info("=== run start: %d sources, translation=%s, keyword_filter=%s ===",
             len(sources),
             "on" if DEEPL_API_KEY else "off",
             "on" if KEYWORD_FILTER else "off")

    conn = init_db()
    total_saved = total_filtered = 0
    for source in sources:
        try:
            if source["type"] == "html_list":
                s, f = handle_html_list(conn, source, debug=args.debug)
            elif source["type"] == "rss":
                s, f = handle_rss(conn, source, debug=args.debug)
            else:
                log.warning("[%s] unknown source type: %s",
                            source["id"], source["type"])
                continue
            total_saved += s
            total_filtered += f
        except Exception as e:
            log.exception("[%s] source failed: %s", source["id"], e)

    log.info("=== run done: %d saved, %d filtered ===",
             total_saved, total_filtered)


if __name__ == "__main__":
    main()
