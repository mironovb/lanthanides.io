"""
Telegram bot dispatcher.

Sends regulatory-monitor alerts to a configured Telegram chat. Reads bot
token and chat ID from environment (which GitHub Actions populates from
repo secrets).

Usage:
    from notify.telegram import send_digest
    send_digest(new_articles=[...], scraper_run_timestamp="...")

Setup (one-time):
    1. Talk to @BotFather on Telegram → /newbot → get TELEGRAM_BOT_TOKEN
    2. Talk to @userinfobot (or any bot, then check getUpdates) → get your
       chat ID (just numeric, e.g. 123456789 for DMs, or -100... for channels)
    3. In GitHub repo Settings → Secrets and variables → Actions:
         TELEGRAM_BOT_TOKEN  = bot:abcdef123...
         TELEGRAM_CHAT_ID    = 123456789
    4. (optional) For multiple recipients, set TELEGRAM_CHAT_ID to a
       comma-separated list of chat IDs (e.g. "123456789,987654321"),
       or use a Telegram channel's -100... ID and add the bot as admin.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Iterable

import requests

log = logging.getLogger(__name__)

API_BASE = "https://api.telegram.org"
TELEGRAM_MAX_MESSAGE_CHARS = 4096
DEFAULT_TIMEOUT = 30


def _resolve_chat_ids(chat_id: str | None = None) -> list[str]:
    """Parse one or more chat IDs from the arg or TELEGRAM_CHAT_ID env.

    Accepts a comma-separated list so a digest fans out to several
    recipients (e.g. you + a colleague) without needing a channel.
    """
    raw = chat_id if chat_id is not None else os.environ.get("TELEGRAM_CHAT_ID", "")
    return [c.strip() for c in raw.split(",") if c.strip()]


# ---------------------------------------------------------------
# Public API
# ---------------------------------------------------------------

def send_digest(
    new_articles: list[dict],
    scraper_run_timestamp: str | None = None,
    chat_id: str | None = None,
    bot_token: str | None = None,
) -> list[dict]:
    """
    Send a Telegram digest summarising new articles found by the scraper.

    `new_articles` items are dicts with at least: source_id, source_name,
    title, url, language, scraped_at, published_date (optional),
    summary (optional, first ~200 chars of body).

    Returns the list of Telegram API responses (one per message sent;
    multiple if the digest exceeds the per-message char limit).
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chats = _resolve_chat_ids(chat_id)

    if not token:
        log.warning("TELEGRAM_BOT_TOKEN not set — skipping Telegram dispatch")
        return []
    if not chats:
        log.warning("TELEGRAM_CHAT_ID not set — skipping Telegram dispatch")
        return []
    if not new_articles:
        log.info("No new articles — skipping Telegram dispatch")
        return []

    timestamp = scraper_run_timestamp or datetime.now(timezone.utc).isoformat()
    messages = _build_messages(new_articles, timestamp)

    responses = []
    for chat in chats:
        for msg in messages:
            try:
                r = requests.post(
                    f"{API_BASE}/bot{token}/sendMessage",
                    json={
                        "chat_id": chat,
                        "text": msg,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": False,
                        "disable_notification": False,
                    },
                    timeout=DEFAULT_TIMEOUT,
                )
                r.raise_for_status()
                responses.append(r.json())
                log.info("Telegram message sent (chat=%s, len=%d)", chat, len(msg))
            except requests.exceptions.RequestException as e:
                log.error("Telegram dispatch to %s failed: %s", chat, e)
    return responses


def send_health(message: str, chat_id: str | None = None,
                bot_token: str | None = None) -> dict | None:
    """One-off health/diagnostic message. Used for workflow self-tests."""
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chats = _resolve_chat_ids(chat_id)
    if not (token and chats):
        return None
    responses = []
    for chat in chats:
        try:
            r = requests.post(
                f"{API_BASE}/bot{token}/sendMessage",
                json={"chat_id": chat, "text": message, "parse_mode": "HTML"},
                timeout=DEFAULT_TIMEOUT,
            )
            r.raise_for_status()
            responses.append(r.json())
        except Exception as e:
            log.error("Telegram health-message to %s failed: %s", chat, e)
    return responses or None


# ---------------------------------------------------------------
# Message formatting
# ---------------------------------------------------------------

def _build_messages(articles: list[dict], timestamp: str) -> list[str]:
    """
    Build one or more Telegram messages (each ≤4096 chars) containing the
    digest. Uses HTML formatting.
    """
    header = (
        f"🔔 <b>REE regulatory monitor</b>\n"
        f"<i>{len(articles)} new article{'s' if len(articles) != 1 else ''} detected at "
        f"{timestamp[:19].replace('T', ' ')} UTC</i>\n"
        f"\n"
        f"Open each article → paste into Claude.ai with the triage prompt at "
        f"<code>scripts/analyzer/prompts/triage.md</code>.\n"
        f"\n"
    )
    footer = (
        f"\n"
        f"<i>Manual workflow: scripts/prompts/manual-workflow.md</i>"
    )

    messages = []
    current = header

    for art in articles:
        block = _format_article(art)
        # If adding this block would exceed the limit, flush current message
        # and start a new one. Keep header only on the first message.
        if len(current) + len(block) + len(footer) > TELEGRAM_MAX_MESSAGE_CHARS:
            messages.append(current + footer)
            current = block  # subsequent messages omit the header
        else:
            current += block

    messages.append(current + footer)
    return messages


def _format_article(art: dict) -> str:
    source = _escape(art.get("source_name") or art.get("source_id") or "unknown")
    title = _escape(art.get("title") or "(no title)")
    url = art.get("url") or ""
    lang = art.get("language", "en")
    pub_date = art.get("published_date") or art.get("scraped_at", "")[:10]
    summary = art.get("summary") or ""

    block = (
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📰 <a href=\"{_escape(url)}\">{title}</a>\n"
        f"<i>{source}</i>"
    )
    if lang != "en":
        block += f" · <i>language: {lang}</i>"
    if pub_date:
        block += f" · <i>{pub_date}</i>"
    block += "\n"

    if summary:
        if len(summary) > 350:
            summary = summary[:347] + "…"
        block += f"\n{_escape(summary)}\n"

    return block


def _escape(s: str) -> str:
    """Escape HTML special chars for Telegram parse_mode=HTML."""
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
    )


# ---------------------------------------------------------------
# CLI for ad-hoc testing
# ---------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    test_articles = [
        {
            "source_id": "mofcom_homepage",
            "source_name": "MOFCOM 商务部",
            "title": "Test article — please ignore (regulatory-monitor self-test)",
            "url": "https://example.com/test",
            "language": "zh",
            "published_date": "2026-05-27",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "summary": "This is a synthetic article for verifying the Telegram dispatcher.",
        },
    ]
    print(send_digest(test_articles))
