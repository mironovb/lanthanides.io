#!/usr/bin/env python3
"""Compute price-change metrics from the time-series in ``_data/price_history/``.

For each element and tier (retail / lab / bulk), derive change metrics over the
standard rolling windows (7d, 30d, 90d, 1y, all-time) ending at the latest
observation in that tier. Results are written to
``assets/data/fluctuations.json`` for the front end to consume.

Design principles:
  * No fabrication. A window with fewer than 2 distinct daily observations
    returns ``null`` — never an extrapolated value.
  * Daily aggregation. Multiple same-day observations are collapsed to a
    single per-day median before any change is computed, so results don't
    depend on which seller happened to be listed first.
  * Curator-supplied ``source: median_aggregate`` observations are excluded
    from change computations to avoid double-counting (they're medians of
    other observations). They are still considered when picking the
    "latest" displayed price, where they're the canonical signal.
  * Changes whose magnitude is below ``FLAT_THRESHOLD_PCT`` are reported as
    ``"flat"`` rather than ``"up"`` / ``"down"``.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from price_history import (
    HISTORY_DIR,
    VALID_TIERS,
    _coerce_price,
    _parse_date,
    load_history,
)

PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = PROJECT_ROOT / "assets" / "data" / "fluctuations.json"
DATA_OUTPUT_PATH = PROJECT_ROOT / "_data" / "fluctuations.json"

# Rolling windows. ``None`` means "all-time" (earliest to latest).
STANDARD_WINDOWS: list[tuple[str, int | None]] = [
    ("7d", 7),
    ("30d", 30),
    ("90d", 90),
    ("1y", 365),
    ("all_time", None),
]

# Absolute percent change under this threshold is reported as "flat".
FLAT_THRESHOLD_PCT = 1.0

AGGREGATE_SOURCE = "median_aggregate"


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def _is_aggregate(obs: dict) -> bool:
    return str(obs.get("source", "")).strip() == AGGREGATE_SOURCE


def _bucket_by_day(
    observations: list[dict], tier: str
) -> dict[date, list[float]]:
    """Group valid non-aggregate prices for ``tier`` by observation date."""
    by_day: dict[date, list[float]] = {}
    for obs in observations:
        if obs.get("tier") != tier or _is_aggregate(obs):
            continue
        try:
            obs_date = _parse_date(obs["date"])
            price = _coerce_price(obs["price_per_kg"])
        except (KeyError, TypeError, ValueError):
            continue
        if price <= 0:
            continue
        by_day.setdefault(obs_date, []).append(price)
    return by_day


def _classify_direction(pct_change: float) -> str:
    if abs(pct_change) < FLAT_THRESHOLD_PCT:
        return "flat"
    return "up" if pct_change > 0 else "down"


def _confidence_label(distinct_days: int, observations: int) -> str:
    if distinct_days >= 5 and observations >= 8:
        return "high"
    if distinct_days >= 3:
        return "medium"
    return "low"


def _form_summary(observations: list[dict]) -> str | None:
    forms = sorted({
        str(o["form"]).strip()
        for o in observations
        if o.get("form") and str(o["form"]).strip()
    })
    return ", ".join(forms) if forms else None


def _source_list(observations: list[dict]) -> list[str]:
    return sorted({
        str(o["source"]).strip()
        for o in observations
        if o.get("source") and str(o["source"]).strip()
    })


# ---------------------------------------------------------------------------
# Core computation
# ---------------------------------------------------------------------------

def compute_window_change(
    observations: list[dict],
    tier: str,
    window_days: int | None,
) -> dict | None:
    """Return change metrics for ``tier`` over a window ending at the latest
    observation, or ``None`` when fewer than 2 distinct daily observations
    fall inside the window.

    ``window_days=None`` requests an all-time comparison (earliest to latest).
    """
    by_day = _bucket_by_day(observations, tier)
    if len(by_day) < 2:
        return None

    daily = sorted((d, float(median(prices))) for d, prices in by_day.items())
    end_date, end_price = daily[-1]

    if window_days is None:
        in_range_daily = daily
        observations_in_range = sum(len(p) for p in by_day.values())
    else:
        cutoff = end_date - timedelta(days=window_days)
        in_range_daily = [(d, p) for d, p in daily if d >= cutoff]
        observations_in_range = sum(
            len(prices) for d, prices in by_day.items() if d >= cutoff
        )

    if len(in_range_daily) < 2:
        return None

    start_date, start_price = in_range_daily[0]
    if start_price <= 0:
        return None

    abs_change = end_price - start_price
    pct_change = (abs_change / start_price) * 100.0
    distinct_days = len(in_range_daily)
    span_days = (end_date - start_date).days

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "start_price": round(start_price, 4),
        "end_price": round(end_price, 4),
        "abs_change": round(abs_change, 4),
        "pct_change": round(pct_change, 2),
        "direction": _classify_direction(pct_change),
        "window_days": window_days,
        "actual_span_days": span_days,
        "distinct_days_in_window": distinct_days,
        "observations_in_window": observations_in_range,
        "confidence": _confidence_label(distinct_days, observations_in_range),
        "confidence_note": (
            f"Based on {observations_in_range} observation(s) across "
            f"{distinct_days} distinct day(s), spanning {span_days} day(s)."
        ),
    }


# ---------------------------------------------------------------------------
# Latest-price selection
# ---------------------------------------------------------------------------

def latest_price(observations: list[dict], tier: str) -> dict | None:
    """Return the latest displayable price for ``tier``.

    Prefers a curator-supplied ``median_aggregate`` observation on the most
    recent date; otherwise computes a same-day median of individual offers.
    Returns ``None`` when no valid observation exists for that tier.
    """
    aggregate_by_date: dict[date, dict] = {}
    individuals_by_date: dict[date, list[dict]] = {}

    for obs in observations:
        if obs.get("tier") != tier:
            continue
        try:
            obs_date = _parse_date(obs["date"])
            price = _coerce_price(obs["price_per_kg"])
        except (KeyError, TypeError, ValueError):
            continue
        if price <= 0:
            continue
        if _is_aggregate(obs):
            aggregate_by_date[obs_date] = obs
        else:
            individuals_by_date.setdefault(obs_date, []).append(obs)

    if not aggregate_by_date and not individuals_by_date:
        return None

    latest_date = max(set(aggregate_by_date) | set(individuals_by_date))
    individuals_same_day = individuals_by_date.get(latest_date, [])

    if latest_date in aggregate_by_date:
        aggregate = aggregate_by_date[latest_date]
        price = float(aggregate["price_per_kg"])
        form_value = aggregate.get("form")
        return {
            "price_per_kg": round(price, 4),
            "currency": str(aggregate.get("currency", "USD")),
            "date": latest_date.isoformat(),
            "source_type": "median_aggregate",
            "contributing_observations": len(individuals_same_day),
            "form_summary": (
                str(form_value).strip()
                if form_value
                else _form_summary(individuals_same_day)
            ),
            "sources": _source_list(individuals_same_day),
            "notes": aggregate.get("notes"),
        }

    prices = sorted(float(o["price_per_kg"]) for o in individuals_same_day)
    return {
        "price_per_kg": round(float(median(prices)), 4),
        "currency": "USD",
        "date": latest_date.isoformat(),
        "source_type": "individual_median",
        "contributing_observations": len(individuals_same_day),
        "form_summary": _form_summary(individuals_same_day),
        "sources": _source_list(individuals_same_day),
        "notes": None,
    }


# ---------------------------------------------------------------------------
# Per-element assembly
# ---------------------------------------------------------------------------

def _classify_quality(distinct_days: int, observation_count: int) -> str:
    if observation_count < 2 or distinct_days < 2:
        return "sparse"
    if distinct_days >= 4:
        return "rich"
    return "moderate"


def build_element_fluctuations(observations: list[dict]) -> dict:
    """Return the JSON-ready fluctuation block for a single element."""
    valid_dates: list[date] = []
    individual_count = 0
    for obs in observations:
        try:
            obs_date = _parse_date(obs["date"])
            price = _coerce_price(obs["price_per_kg"])
        except (KeyError, TypeError, ValueError):
            continue
        if price <= 0 or obs.get("tier") not in VALID_TIERS:
            continue
        valid_dates.append(obs_date)
        if not _is_aggregate(obs):
            individual_count += 1

    distinct_days_total = len({d for d in valid_dates})
    quality = _classify_quality(distinct_days_total, individual_count)

    tiers_result: dict[str, dict] = {}
    for tier in sorted(VALID_TIERS):
        by_day = _bucket_by_day(observations, tier)
        windows: dict[str, dict | None] = {}
        for label, window_days in STANDARD_WINDOWS:
            windows[label] = compute_window_change(observations, tier, window_days)
        tiers_result[tier] = {
            "observation_count": sum(len(p) for p in by_day.values()),
            "distinct_days": len(by_day),
            "windows": windows,
        }

    return {
        "data_quality": quality,
        "observation_count": individual_count,
        "distinct_days": distinct_days_total,
        "data_since": min(valid_dates).isoformat() if valid_dates else None,
        "data_until": max(valid_dates).isoformat() if valid_dates else None,
        "latest_retail_price": latest_price(observations, "retail"),
        "latest_bulk_price": latest_price(observations, "bulk"),
        "latest_lab_price": latest_price(observations, "lab"),
        "tiers": tiers_result,
    }


def build_all_fluctuations() -> dict:
    elements: dict[str, dict] = {}
    if HISTORY_DIR.exists():
        for path in sorted(HISTORY_DIR.glob("*.yml")):
            symbol = path.stem
            elements[symbol] = build_element_fluctuations(load_history(symbol))
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "flat_threshold_pct": FLAT_THRESHOLD_PCT,
        "windows": [label for label, _ in STANDARD_WINDOWS],
        "elements": elements,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Where to write fluctuations.json (default: {OUTPUT_PATH}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and log a summary without writing the file.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable DEBUG-level logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )
    logger = logging.getLogger("fluctuations")

    if not HISTORY_DIR.exists():
        logger.error("History directory not found: %s", HISTORY_DIR)
        return 1

    payload = build_all_fluctuations()
    elements = payload["elements"]
    quality_counts = {"sparse": 0, "moderate": 0, "rich": 0}
    for entry in elements.values():
        quality_counts[entry["data_quality"]] = (
            quality_counts.get(entry["data_quality"], 0) + 1
        )
    logger.info(
        "Computed fluctuations for %d element(s): %d rich, %d moderate, %d sparse.",
        len(elements),
        quality_counts["rich"],
        quality_counts["moderate"],
        quality_counts["sparse"],
    )

    if args.dry_run:
        logger.info("Dry run — not writing to %s", args.output)
        return 0

    def _dump(path: Path) -> None:
        path = path.resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False, sort_keys=True)
            f.write("\n")
        logger.info("Wrote %s (%d elements).", path, len(elements))

    _dump(args.output)
    # Mirror into _data/ so Jekyll can render server-side via site.data.fluctuations.
    if args.output.resolve() != DATA_OUTPUT_PATH.resolve():
        _dump(DATA_OUTPUT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
