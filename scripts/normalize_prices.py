#!/usr/bin/env python3
"""Normalize price records in the Strategic Materials Ledger.

For each record in _data/price_records.json that has an original_price_per_unit
but is missing normalized_usd_per_kg, this script computes the normalized value
using currency conversion rates and unit conversion factors.

Currency rates can be provided via a JSON rates file or fall back to a built-in
defaults dictionary. Unit conversions are handled for g, kg, lb, oz, and t.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_RECORDS_FILE = PROJECT_ROOT / "_data" / "price_records.json"

# Built-in fallback exchange rates (to USD).
# These are approximate and should be overridden with a rates file for accuracy.
DEFAULT_RATES: dict[str, float] = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.26,
    "CNY": 0.138,
    "JPY": 0.0067,
    "KRW": 0.00075,
    "CAD": 0.74,
    "AUD": 0.65,
    "CHF": 1.12,
    "RMB": 0.138,  # Alias for CNY
}

# Unit conversion factors: how many of this unit make 1 kg.
# To convert price-per-unit to price-per-kg:
#   price_per_kg = price_per_unit * factor
UNIT_TO_KG_FACTOR: dict[str, float] = {
    "kg": 1.0,
    "g": 1000.0,           # 1 kg = 1000 g  ->  price/g * 1000 = price/kg
    "lb": 1 / 0.453592,    # 1 kg = 2.20462 lb -> price/lb * 2.20462 = price/kg
    "oz": 35.274,           # 1 kg = 35.274 oz -> price/oz * 35.274 = price/kg
    "t": 1 / 1000.0,       # 1 kg = 0.001 t   -> price/t * 0.001 = price/kg
    "mt": 1 / 1000.0,      # metric ton alias
    "tonne": 1 / 1000.0,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> list:
    """Load a JSON file, returning an empty list if not found."""
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def save_json(path: Path, data: list) -> None:
    """Write records to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_rates(rates_file: Path | None) -> dict[str, float]:
    """Load exchange rates from a JSON file, or return defaults.

    The rates file should be a JSON object mapping currency codes to their
    USD exchange rate, e.g.: {"EUR": 1.08, "CNY": 0.138, ...}
    """
    if rates_file and rates_file.exists():
        with open(rates_file, "r", encoding="utf-8") as f:
            rates = json.load(f)
        if isinstance(rates, dict):
            # Ensure USD is always 1.0
            rates["USD"] = 1.0
            return {k.upper(): float(v) for k, v in rates.items()}
    return dict(DEFAULT_RATES)


def normalize_record(record: dict, rates: dict[str, float]) -> tuple[bool, str]:
    """Attempt to compute normalized_usd_per_kg for a single record.

    Returns:
        (success: bool, message: str)
    """
    original_price = record.get("original_price_per_unit")
    if original_price is None:
        return False, "No original_price_per_unit set."

    try:
        original_price = float(original_price)
    except (ValueError, TypeError):
        return False, f"Invalid original_price_per_unit: {original_price}"

    currency = (record.get("original_currency") or "USD").upper()
    unit = (record.get("original_unit") or "kg").lower()

    # Currency conversion
    if currency not in rates:
        return False, f"Unknown currency: {currency}. Add it to the rates file."
    usd_rate = rates[currency]

    # Unit conversion
    if unit not in UNIT_TO_KG_FACTOR:
        return False, f"Unknown unit: {unit}. Supported: {', '.join(UNIT_TO_KG_FACTOR.keys())}"
    kg_factor = UNIT_TO_KG_FACTOR[unit]

    # Compute: convert to USD, then convert to per-kg
    price_usd = original_price * usd_rate
    price_usd_per_kg = price_usd * kg_factor

    record["normalized_usd_per_kg"] = round(price_usd_per_kg, 4)
    record["exchange_rate_used"] = usd_rate
    record["exchange_rate_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return True, (
        f"{currency} {original_price}/{unit} -> USD {price_usd_per_kg:.4f}/kg "
        f"(rate={usd_rate}, unit_factor={kg_factor})"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize price records: compute normalized_usd_per_kg from raw values.",
    )
    parser.add_argument(
        "--records-file",
        type=Path,
        default=DEFAULT_RECORDS_FILE,
        help=f"Path to price_records.json (default: {DEFAULT_RECORDS_FILE})",
    )
    parser.add_argument(
        "--rates-file",
        type=Path,
        default=None,
        help="Path to a JSON file with exchange rates (currency -> USD rate).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-normalize records that already have normalized_usd_per_kg.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be normalized without writing changes.",
    )
    args = parser.parse_args()

    records_file = args.records_file.resolve()
    records = load_json(records_file)

    if not records:
        print("No records found. Nothing to normalize.")
        sys.exit(0)

    rates = load_rates(args.rates_file)
    print(f"Loaded {len(rates)} currency rate(s).")
    print(f"Processing {len(records)} record(s)...")
    print()

    normalized_count = 0
    skipped_count = 0
    error_count = 0

    for record in records:
        rec_id = record.get("id", "unknown")

        # Skip records that already have a normalized value (unless --force)
        if record.get("normalized_usd_per_kg") is not None and not args.force:
            skipped_count += 1
            continue

        # Skip records without a price to normalize
        if record.get("original_price_per_unit") is None:
            skipped_count += 1
            continue

        success, message = normalize_record(record, rates)
        if success:
            normalized_count += 1
            print(f"  [OK]   {rec_id}: {message}")
        else:
            error_count += 1
            print(f"  [FAIL] {rec_id}: {message}")

    print()
    print(f"Results: {normalized_count} normalized, {skipped_count} skipped, {error_count} errors")

    if args.dry_run:
        print("\nDRY RUN — no changes written.")
        sys.exit(0)

    if normalized_count > 0:
        save_json(records_file, records)
        print(f"Updated {records_file}")
    else:
        print("No changes to write.")


if __name__ == "__main__":
    main()
