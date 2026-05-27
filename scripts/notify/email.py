"""
Email dispatcher — STUB for future use.

The current architecture sends regulatory alerts via Telegram only
(see notify/telegram.py). This module is a placeholder so that when a
corporate email is set up, the orchestrator can call `send_digest_email`
without architectural surgery.

To activate later:

1. Pick a transactional email service. Recommended (in order):
     - Resend (free 3K/month + 100/day, simple API, no domain
       verification required for sandbox sending)
     - AWS SES (~$0.10 per 1000, needs AWS account + domain verification)
     - Postmark (paid only, but extremely reliable)
     - Gmail SMTP via app password (free, rate-limited, fragile)
2. Add the service's API key as a repo secret (e.g. RESEND_API_KEY).
3. Add EMAIL_RECIPIENT as a repo secret or env var.
4. Replace the body of `send_digest_email` with the service's call.
5. Add the call to scripts/run_monitor.py alongside the Telegram call.

Until then this is a no-op that logs and returns.
"""

from __future__ import annotations

import logging
import os
from typing import Iterable

log = logging.getLogger(__name__)


def send_digest_email(
    new_articles: list[dict],
    scraper_run_timestamp: str | None = None,
    recipient: str | None = None,
) -> dict | None:
    """
    Send a digest email summarising new articles. Currently a no-op.

    Configuration env vars when activated:
        EMAIL_RECIPIENT   — target email address
        RESEND_API_KEY    — if using Resend
        AWS_SES_REGION    — if using SES
        SMTP_HOST, SMTP_USER, SMTP_PASSWORD — if using raw SMTP
    """
    recipient = recipient or os.environ.get("EMAIL_RECIPIENT", "").strip()
    if not recipient:
        log.debug("EMAIL_RECIPIENT not set — email dispatch skipped (using Telegram only)")
        return None
    if not new_articles:
        log.info("No new articles — email dispatch skipped")
        return None

    log.info(
        "Email dispatch would send %d-article digest to %s — STUB, not implemented",
        len(new_articles), recipient
    )

    # ─── When ready to activate: replace below with the chosen service ───
    # Example (Resend):
    #
    # import requests
    # r = requests.post(
    #     "https://api.resend.com/emails",
    #     headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
    #     json={
    #         "from": "regulatory-monitor@your-domain.com",
    #         "to": recipient,
    #         "subject": f"{len(new_articles)} new REE regulatory alerts",
    #         "html": _build_html_digest(new_articles, scraper_run_timestamp),
    #     },
    #     timeout=30,
    # )
    # r.raise_for_status()
    # return r.json()

    return {"status": "stub_not_sent", "recipient": recipient}
