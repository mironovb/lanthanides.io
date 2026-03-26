#!/usr/bin/env python3
"""Import price offers from curated web sources into the Strategic Materials Ledger.

Reads the source registry (_data/source_registry.yml) and, for each active source
with a URL, makes an HTTP request and attempts to extract pricing data using
source-specific adapters. Results are normalized to the standard price record
schema and appended to _data/price_records.json.

Responses are cached locally (scripts/.offer_cache/) with timestamps to avoid
redundant fetches.
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import yaml
except ImportError:
    yaml = None

try:
    import requests
except ImportError:
    requests = None


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_OUTPUT_FILE = PROJECT_ROOT / "_data" / "price_records.json"
SOURCE_REGISTRY = PROJECT_ROOT / "_data" / "source_registry.yml"
CACHE_DIR = SCRIPT_DIR / ".offer_cache"

ELEMENT_NAMES = {
    "Nd": "Neodymium", "Pr": "Praseodymium", "Dy": "Dysprosium",
    "Tb": "Terbium", "Sm": "Samarium", "Gd": "Gadolinium",
    "Y": "Yttrium", "Sc": "Scandium", "Te": "Tellurium",
    "V": "Vanadium", "Ga": "Gallium", "Ge": "Germanium",
    "Sb": "Antimony", "W": "Tungsten", "In": "Indium",
    "Bi": "Bismuth", "Mo": "Molybdenum",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    """Return the current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_id(content: str) -> str:
    """Generate a deterministic record ID from content hash."""
    h = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
    return f"offer-{h}"


def load_yaml(path: Path) -> list | dict | None:
    """Load a YAML file and return its contents."""
    if yaml is None:
        logger.error("PyYAML is not installed. Run: pip install pyyaml")
        sys.exit(1)
    if not path.exists():
        logger.warning("File not found: %s", path)
        return None
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_json(path: Path) -> list:
    """Load a JSON file, returning an empty list if it does not exist."""
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def save_json(path: Path, data: list) -> None:
    """Write a list of records to a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def make_record(**kwargs) -> dict:
    """Return a price record with all schema fields, filling missing with None."""
    defaults = {
        "id": None,
        "element_symbol": None,
        "element_name": None,
        "form": None,
        "purity": None,
        "market_tier": "retail",
        "moq_kg": None,
        "quoted_quantity_kg": None,
        "original_currency": None,
        "original_unit": "kg",
        "original_price_per_unit": None,
        "normalized_usd_per_kg": None,
        "exchange_rate_used": None,
        "exchange_rate_date": None,
        "incoterm": None,
        "taxes_included": "unknown",
        "shipping_included": "unknown",
        "seller_name": None,
        "seller_country": None,
        "buyer_country": None,
        "source_type": "distributor",
        "source_id": None,
        "source_url": None,
        "invoice_ref": None,
        "quote_date": None,
        "ingestion_timestamp": now_iso(),
        "verification_status": "single_source_offer",
        "confidence_score": 0.6,
        "notes": "",
    }
    defaults.update({k: v for k, v in kwargs.items() if v is not None})
    return defaults


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

def cache_key(url: str) -> str:
    """Return a filesystem-safe cache key for a URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]


def get_cached_response(url: str, max_age_seconds: int = 3600) -> str | None:
    """Return cached response text if fresh enough, else None."""
    key = cache_key(url)
    cache_file = CACHE_DIR / f"{key}.json"
    if not cache_file.exists():
        return None
    with open(cache_file, "r", encoding="utf-8") as f:
        cached = json.load(f)
    fetched_at = cached.get("fetched_at", 0)
    if time.time() - fetched_at > max_age_seconds:
        return None
    return cached.get("body")


