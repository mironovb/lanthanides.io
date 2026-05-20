#!/usr/bin/env python3
"""Time-series price history layer.

Each element has a YAML file at ``_data/price_history/<symbol>.yml`` holding an
array of dated price observations. This module is the canonical reader/writer
for that data.

Observation schema (per entry in the ``observations`` list):
    date            ISO 8601 string (YYYY-MM-DD), required, must not be in the future
    tier            one of {"retail", "lab", "bulk"}, required
    price_per_kg    positive number (USD by default), required
    currency        ISO 4217 string (defaults to "USD" if absent)
    source          non-empty string identifier, required
    form            optional ("metal", "oxide", ...)
    purity          optional ("99.9% (3N)", ...)
    estimated_date  optional bool; true when the date was inferred rather than
                    observed (e.g. file mtime fallback during ingestion)

Functions never fabricate values: missing fields cause an observation to be
rejected and logged, not silently filled.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import median
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
HISTORY_DIR = PROJECT_ROOT / "_data" / "price_history"

VALID_TIERS: frozenset[str] = frozenset({"retail", "lab", "bulk"})
REQUIRED_FIELDS: frozenset[str] = frozenset({"date", "tier", "price_per_kg", "source"})

logger = logging.getLogger(__name__)


def _history_path(symbol: str) -> Path:
    return HISTORY_DIR / f"{symbol}.yml"


def _parse_date(value: Any) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def _coerce_price(value: Any) -> float:
    return float(value)


def load_history(symbol: str) -> list[dict]:
    """Return the list of observations for ``symbol``, or [] if no file exists."""
    path = _history_path(symbol)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        return []
    observations = data.get("observations") or []
    if not isinstance(observations, list):
        return []
    return [obs for obs in observations if isinstance(obs, dict)]


def validate_observation(obs: dict) -> tuple[bool, str]:
    """Return (ok, message). Message is empty when ok."""
    if not isinstance(obs, dict):
        return False, "observation is not a mapping"

    missing = [f for f in REQUIRED_FIELDS if obs.get(f) in (None, "")]
    if missing:
        return False, f"missing required field(s): {sorted(missing)}"

    try:
        price = _coerce_price(obs["price_per_kg"])
    except (TypeError, ValueError):
        return False, f"price_per_kg is not numeric: {obs.get('price_per_kg')!r}"
    if price <= 0:
        return False, f"price_per_kg must be > 0 (got {price})"

    try:
        observed = _parse_date(obs["date"])
    except (TypeError, ValueError):
        return False, f"invalid date: {obs.get('date')!r}"
    if observed > date.today():
        return False, f"date is in the future: {observed.isoformat()}"

    tier = obs["tier"]
    if tier not in VALID_TIERS:
        return False, (
            f"invalid tier: {tier!r} (expected one of {sorted(VALID_TIERS)})"
        )

    source = str(obs["source"]).strip()
    if not source:
        return False, "source is empty"

    return True, ""


def _normalize_observation(obs: dict) -> dict:
    """Return a copy of ``obs`` with date stringified, price as float, currency defaulted."""
    out = dict(obs)
    out["date"] = _parse_date(obs["date"]).isoformat()
    out["price_per_kg"] = _coerce_price(obs["price_per_kg"])
    out.setdefault("currency", "USD")
    out["source"] = str(obs["source"]).strip()
    return out


def _write_history(symbol: str, observations: list[dict]) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"symbol": symbol, "observations": observations}
    with open(_history_path(symbol), "w", encoding="utf-8") as f:
        yaml.safe_dump(payload, f, sort_keys=False, allow_unicode=True)


def append_observation(symbol: str, obs: dict) -> bool:
    """Validate and append ``obs`` to ``symbol``'s history file.

    Returns True on success. Returns False (and logs a warning) when validation
    fails or when an observation with the same (date, tier, source) already
    exists.
    """
    ok, message = validate_observation(obs)
    if not ok:
        logger.warning(
            "Rejected observation for %s: %s | obs=%r", symbol, message, obs
        )
        return False

    normalized = _normalize_observation(obs)
    history = load_history(symbol)
    new_key = (normalized["date"], normalized["tier"], normalized["source"])

    for existing in history:
        try:
            existing_key = (
                _parse_date(existing["date"]).isoformat(),
                existing.get("tier"),
                str(existing.get("source", "")).strip(),
            )
        except (KeyError, ValueError, TypeError):
            continue
        if existing_key == new_key:
            logger.warning(
                "Rejected duplicate observation for %s: (date=%s, tier=%s, source=%s)",
                symbol, *new_key,
            )
            return False

    history.append(normalized)
    history.sort(
        key=lambda o: (
            str(o.get("date", "")),
            str(o.get("tier", "")),
            str(o.get("source", "")),
        )
    )
    _write_history(symbol, history)
    return True


def latest(symbol: str, tier: str) -> dict | None:
    """Return the most recent observation for (symbol, tier), or None."""
    if tier not in VALID_TIERS:
        return None
    candidates: list[tuple[date, dict]] = []
    for obs in load_history(symbol):
        if obs.get("tier") != tier:
            continue
        try:
            observed = _parse_date(obs["date"])
            price = _coerce_price(obs["price_per_kg"])
        except (KeyError, ValueError, TypeError):
            continue
        if price <= 0:
            continue
        candidates.append((observed, obs))
    if not candidates:
        return None
    candidates.sort(key=lambda t: t[0])
    return candidates[-1][1]


def compute_change(
    symbol: str, tier: str, window_days: int
) -> dict | None:
    """Compute price change for ``symbol`` in ``tier`` over the last ``window_days``.

    Returns ``{start_price, end_price, abs_change, pct_change, start_date,
    end_date, window_days, observations_in_window}`` or ``None`` if there is
    not enough data to compute a meaningful change.

    Multiple observations on the same day are aggregated by median before
    comparison so the result does not depend on which seller happened to be
    listed first.
    """
    if tier not in VALID_TIERS or window_days <= 0:
        return None

    by_day: dict[date, list[float]] = {}
    for obs in load_history(symbol):
        if obs.get("tier") != tier:
            continue
        try:
            observed = _parse_date(obs["date"])
            price = _coerce_price(obs["price_per_kg"])
        except (KeyError, ValueError, TypeError):
            continue
        if price <= 0:
            continue
        by_day.setdefault(observed, []).append(price)

    if len(by_day) < 2:
        return None

    daily = sorted((d, float(median(prices))) for d, prices in by_day.items())
    end_date, end_price = daily[-1]
    cutoff = end_date - timedelta(days=window_days)
    in_window = [(d, p) for (d, p) in daily[:-1] if d >= cutoff]
    if not in_window:
        return None

    start_date, start_price = in_window[0]
    abs_change = end_price - start_price
    pct_change = (abs_change / start_price) * 100.0 if start_price else None
    return {
        "start_price": start_price,
        "end_price": end_price,
        "abs_change": abs_change,
        "pct_change": pct_change,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "window_days": window_days,
        "observations_in_window": len(in_window) + 1,
    }
