#!/usr/bin/env python3
"""
Top-level orchestrator for the regulatory-monitor workflow.

Runs the scraper, identifies new articles since the last invocation, and
dispatches a Telegram digest. The scheduled GitHub Actions workflow that used to
invoke this script has been removed; run it manually or from a future external
monitor if the alerting pipeline is restored.

This script does no analysis itself. New articles are surfaced to a
human via Telegram; triage and any data/framework updates happen in a
separate manual review step. An automated analysis layer can later be
slotted in between the scraper and the notifier.

Usage:
    cd lanthanides.io
    python scripts/run_monitor.py
    python scripts/run_monitor.py --dry-run     # don't send Telegram, just print
    python scripts/run_monitor.py --debug       # verbose logging
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make sibling packages importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from notify.telegram import send_digest as send_telegram_digest, send_health  # noqa: E402
from notify.email import send_digest_email  # noqa: E402
from triage import appraise  # noqa: E402

# Articles scoring ≥ CRITICAL_THRESHOLD trigger a Telegram alert; below this
# they're still triaged and recorded in run_state.json under `appraisals`,
# just silently — no alert. Tune via env without a code change.
CRITICAL_THRESHOLD = int(os.getenv("CRITICAL_THRESHOLD", "7"))

# Path to the scraper script — invoked as a subprocess to keep its state
# self-contained, OR import its main() if we want shared process.
SCRAPER_DIR = ROOT / "scraper"
SCRAPER_DB = SCRAPER_DIR / "data" / "seen.sqlite"
SCRAPER_ARTICLES_DIR = SCRAPER_DIR / "data" / "articles"
STATE_FILE = ROOT / "run_state.json"


# ---------------------------------------------------------------
# Logging
# ---------------------------------------------------------------

def setup_logging(debug: bool = False):
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )

log = logging.getLogger("orchestrator")


# ---------------------------------------------------------------
# Run state — track which articles we've notified about
# ---------------------------------------------------------------

def load_run_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"last_run": None, "notified_urls": []}

def save_run_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ---------------------------------------------------------------
# Scraper invocation
# ---------------------------------------------------------------

def run_scraper():
    """Run the scraper subprocess and return the new-article count."""
    log.info("invoking scraper at %s", SCRAPER_DIR / "monitor.py")
    import subprocess
    result = subprocess.run(
        [sys.executable, str(SCRAPER_DIR / "monitor.py")],
        cwd=str(SCRAPER_DIR),
        capture_output=True,
        text=True,
        timeout=600,
    )
    if result.returncode != 0:
        log.error("scraper exited with code %d", result.returncode)
        log.error("STDOUT: %s", result.stdout[-2000:])
        log.error("STDERR: %s", result.stderr[-2000:])
        raise RuntimeError(f"scraper failed: rc={result.returncode}")
    log.info("scraper completed")
    return result


# ---------------------------------------------------------------
# Identify new articles since last run
# ---------------------------------------------------------------

def query_recent_articles(conn: sqlite3.Connection, since_urls: set[str]) -> list[dict]:
    """
    Return saved articles whose URL is not in `since_urls`. Reads from the
    scraper's seen.sqlite (only includes status='saved' rows, not 'filtered').
    """
    cur = conn.execute(
        "SELECT url, source_id, first_seen FROM seen "
        "WHERE status = 'saved' "
        "ORDER BY first_seen DESC"
    )
    new = []
    for url, source_id, first_seen in cur.fetchall():
        if url in since_urls:
            continue
        article = _load_article_from_disk(source_id, url)
        if article:
            article["source_id"] = source_id
            article["first_seen"] = first_seen
            new.append(article)
    return new


def _load_article_from_disk(source_id: str, url: str) -> dict | None:
    """Find the .md file written by the scraper for this URL and parse it."""
    import hashlib, re
    url_hash = hashlib.sha1(url.encode()).hexdigest()[:10]
    # The article files are at data/articles/{source_id}/{date}/*-{hash}.md
    src_dir = SCRAPER_ARTICLES_DIR / source_id
    if not src_dir.exists():
        return None
    for date_dir in sorted(src_dir.iterdir(), reverse=True):
        if not date_dir.is_dir():
            continue
        for path in date_dir.glob(f"*-{url_hash}.md"):
            return _parse_article_md(path, url)
    return None


def _parse_article_md(path: Path, url: str) -> dict:
    """Extract frontmatter + first ~400 chars of body for the Telegram digest."""
    text = path.read_text(encoding="utf-8")
    frontmatter = {"url": url, "title": "(no title)"}

    # Quick YAML-ish frontmatter parse (we only need a few fields)
    if text.startswith("---"):
        end = text.find("---", 3)
        if end > 0:
            for line in text[3:end].strip().splitlines():
                if ":" not in line:
                    continue
                k, _, v = line.partition(":")
                frontmatter[k.strip()] = v.strip().strip('"\'')
            text = text[end + 3:]

    # Get a body preview (skip the H1 and the "Translation (English)" header)
    body_lines = [l for l in text.splitlines() if l.strip() and not l.startswith("#")]
    body = " ".join(body_lines[:8])[:400]
    frontmatter["summary"] = body
    # Path to the full scraped markdown so the notifier can attach it verbatim.
    frontmatter["_file_path"] = str(path)

    return frontmatter


def triage_article(art: dict) -> dict:
    """Read the article's full body and run the rule-based appraiser.

    Falls back to the short summary if the file isn't on disk for any
    reason — never blocks the pipeline on a triage glitch."""
    title = art.get("title", "")
    body = ""
    fp = art.get("_file_path")
    if fp and Path(fp).exists():
        try:
            txt = Path(fp).read_text(encoding="utf-8")
            # Strip YAML frontmatter if present so the scorer sees the article
            if txt.startswith("---"):
                end = txt.find("---", 3)
                if end > 0:
                    txt = txt[end + 3:]
            body = txt
        except Exception as e:
            log.warning("triage body-read failed for %s: %s", art.get("url"), e)
            body = art.get("summary", "")
    else:
        body = art.get("summary", "")
    return appraise(title, body).to_dict()


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true",
                   help="run scraper and identify new articles but skip notifications")
    p.add_argument("--debug", action="store_true", help="verbose logging")
    p.add_argument("--health-check", action="store_true",
                   help="send a Telegram test message and exit (don't run scraper)")
    args = p.parse_args()

    setup_logging(debug=args.debug)
    now = datetime.now(timezone.utc).isoformat()

    if args.health_check:
        log.info("health-check mode — sending Telegram test message")
        result = send_health(
            f"🩺 <b>regulatory-monitor health-check</b>\n"
            f"<i>Workflow alive at {now[:19].replace('T', ' ')} UTC</i>"
        )
        log.info("health-check result: %s", result)
        return 0 if result else 1

    state = load_run_state()
    notified_urls = set(state.get("notified_urls", []))
    log.info("run started; %d URLs in notification history", len(notified_urls))

    # 1. Run the scraper
    run_scraper()

    # 2. Open the scraper's dedup DB and find new articles
    if not SCRAPER_DB.exists():
        log.warning("scraper DB not found at %s — nothing to do", SCRAPER_DB)
        return 0

    conn = sqlite3.connect(SCRAPER_DB)
    new_articles = query_recent_articles(conn, notified_urls)
    conn.close()
    log.info("found %d new articles since last notification", len(new_articles))

    if not new_articles:
        log.info("no new articles; exiting cleanly")
        # Still update state so we don't ever fall behind
        state["last_run"] = now
        save_run_state(state)
        return 0

    # 3. Triage every new article (rule-based, no LLM)
    for art in new_articles:
        art["triage"] = triage_article(art)
    critical = [a for a in new_articles if a["triage"]["sensitivity"] >= CRITICAL_THRESHOLD]
    non_critical = [a for a in new_articles if a["triage"]["sensitivity"] < CRITICAL_THRESHOLD]
    log.info("triage: %d new → %d critical (≥%d), %d below threshold",
             len(new_articles), len(critical), CRITICAL_THRESHOLD, len(non_critical))

    # 4. Dispatch — Telegram fires ONLY for critical
    if args.dry_run:
        log.info("--dry-run — would dispatch %d critical (Telegram silent on the other %d)",
                 len(critical), len(non_critical))
        for art in critical[:10]:
            t = art["triage"]
            log.info("  [sens %d/%s] %s — %s", t["sensitivity"], t["category"],
                     art.get("source_id"), art.get("title", "")[:80])
    else:
        if critical:
            send_telegram_digest(critical, scraper_run_timestamp=now)
            send_digest_email(critical, scraper_run_timestamp=now)  # stub for now
        else:
            log.info("no critical articles this run — Telegram silent")

    # 5. Update state — mark ALL new as notified (no re-processing) AND
    # record every triage outcome so non-critical items aren't silently lost.
    state["last_run"] = now
    state["notified_urls"] = list(notified_urls.union(a["url"] for a in new_articles))[-1000:]

    recent_appraisals = state.get("appraisals", [])
    for art in new_articles:
        t = art["triage"]
        recent_appraisals.append({
            "url":          art.get("url"),
            "source_id":    art.get("source_id"),
            "scored_at":    now,
            "sensitivity":  t["sensitivity"],
            "category":     t["category"],
            "headline":     t["headline"],
            "elements":     t["elements_affected"],
            "instruments":  t["instruments_mentioned"],
            "alerted":      t["sensitivity"] >= CRITICAL_THRESHOLD,
        })
    state["appraisals"] = recent_appraisals[-200:]   # cap history
    save_run_state(state)
    log.info("state saved; run complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