def store_cached_response(url: str, body: str) -> None:
    """Store a response body in the cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = cache_key(url)
    cache_file = CACHE_DIR / f"{key}.json"
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump({"url": url, "fetched_at": time.time(), "body": body}, f)


def fetch_url(url: str, cache_max_age: int = 3600) -> str | None:
    """Fetch a URL, using cache if available. Returns response text or None."""
    if requests is None:
        logger.error("requests library is not installed. Run: pip install requests")
        return None

    cached = get_cached_response(url, max_age_seconds=cache_max_age)
    if cached is not None:
        logger.info("Using cached response for %s", url)
        return cached

    logger.info("Fetching %s", url)
    try:
        resp = requests.get(url, timeout=30, headers={
            "User-Agent": "StrategicMaterialsLedger/1.0 (price-data-ingestion)",
        })
        resp.raise_for_status()
        body = resp.text
        store_cached_response(url, body)
        return body
    except requests.RequestException as exc:
        logger.error("Failed to fetch %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Source Adapters
# ---------------------------------------------------------------------------
# Each adapter is a callable: adapter(source_config, response_text) -> list[dict]
# The returned dicts should contain fields like:
#   element_symbol, price, currency, unit, quantity, form, purity, seller, country, date

ADAPTERS: dict[str, callable] = {}


def register_adapter(source_id: str):
    """Decorator to register a source-specific adapter function."""
    def decorator(func):
        ADAPTERS[source_id] = func
        return func
    return decorator


# ---------------------------------------------------------------------------
# Example adapter stub — replace or extend with real implementations
# ---------------------------------------------------------------------------

@register_adapter("example-source-001")
def adapter_example(source: dict, body: str) -> list[dict]:
    """Example adapter stub for demonstration.

    A real adapter would parse the response body (HTML, JSON, etc.) and
    extract structured pricing data. This stub returns an empty list.

    To add a new adapter:
      1. Choose the source_id from source_registry.yml.
      2. Decorate a function with @register_adapter("your-source-id").
      3. Parse `body` (the HTTP response text) to extract records.
      4. Return a list of dicts with keys: element_symbol, price, currency,
         unit, quantity, form, purity, seller, country, date.
    """
    logger.info("Example adapter called for source '%s' — no real parsing.", source.get("id"))
    return []


def generic_adapter(source: dict, body: str) -> list[dict]:
    """Generic fallback adapter that logs a warning and returns nothing.

    This is called when no source-specific adapter is registered. Override
    by creating a dedicated adapter with @register_adapter.
    """
    logger.warning(
        "No adapter registered for source '%s'. "
        "Skipping. Write an adapter with @register_adapter('%s').",
        source.get("id"), source.get("id"),
    )
    return []


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

def process_source(source: dict, dry_run: bool = False) -> list[dict]:
    """Process a single source from the registry and return price records."""
    source_id = source.get("id", "unknown")
    url = source.get("url")
    parse_status = source.get("parse_status", "inactive")

    if parse_status not in ("active", "pending_review"):
        logger.info("Skipping source '%s' (status: %s)", source_id, parse_status)
        return []

    if not url:
        logger.info("Skipping source '%s' — no URL configured.", source_id)
        return []

    body = fetch_url(url)
    if body is None:
        logger.error("Could not retrieve content for source '%s'", source_id)
        return []

    # Select adapter
    adapter = ADAPTERS.get(source_id, generic_adapter)
    raw_records = adapter(source, body)

    if not raw_records:
        logger.info("No records extracted from source '%s'", source_id)
        return []

    # Normalize raw records to schema
    price_records = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for i, raw in enumerate(raw_records):
        element_symbol = raw.get("element_symbol")
        price = raw.get("price")
        currency = raw.get("currency", "USD")
        unit = raw.get("unit", "kg")
        quantity = raw.get("quantity")
        form = raw.get("form")
        purity = raw.get("purity")
        seller = raw.get("seller", source.get("name"))
        country = raw.get("country", source.get("country"))
        quote_date = raw.get("date", today)

        normalized_usd = None
        exchange_rate = None
        if price is not None and currency and currency.upper() == "USD" and unit and unit.lower() == "kg":
            normalized_usd = price
            exchange_rate = 1.0

        content_for_hash = f"{source_id}-{i}-{element_symbol}-{price}-{quote_date}"

        record = make_record(
            id=generate_id(content_for_hash),
            element_symbol=element_symbol,
            element_name=ELEMENT_NAMES.get(element_symbol) if element_symbol else None,
            form=form,
            purity=purity,
            quoted_quantity_kg=quantity,
            original_currency=currency.upper() if currency else None,
            original_unit=unit.lower() if unit else "kg",
            original_price_per_unit=price,
            normalized_usd_per_kg=normalized_usd,
            exchange_rate_used=exchange_rate,
            seller_name=seller,
            seller_country=country,
            source_type=source.get("type", "distributor"),
            source_id=source_id,
            source_url=url,
            quote_date=quote_date,
        )
        price_records.append(record)

    return price_records


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import price offers from curated web sources.",
    )
    parser.add_argument(
        "--source-id",
        type=str,
        default=None,
        help="Process only the source with this ID.",
    )
    parser.add_argument(
        "--output-file",
        type=Path,
        default=DEFAULT_OUTPUT_FILE,
        help=f"Output JSON file for price records (default: {DEFAULT_OUTPUT_FILE})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse but do not write to the output file.",
    )
    parser.add_argument(
        "--cache-max-age",
        type=int,
        default=3600,
        help="Maximum cache age in seconds (default: 3600).",
    )
    args = parser.parse_args()

    output_file = args.output_file.resolve()

    # Load source registry
    registry = load_yaml(SOURCE_REGISTRY)
    if not registry or not isinstance(registry, list):
        logger.info("Source registry is empty or not found at %s", SOURCE_REGISTRY)
        logger.info("Add sources to _data/source_registry.yml to use this script.")
        sys.exit(0)

    # Filter to requested source if specified
    if args.source_id:
        registry = [s for s in registry if s.get("id") == args.source_id]
        if not registry:
            logger.error("Source '%s' not found in registry.", args.source_id)
            sys.exit(1)

    logger.info("Processing %d source(s)", len(registry))

    all_new_records = []
    for source in registry:
        source_id = source.get("id", "unknown")
        logger.info("--- Source: %s ---", source_id)
        try:
            records = process_source(source, dry_run=args.dry_run)
            logger.info("Extracted %d record(s) from '%s'", len(records), source_id)
            all_new_records.extend(records)
        except Exception:
            logger.exception("Unexpected error processing source '%s'", source_id)

    logger.info("Total new records: %d", len(all_new_records))

    if not all_new_records:
        logger.info("Nothing to import.")
        sys.exit(0)

    if args.dry_run:
        print()
        print("DRY RUN — records that would be written:")
        print(json.dumps(all_new_records, indent=2, ensure_ascii=False))
        sys.exit(0)

    existing = load_json(output_file)
    existing_ids = {r.get("id") for r in existing}

    added = 0
    for rec in all_new_records:
        if rec["id"] not in existing_ids:
            existing.append(rec)
            existing_ids.add(rec["id"])
            added += 1
        else:
            logger.info("SKIP duplicate: %s", rec["id"])

    save_json(output_file, existing)
    logger.info("Appended %d new record(s) to %s", added, output_file)
    logger.info("Total records now: %d", len(existing))


if __name__ == "__main__":
    main()
