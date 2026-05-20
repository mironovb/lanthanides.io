#!/usr/bin/env python3
"""One-shot backfill: tag legacy price_history observations with a source_type.

The price_history schema gained ``source_type`` after the initial migration
from ``price_records.json``, so most existing observations carry no tag. The
new intake paths (public listings, supplier quotes, community submissions)
always set it, so the only rows lacking a tag are legacy. This script makes
their provenance explicit by inferring the category from the ``source``
identifier, using rules that match how that data was actually collected:

    median_aggregate                          -> aggregate
    sources naming a recognised PRA / index   -> benchmark
        (LME, Fastmarkets, SMM, Argus, USGS, IMARC, BusinessAnalytiq,
         Metal Industry Consulting, "discovery-alert")
    everything else                           -> public_listing
        (retailer SKUs, eBay sellers, Alibaba listings, specialty
         supplier IDs — these were collected from public listings)

The script never overwrites an existing source_type. It is safe to re-run.
After running it once, all observations carry an explicit provenance
category, and the source-breakdown page reflects what the data actually
contains rather than a uniform "uncategorised legacy" bucket.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
HISTORY_DIR = PROJECT_ROOT / "_data" / "price_history"


# Substrings (case-insensitive) that mark a source as a benchmark / PRA.
# A match anywhere in the source string is enough — these names are
# distinctive and not used by retailers.
_BENCHMARK_HINTS = (
    "lme",
    "fastmarkets",
    "argus",
    "smm",
    "usgs",
    "imarc",
    "businessanalytiq",
    "metal industry consulting",
    "discovery-alert",
    "mic-",
)


def infer_source_type(source: str) -> str:
    s = (source or "").strip()
    low = s.lower()
    if not s:
        return "public_listing"
    if s == "median_aggregate" or "aggregate" in low:
        return "aggregate"
    if any(hint in low for hint in _BENCHMARK_HINTS):
        return "benchmark"
    return "public_listing"


def backfill_file(path: Path, *, dry_run: bool) -> tuple[int, int]:
    """Return (touched, total) for one history file."""
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    observations = data.get("observations") or []
    touched = 0
    for obs in observations:
        if not isinstance(obs, dict):
            continue
        if obs.get("source_type"):
            continue
        obs["source_type"] = infer_source_type(str(obs.get("source", "")))
        touched += 1
    if touched and not dry_run:
        with path.open("w", encoding="utf-8") as fh:
            yaml.safe_dump(data, fh, sort_keys=False, allow_unicode=True)
    return touched, len(observations)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change but do not write files.",
    )
    args = parser.parse_args(argv)

    files = sorted(HISTORY_DIR.glob("*.yml"))
    if not files:
        print(f"  no files under {HISTORY_DIR}")
        return 0

    total_touched = 0
    total_obs = 0
    for path in files:
        touched, total = backfill_file(path, dry_run=args.dry_run)
        total_touched += touched
        total_obs += total
        if touched:
            print(f"  {path.name}: tagged {touched}/{total} observations")

    verb = "would tag" if args.dry_run else "tagged"
    print(f"\n  {verb} {total_touched} observation(s) across {len(files)} file(s) "
          f"(total observations: {total_obs}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
