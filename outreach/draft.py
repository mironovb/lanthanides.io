"""Outreach message drafting layer.

This module produces text DRAFTS for the maintainer to review and send by
hand. It is not a mailer. It does not connect to any SMTP server, mail
API, web form, or third-party service. Nothing in this module transmits
anything to any supplier.

The single entrypoint, :func:`generate_drafts`, reads the supplier
registry, asks :func:`outreach.registry.eligible_for_contact` for the
opted-in and rate-limit-cleared subset, fills a plain-text template, and
writes the result to ``outreach/drafts/{supplier_id}_{YYYY-MM-DD}.txt`` —
a file the human reviews before deciding whether to send anything.

A global kill switch is honored: if a file named ``outreach/PAUSED``
exists (regardless of contents), :func:`generate_drafts` returns
immediately without producing or overwriting any draft.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path
from typing import Iterable

import yaml

from outreach import registry
from outreach.registry import _has_explicit_opt_in, _rate_limit_elapsed

OUTREACH_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = OUTREACH_DIR / "templates"
DRAFTS_DIR = OUTREACH_DIR / "drafts"
PAUSED_FILE = OUTREACH_DIR / "PAUSED"
SITE_CONFIG = OUTREACH_DIR.parent / "_config.yml"

DEFAULT_TEMPLATE = "price_inquiry"
VALID_TEMPLATES: frozenset[str] = frozenset({"price_inquiry", "follow_up"})


def _load_site_metadata() -> dict[str, str]:
    """Pull sender_name and site_url from the Jekyll ``_config.yml``."""
    with SITE_CONFIG.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    return {
        "sender_name": str(data.get("author") or "").strip(),
        "site_url": str(data.get("url") or "").strip(),
    }


def _load_template(template_name: str) -> str:
    if template_name not in VALID_TEMPLATES:
        raise ValueError(
            f"unknown template {template_name!r}; "
            f"choose from {sorted(VALID_TEMPLATES)}"
        )
    return (TEMPLATES_DIR / f"{template_name}.txt").read_text(encoding="utf-8")


def _format_elements(elements: Iterable[str] | None) -> str:
    if not elements:
        return "(no elements listed in registry)"
    return ", ".join(str(e) for e in elements)


def _render(template_text: str, *, supplier: dict, site: dict[str, str]) -> str:
    return template_text.format(
        supplier_name=supplier.get("name") or supplier.get("id") or "",
        elements=_format_elements(supplier.get("elements_supplied")),
        sender_name=site["sender_name"],
        site_url=site["site_url"],
    )


def _draft_path(supplier_id: str, today: date) -> Path:
    return DRAFTS_DIR / f"{supplier_id}_{today.isoformat()}.txt"


def _wrap_with_header(
    body: str, *, supplier: dict, today: date, template_name: str
) -> str:
    """Prepend a maintainer-only metadata block above the message body.

    Lines beginning with ``#`` and the ``=====`` separator are NOT meant to
    be sent — the maintainer copies everything below the separator.
    """
    sid = supplier.get("id") or ""
    header_lines = [
        "# DRAFT — DO NOT INCLUDE THIS HEADER WHEN YOU SEND.",
        "# Everything below the ===== separator is the message body.",
        "# Nothing in this file has been sent.",
        "#",
        f"# Supplier id:    {sid}",
        f"# Supplier name:  {supplier.get('name', '')}",
        f"# Contact method: {supplier.get('contact_method', '')}",
        f"# Contact value:  {supplier.get('contact_value', '')}",
        f"# Template:       {template_name}",
        f"# Generated:      {today.isoformat()}",
        "#",
        "# After you actually send this message from your own client, run:",
        "#",
        "#   python -c \"from outreach.registry import record_contact;"
        f" record_contact('{sid}')\"",
        "#",
        "# so the per-supplier rate limit is respected on the next run.",
        "# =====================================================================",
        "",
    ]
    return "\n".join(header_lines) + body


def generate_drafts(
    template_name: str = DEFAULT_TEMPLATE,
    *,
    today: date | None = None,
) -> dict:
    """Render a draft for each eligible supplier; return a summary dict.

    Honors the global kill switch: if ``outreach/PAUSED`` exists, returns
    without reading the registry or writing anything.
    """
    if PAUSED_FILE.exists():
        print(
            f"outreach is PAUSED ({PAUSED_FILE} exists); no drafts generated. "
            "Remove that file to resume."
        )
        return {
            "paused": True,
            "generated": [],
            "skipped_not_opted_in": [],
            "skipped_rate_limited": [],
            "skipped_existing": [],
        }

    if today is None:
        today = date.today()

    suppliers = registry.load_suppliers()
    eligible = registry.eligible_for_contact(suppliers, today=today)

    not_opted_in = [s for s in suppliers if not _has_explicit_opt_in(s)]
    rate_limited = [
        s
        for s in suppliers
        if _has_explicit_opt_in(s) and not _rate_limit_elapsed(s, today)
    ]

    site = _load_site_metadata()
    template_text = _load_template(template_name)

    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

    generated: list[Path] = []
    skipped_existing: list[str] = []

    for supplier in eligible:
        supplier_id = supplier.get("id")
        if not supplier_id:
            continue
        path = _draft_path(supplier_id, today)
        if path.exists():
            skipped_existing.append(supplier_id)
            continue
        rendered = _render(template_text, supplier=supplier, site=site)
        with_header = _wrap_with_header(
            rendered, supplier=supplier, today=today, template_name=template_name
        )
        path.write_text(with_header, encoding="utf-8")
        generated.append(path)

    summary = {
        "paused": False,
        "generated": [str(p) for p in generated],
        "skipped_not_opted_in": [s.get("id") for s in not_opted_in],
        "skipped_rate_limited": [s.get("id") for s in rate_limited],
        "skipped_existing": skipped_existing,
    }
    _print_summary(summary, today=today, template_name=template_name)
    return summary


def _print_summary(summary: dict, *, today: date, template_name: str) -> None:
    print(f"outreach.draft: template={template_name} date={today.isoformat()}")
    print(f"  drafts generated: {len(summary['generated'])}")
    for path in summary["generated"]:
        rel = Path(path).relative_to(OUTREACH_DIR.parent)
        print(f"    + {rel}")

    n_not = len(summary["skipped_not_opted_in"])
    print(f"  skipped — not opted in: {n_not}")
    for sid in summary["skipped_not_opted_in"]:
        print(f"    - {sid}")

    n_rate = len(summary["skipped_rate_limited"])
    print(f"  skipped — rate-limited (contacted too recently): {n_rate}")
    for sid in summary["skipped_rate_limited"]:
        print(f"    - {sid}")

    n_exist = len(summary["skipped_existing"])
    if n_exist:
        print(f"  skipped — draft already exists for today: {n_exist}")
        for sid in summary["skipped_existing"]:
            print(f"    - {sid}")

    if summary["generated"]:
        print(
            "\nReview the files in outreach/drafts/ before doing anything with them.\n"
            "After you actually send a draft from your own email client, run\n"
            "registry.record_contact(\"<supplier-id>\") so the rate limit\n"
            "is respected on the next run."
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate plain-text outreach drafts for opted-in, rate-limit-cleared "
            "suppliers. Drafts are reviewed and sent BY HAND — this script never "
            "transmits anything."
        )
    )
    parser.add_argument(
        "--template",
        default=DEFAULT_TEMPLATE,
        choices=sorted(VALID_TEMPLATES),
        help=(
            "template to fill (default: price_inquiry). "
            "Use 'follow_up' only when revisiting a supplier you already wrote to."
        ),
    )
    args = parser.parse_args(argv)
    generate_drafts(template_name=args.template)
    return 0


if __name__ == "__main__":
    sys.exit(main())
