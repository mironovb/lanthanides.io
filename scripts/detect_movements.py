#!/usr/bin/env python3
"""Detect significant price movements and emit factual events to ``_data/movements.yml``.

Reads ``_data/fluctuations.json`` (computed upstream by ``scripts/fluctuations.py``)
plus the per-element time-series in ``_data/price_history/`` to detect:

* ``price_spike`` / ``price_drop`` — any tier crossing the percent-change
  threshold over the configurable rolling window (default 30d, ≥10%).
* ``regulatory_change`` — element's ``regulatory_status`` or
  ``cn_export_control`` flag flipped relative to the previous run.
* ``new_data`` — first time observations for an element appear in the
  fluctuations dataset.

Idempotency: re-running on unchanged inputs is a no-op. Events are
deduplicated by a stable ``id`` derived from ``(symbol, tier, window,
end_date)`` for price events and from ``(symbol, kind, date)`` for the
others. The script also persists a regulatory-state snapshot inside
``movements.yml`` under ``state:`` so regulatory deltas can be detected
without an external sidecar file.

Editorial content stays in ``_data/news.yml``; this writer only emits
auto-generated factual events.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from price_history import HISTORY_DIR, _coerce_price, _parse_date, load_history

FLUCTUATIONS_PATH = PROJECT_ROOT / "_data" / "fluctuations.json"
CATALOG_PATH = PROJECT_ROOT / "_data" / "element_catalog.yml"
OUTPUT_PATH = PROJECT_ROOT / "_data" / "movements.yml"

DEFAULT_THRESHOLD_PCT = 10.0
DEFAULT_WINDOW = "30d"

SPARKLINE_W = 120
SPARKLINE_H = 28
SPARKLINE_PAD = 3  # vertical padding so peaks/troughs aren't on the edge

# Tiers we care about for price-movement detection, in display order.
TIERS = ("retail", "bulk", "lab")

TIER_LABELS = {"retail": "retail", "bulk": "bulk", "lab": "lab"}


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_catalog() -> list[dict]:
    if not CATALOG_PATH.exists():
        return []
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or []
    return data if isinstance(data, list) else []


def catalog_index(catalog: list[dict]) -> dict[str, dict]:
    return {c["symbol"]: c for c in catalog if isinstance(c, dict) and c.get("symbol")}


def load_fluctuations() -> dict:
    if not FLUCTUATIONS_PATH.exists():
        return {}
    with open(FLUCTUATIONS_PATH, "r", encoding="utf-8") as f:
        return json.load(f) or {}


def load_existing_movements() -> dict:
    if not OUTPUT_PATH.exists():
        return {"config": {}, "state": {"regulatory": {}}, "events": []}
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        doc = yaml.safe_load(f) or {}
    doc.setdefault("config", {})
    doc.setdefault("state", {})
    doc["state"].setdefault("regulatory", {})
    doc.setdefault("events", [])
    if not isinstance(doc["events"], list):
        doc["events"] = []
    return doc


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def format_price(price: float) -> str:
    if price >= 10000:
        return f"${price:,.0f}"
    if price >= 1000:
        return f"${price:,.0f}"
    if price >= 100:
        return f"${price:.0f}"
    if price >= 10:
        return f"${price:.2f}"
    return f"${price:.3f}"


def format_pct(pct: float) -> str:
    magnitude = abs(pct)
    if magnitude >= 1000:
        return f"{pct:,.0f}%"
    if magnitude >= 100:
        return f"{pct:.0f}%"
    return f"{pct:.1f}%"


# ---------------------------------------------------------------------------
# Sparkline (server-side SVG path)
# ---------------------------------------------------------------------------

def daily_median_series(symbol: str, tier: str) -> list[tuple[date, float]]:
    """Return ``[(date, median_price)]`` for individual (non-aggregate) obs."""
    by_day: dict[date, list[float]] = {}
    for obs in load_history(symbol):
        if obs.get("tier") != tier:
            continue
        if str(obs.get("source", "")).strip() == "median_aggregate":
            continue
        try:
            d = _parse_date(obs["date"])
            p = _coerce_price(obs["price_per_kg"])
        except (KeyError, TypeError, ValueError):
            continue
        if p <= 0:
            continue
        by_day.setdefault(d, []).append(p)
    return sorted((d, float(median(prices))) for d, prices in by_day.items())


def build_sparkline(
    symbol: str, tier: str, start_iso: str, end_iso: str
) -> dict | None:
    """Return ``{width, height, path, point_count, min_price, max_price}`` for
    the daily-median series in [start_iso, end_iso], or ``None`` when there
    are fewer than two points to plot."""
    try:
        start = _parse_date(start_iso)
        end = _parse_date(end_iso)
    except (TypeError, ValueError):
        return None

    series = [(d, p) for d, p in daily_median_series(symbol, tier) if start <= d <= end]
    if len(series) < 2:
        return None

    prices = [p for _, p in series]
    p_min = min(prices)
    p_max = max(prices)
    span_days = (end - start).days or 1
    plot_h = SPARKLINE_H - 2 * SPARKLINE_PAD
    price_range = (p_max - p_min) or 1.0

    coords: list[tuple[float, float]] = []
    for d, p in series:
        x = ((d - start).days / span_days) * (SPARKLINE_W - 2 * SPARKLINE_PAD) + SPARKLINE_PAD
        y = SPARKLINE_H - SPARKLINE_PAD - ((p - p_min) / price_range) * plot_h
        coords.append((round(x, 2), round(y, 2)))

    path_segments = [f"M{coords[0][0]},{coords[0][1]}"]
    for x, y in coords[1:]:
        path_segments.append(f"L{x},{y}")
    path = " ".join(path_segments)

    return {
        "width": SPARKLINE_W,
        "height": SPARKLINE_H,
        "path": path,
        "point_count": len(coords),
        "min_price": round(p_min, 4),
        "max_price": round(p_max, 4),
        # Last-point marker so the renderer can draw a dot at the latest price.
        "last_x": coords[-1][0],
        "last_y": coords[-1][1],
    }


# ---------------------------------------------------------------------------
# Price-movement detection
# ---------------------------------------------------------------------------

def build_price_event(
    symbol: str,
    name: str,
    tier: str,
    window_label: str,
    window: dict,
) -> dict:
    direction = window.get("direction", "flat")
    pct_change = float(window.get("pct_change", 0.0))
    event_type = (
        "price_spike" if direction == "up"
        else "price_drop" if direction == "down"
        else "price_flat"
    )

    start_iso = window["start_date"]
    end_iso = window["end_date"]
    start_price = float(window["start_price"])
    end_price = float(window["end_price"])
    obs_count = int(window.get("observations_in_window", 0))
    distinct_days = int(window.get("distinct_days_in_window", 0))
    confidence = str(window.get("confidence", "low"))
    actual_span_days = int(window.get("actual_span_days", 0))

    verb = "rose" if direction == "up" else "fell" if direction == "down" else "was flat"
    direction_pct = format_pct(abs(pct_change))
    description = (
        f"{name} {TIER_LABELS.get(tier, tier)} price {verb} "
        f"{direction_pct} over {actual_span_days} day"
        f"{'s' if actual_span_days != 1 else ''} "
        f"(window {window_label}), from {format_price(start_price)}/kg "
        f"to {format_price(end_price)}/kg "
        f"({obs_count} observation{'s' if obs_count != 1 else ''} "
        f"across {distinct_days} day{'s' if distinct_days != 1 else ''})."
    )

    event = {
        "id": f"{symbol}-{tier}-{window_label}-{end_iso}",
        "date": end_iso,
        "element": symbol,
        "element_name": name,
        "element_url": ELEMENT_URL.format(symbol=symbol),
        "type": event_type,
        "tier": tier,
        "tier_label": TIER_LABELS.get(tier, tier),
        "window": window_label,
        "direction": direction,
        "magnitude_pct": round(pct_change, 2),
        "abs_magnitude_pct": round(abs(pct_change), 2),
        "start_date": start_iso,
        "end_date": end_iso,
        "start_price_per_kg": round(start_price, 4),
        "end_price_per_kg": round(end_price, 4),
        "currency": "USD",
        "confidence": confidence,
        "observation_count": obs_count,
        "distinct_days": distinct_days,
        "actual_span_days": actual_span_days,
        "description": description,
        "source": "fluctuations.json",
    }

    sparkline = build_sparkline(symbol, tier, start_iso, end_iso)
    if sparkline:
        event["sparkline"] = sparkline
    return event


def detect_price_movements(
    fluctuations: dict,
    catalog: dict[str, dict],
    threshold_pct: float,
    window_label: str,
) -> list[dict]:
    events: list[dict] = []
    elements = (fluctuations.get("elements") or {})
    for symbol, entry in sorted(elements.items()):
        name = (catalog.get(symbol) or {}).get("name") or symbol
        tiers = (entry.get("tiers") or {})
        for tier in TIERS:
            tier_block = tiers.get(tier) or {}
            windows = tier_block.get("windows") or {}
            window = windows.get(window_label)
            if not window:
                continue
            try:
                pct_change = float(window.get("pct_change", 0.0))
            except (TypeError, ValueError):
                continue
            if abs(pct_change) < threshold_pct:
                continue
            events.append(build_price_event(symbol, name, tier, window_label, window))
    return events


# ---------------------------------------------------------------------------
# Regulatory-change detection (via persisted snapshot in movements.yml)
# ---------------------------------------------------------------------------

def regulatory_signature(catalog_entry: dict) -> str:
    """Compact, stable signature for delta detection."""
    status = str(catalog_entry.get("regulatory_status") or "none")
    controlled = bool(catalog_entry.get("cn_export_control"))
    export_status = str(catalog_entry.get("export_control_status") or "normal")
    return f"{status}|controlled={'yes' if controlled else 'no'}|{export_status}"


def regulatory_description(symbol: str, name: str, prev: str | None, curr: str) -> str:
    if prev is None:
        return f"{name} ({symbol}) regulatory state recorded: {curr.replace('|', '; ')}."
    if prev == curr:
        return f"{name} ({symbol}) regulatory state unchanged: {curr.replace('|', '; ')}."
    return (
        f"{name} ({symbol}) regulatory state changed from "
        f"[{prev.replace('|', '; ')}] to [{curr.replace('|', '; ')}]."
    )


def detect_regulatory_changes(
    catalog: dict[str, dict],
    prior_state: dict[str, str],
    today_iso: str,
    bootstrap: bool,
) -> tuple[list[dict], dict[str, str]]:
    """Compare catalog signatures against ``prior_state``. Returns
    ``(events, new_state)`` — events is empty on first run when ``bootstrap``
    is set."""
    new_state: dict[str, str] = {}
    events: list[dict] = []
    for symbol, entry in sorted(catalog.items()):
        curr = regulatory_signature(entry)
        new_state[symbol] = curr
        prev = prior_state.get(symbol)
        if prev == curr:
            continue
        if prev is None and bootstrap:
            # Seeding the baseline — don't emit a noisy "first time we saw it" event.
            continue
        name = entry.get("name") or symbol
        events.append({
            "id": f"reg-{symbol}-{today_iso}",
            "date": today_iso,
            "element": symbol,
            "element_name": name,
            "element_url": ELEMENT_URL.format(symbol=symbol),
            "type": "regulatory_change",
            "description": regulatory_description(symbol, name, prev, curr),
            "prior_signature": prev,
            "current_signature": curr,
            "source": "element_catalog.yml",
        })
    return events, new_state


# ---------------------------------------------------------------------------
# New-data detection
# ---------------------------------------------------------------------------

def detect_new_data_events(
    fluctuations: dict,
    catalog: dict[str, dict],
    existing_ids: set[str],
) -> list[dict]:
    events: list[dict] = []
    elements = (fluctuations.get("elements") or {})
    for symbol, entry in sorted(elements.items()):
        data_since = entry.get("data_since")
        if not data_since:
            continue
        event_id = f"new-{symbol}-{data_since}"
        if event_id in existing_ids:
            continue
        # Only emit if this is genuinely the element's data debut — i.e. no
        # prior event for this symbol exists in the feed.
        name = (catalog.get(symbol) or {}).get("name") or symbol
        obs_count = int(entry.get("observation_count") or 0)
        distinct_days = int(entry.get("distinct_days") or 0)
        if obs_count <= 0:
            continue
        events.append({
            "id": event_id,
            "date": data_since,
            "element": symbol,
            "element_name": name,
            "element_url": ELEMENT_URL.format(symbol=symbol),
            "type": "new_data",
            "description": (
                f"{name} ({symbol}) now tracked: {obs_count} observation"
                f"{'s' if obs_count != 1 else ''} across {distinct_days} day"
                f"{'s' if distinct_days != 1 else ''} starting {data_since}."
            ),
            "observation_count": obs_count,
            "distinct_days": distinct_days,
            "source": "fluctuations.json",
        })
    return events


# ---------------------------------------------------------------------------
# Writer
# ---------------------------------------------------------------------------

ELEMENT_URL = "/elements/{symbol}/"

HEADER_COMMENT = (
    "# Auto-generated price-movement and regulatory-change events.\n"
    "# Regenerate via scripts/detect_movements.py — do not edit by hand.\n"
    "# Editorial articles stay in _data/news.yml; this file is the factual,\n"
    "# data-driven feed.\n"
)


def dump_movements(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(HEADER_COMMENT)
        yaml.safe_dump(
            doc,
            f,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
            width=100,
        )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def merge_events(existing: list[dict], new: list[dict]) -> tuple[list[dict], int]:
    by_id = {e.get("id"): e for e in existing if isinstance(e, dict) and e.get("id")}
    added = 0
    for event in new:
        eid = event.get("id")
        if not eid:
            continue
        if eid in by_id:
            continue
        by_id[eid] = event
        added += 1
    merged = list(by_id.values())
    merged.sort(key=lambda e: (str(e.get("date") or ""), str(e.get("id") or "")), reverse=True)
    return merged, added


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--threshold-pct",
        type=float,
        default=DEFAULT_THRESHOLD_PCT,
        help=f"Minimum |%% change| to flag a movement (default {DEFAULT_THRESHOLD_PCT}).",
    )
    parser.add_argument(
        "--window",
        default=DEFAULT_WINDOW,
        choices=("7d", "30d", "90d", "1y"),
        help=f"Rolling window to evaluate (default {DEFAULT_WINDOW}).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Where to write movements.yml (default {OUTPUT_PATH}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and log a summary without writing the file.",
    )
    parser.add_argument(
        "--no-regulatory",
        action="store_true",
        help="Skip regulatory_change detection (price events only).",
    )
    parser.add_argument(
        "--no-new-data",
        action="store_true",
        help="Skip new_data detection.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable DEBUG logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )
    logger = logging.getLogger("detect_movements")

    fluctuations = load_fluctuations()
    if not fluctuations.get("elements"):
        logger.warning(
            "No fluctuations data at %s — run scripts/fluctuations.py first.",
            FLUCTUATIONS_PATH,
        )

    catalog = catalog_index(load_catalog())
    existing = load_existing_movements()
    existing_events: list[dict] = existing.get("events") or []
    existing_ids = {e.get("id") for e in existing_events if isinstance(e, dict)}
    prior_state: dict[str, str] = (existing.get("state") or {}).get("regulatory") or {}
    is_bootstrap = not prior_state and not existing_events

    price_events = detect_price_movements(
        fluctuations, catalog, args.threshold_pct, args.window
    )
    new_data_events: list[dict] = []
    if not args.no_new_data:
        new_data_events = detect_new_data_events(fluctuations, catalog, existing_ids)
    reg_events: list[dict] = []
    new_state = prior_state
    if not args.no_regulatory:
        today_iso = date.today().isoformat()
        reg_events, new_state = detect_regulatory_changes(
            catalog, prior_state, today_iso, bootstrap=is_bootstrap
        )

    candidate = price_events + reg_events + new_data_events
    merged, added = merge_events(existing_events, candidate)

    doc = {
        "config": {
            "threshold_pct": args.threshold_pct,
            "window": args.window,
            "tiers": list(TIERS),
        },
        "state": {
            "regulatory": new_state,
            "last_run": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "events": merged,
    }

    logger.info(
        "Detected %d candidate events (price=%d, regulatory=%d, new_data=%d) — %d new.",
        len(candidate), len(price_events), len(reg_events), len(new_data_events), added,
    )

    if args.dry_run:
        logger.info("Dry run — not writing to %s", args.output)
        return 0

    dump_movements(args.output, doc)
    logger.info("Wrote %s (%d total events).", args.output, len(merged))
    return 0


if __name__ == "__main__":
    sys.exit(main())
