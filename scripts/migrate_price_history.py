#!/usr/bin/env python3
"""One-shot migration from existing price data into ``_data/price_history/``.

Sources read:
  * ``_data/price_records.json`` — every record becomes one raw observation.
  * ``_data/elements/<symbol>.yml`` — ``retail_reference`` and ``bulk_benchmark``
    blocks each become one aggregate observation tagged ``source: median_aggregate``.

No prices are invented or interpolated. Records that fail validation
(missing required fields, non-positive price, future dates, or unsupported
tier) are logged and skipped. Re-running this script overwrites the output
files with a deterministically-ordered list.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from price_history import HISTORY_DIR, _write_history, validate_observation

PROJECT_ROOT = SCRIPT_DIR.parent
RECORDS_FILE = PROJECT_ROOT / "_data" / "price_records.json"
ELEMENTS_DIR = PROJECT_ROOT / "_data" / "elements"

LAB_SOURCE_TYPES = {"lab_supplier"}

# Existing market_tier values in price_records.json are {retail, bulk, wholesale}.
# The canonical schema uses {retail, lab, bulk}. "wholesale" entries describe
# large-volume B2B quotes (benchmarks, RFQs, industry indices) and are
# semantically equivalent to "bulk" for the purposes of this time series.
TIER_MAP = {
    "retail": "retail",
    "bulk": "bulk",
    "wholesale": "bulk",
}


def derive_tier(record: dict) -> str | None:
    market_tier = record.get("market_tier")
    source_type = record.get("source_type")
    if market_tier == "retail" and source_type in LAB_SOURCE_TYPES:
        return "lab"
    return TIER_MAP.get(market_tier)


def derive_source(record: dict) -> str:
    sid = record.get("source_id")
    if sid and str(sid).strip():
        return str(sid).strip()
    seller = record.get("seller_name")
    if seller and str(seller).strip():
        return str(seller).strip()
    return ""


def observation_from_record(record: dict, logger: logging.Logger) -> dict | None:
    rec_id = record.get("id", "?")
    symbol = record.get("element_symbol")
    if not symbol:
        logger.warning("Skipping record id=%s: missing element_symbol", rec_id)
        return None

    tier = derive_tier(record)
    if tier is None:
        logger.warning(
            "Skipping record id=%s: cannot map market_tier=%r to canonical tier",
            rec_id, record.get("market_tier"),
        )
        return None

    price = record.get("normalized_usd_per_kg")
    if price is None:
        logger.warning("Skipping record id=%s: no normalized_usd_per_kg", rec_id)
        return None

    quote_date = record.get("quote_date")
    if not quote_date:
        logger.warning("Skipping record id=%s: no quote_date", rec_id)
        return None

    source = derive_source(record)
    if not source:
        logger.warning("Skipping record id=%s: no source_id or seller_name", rec_id)
        return None

    obs: dict = {
        "date": str(quote_date),
        "tier": tier,
        "price_per_kg": float(price),
        "currency": "USD",
        "source": source,
        "record_id": rec_id,
    }
    if record.get("form"):
        obs["form"] = record["form"]
    if record.get("purity"):
        obs["purity"] = record["purity"]
    if record.get("seller_name") and record["seller_name"] != source:
        obs["seller"] = record["seller_name"]
    if record.get("market_tier") == "wholesale":
        obs["original_tier"] = "wholesale"
    return obs


def observations_from_element_yaml(
    yaml_path: Path, logger: logging.Logger
) -> list[dict]:
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        return []
    out: list[dict] = []
    for block_name, tier in (("retail_reference", "retail"), ("bulk_benchmark", "bulk")):
        block = data.get(block_name)
        if not isinstance(block, dict):
            continue
        price = block.get("price_per_kg")
        ref_date = block.get("date")
        if price is None:
            continue

        estimated_date = False
        if not ref_date:
            mtime = datetime.fromtimestamp(yaml_path.stat().st_mtime).date()
            ref_date = mtime.isoformat()
            estimated_date = True
            logger.info(
                "%s/%s has no date; falling back to file mtime %s",
                yaml_path.stem, block_name, ref_date,
            )

        obs: dict = {
            "date": str(ref_date),
            "tier": tier,
            "price_per_kg": float(price),
            "currency": "USD",
            "source": "median_aggregate",
        }
        if block.get("form"):
            obs["form"] = block["form"]
        if block.get("source"):
            obs["notes"] = str(block["source"])
        if estimated_date:
            obs["estimated_date"] = True
        out.append(obs)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would be written, but don't touch _data/price_history/.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show DEBUG-level logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )
    logger = logging.getLogger("migrate_price_history")

    if not RECORDS_FILE.exists():
        logger.error("Records file not found: %s", RECORDS_FILE)
        return 1
    with open(RECORDS_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
    if not isinstance(records, list):
        logger.error("Expected a JSON array at %s", RECORDS_FILE)
        return 1
    logger.info("Loaded %d record(s) from %s", len(records), RECORDS_FILE.name)

    by_symbol: dict[str, list[dict]] = defaultdict(list)
    record_observations = 0
    rejected = 0

    for record in records:
        obs = observation_from_record(record, logger)
        if obs is None:
            rejected += 1
            continue
        ok, message = validate_observation(obs)
        if not ok:
            rejected += 1
            logger.warning(
                "Rejected record id=%s after build: %s | obs=%r",
                record.get("id"), message, obs,
            )
            continue
        by_symbol[record["element_symbol"]].append(obs)
        record_observations += 1

    logger.info(
        "Built %d observation(s) from price_records.json (%d rejected)",
        record_observations, rejected,
    )

    aggregate_observations = 0
    aggregate_rejected = 0
    if ELEMENTS_DIR.exists():
        for yaml_path in sorted(ELEMENTS_DIR.glob("*.yml")):
            for obs in observations_from_element_yaml(yaml_path, logger):
                ok, message = validate_observation(obs)
                if not ok:
                    aggregate_rejected += 1
                    logger.warning(
                        "Rejected aggregate obs for %s: %s | obs=%r",
                        yaml_path.stem, message, obs,
                    )
                    continue
                by_symbol[yaml_path.stem].append(obs)
                aggregate_observations += 1
    logger.info(
        "Pulled %d aggregate observation(s) from %s/ (%d rejected)",
        aggregate_observations, ELEMENTS_DIR.name, aggregate_rejected,
    )

    for symbol, observations in by_symbol.items():
        observations.sort(
            key=lambda o: (
                str(o["date"]),
                o["tier"],
                str(o.get("source", "")),
                str(o.get("record_id", "")),
            )
        )

    if args.dry_run:
        logger.info("Dry run — not writing any files.")
        for symbol, observations in sorted(by_symbol.items()):
            logger.info("  %s: %d observation(s)", symbol, len(observations))
        return 0

    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    for symbol, observations in sorted(by_symbol.items()):
        _write_history(symbol, observations)
        logger.info("Wrote %s: %d observation(s)", f"{symbol}.yml", len(observations))

    logger.info(
        "Migration complete: %d element file(s), %d observation(s) total, %d rejection(s).",
        len(by_symbol),
        record_observations + aggregate_observations,
        rejected + aggregate_rejected,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
