#!/usr/bin/env python3
"""Rare Earth Export Control data collector — pipeline for price and regulatory data.

Orchestrates data collection from configured sources, normalizes records, and
produces timestamped output files. Designed for both manual runs and CI/CD
(GitHub Actions weekly cron).

Features:
  - Proper Python logging (no print statements)
  - Retry with exponential backoff for HTTP requests
  - --dry-run flag for safe testing
  - Graceful error handling: failed URLs are logged and skipped, never crash
  - Timestamped output files
"""

import argparse
import hashlib
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

try:
    import yaml
except ImportError:
    yaml = None


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "_data" / "price_records.json"
SOURCE_REGISTRY = PROJECT_ROOT / "_data" / "source_registry.yml"
SNAPSHOT_DIR = PROJECT_ROOT / "_data" / "snapshots"
CACHE_DIR = SCRIPT_DIR / ".reex_cache"

MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 2.0
BACKOFF_MULTIPLIER = 2.0
REQUEST_TIMEOUT = 30


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure structured logging with timestamps."""
    level = logging.DEBUG if verbose else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("reex_collector")
    logger.setLevel(level)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    """Return the current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_date() -> str:
    """Return the current UTC date as YYYY-MM-DD."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def load_yaml_file(path: Path, logger: logging.Logger):
    """Load a YAML file. Returns None on failure."""
    if yaml is None:
        logger.error("PyYAML not installed — run: pip install pyyaml")
        return None
    if not path.exists():
        logger.warning("YAML file not found: %s", path)
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception:
        logger.exception("Failed to parse YAML: %s", path)
        return None


def load_json_file(path: Path, logger: logging.Logger) -> list:
    """Load a JSON file. Returns empty list on failure."""
    if not path.exists():
        logger.info("JSON file not found (will create): %s", path)
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        logger.exception("Failed to parse JSON: %s", path)
        return []


def save_json_file(path: Path, data: list, logger: logging.Logger) -> bool:
    """Write a list of records to a JSON file. Returns True on success."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        logger.info("Saved %d records to %s", len(data), path)
        return True
    except Exception:
        logger.exception("Failed to save JSON: %s", path)
        return False


# ---------------------------------------------------------------------------
# HTTP with retry and exponential backoff
# ---------------------------------------------------------------------------

def fetch_with_retry(
    url: str,
    logger: logging.Logger,
    max_retries: int = MAX_RETRIES,
    initial_backoff: float = INITIAL_BACKOFF_SECONDS,
) -> str | None:
    """Fetch a URL with retry and exponential backoff.

    Returns response text on success, None on failure after all retries.
    Never raises — all exceptions are caught and logged.
    """
    if requests is None:
        logger.error("requests library not installed — run: pip install requests")
        return None

    headers = {
        "User-Agent": "reex-collector/2.0 (lanthanides.io price-data-pipeline)",
    }

    backoff = initial_backoff
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Fetching %s (attempt %d/%d)", url, attempt, max_retries)
            resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers=headers)
            resp.raise_for_status()
            logger.info("Success: %s (%d bytes)", url, len(resp.text))
            return resp.text

        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            last_error = f"HTTP {status}: {exc}"
            # Don't retry 4xx client errors (except 429 Too Many Requests)
            if exc.response is not None and 400 <= exc.response.status_code < 500 and exc.response.status_code != 429:
                logger.error("Client error (no retry): %s — %s", url, last_error)
                return None

        except requests.exceptions.ConnectionError as exc:
            last_error = f"Connection error: {exc}"

        except requests.exceptions.Timeout as exc:
            last_error = f"Timeout: {exc}"

        except requests.exceptions.RequestException as exc:
            last_error = f"Request error: {exc}"

        if attempt < max_retries:
            logger.warning(
                "Attempt %d failed for %s: %s — retrying in %.1fs",
                attempt, url, last_error, backoff,
            )
            time.sleep(backoff)
            backoff *= BACKOFF_MULTIPLIER
        else:
            logger.error(
                "All %d attempts failed for %s: %s",
                max_retries, url, last_error,
            )

    return None


# ---------------------------------------------------------------------------
# Cache (optional, for development)
# ---------------------------------------------------------------------------

def cache_key(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]


def get_cached(url: str, max_age: int, logger: logging.Logger) -> str | None:
    """Return cached response if fresh enough."""
    path = CACHE_DIR / f"{cache_key(url)}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            cached = json.load(f)
        if time.time() - cached.get("fetched_at", 0) > max_age:
            return None
        logger.debug("Cache hit: %s", url)
        return cached.get("body")
    except Exception:
        return None


def store_cache(url: str, body: str, logger: logging.Logger) -> None:
    """Store response in cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{cache_key(url)}.json"
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"url": url, "fetched_at": time.time(), "body": body}, f)
    except Exception:
        logger.debug("Cache write failed for %s", url)


def fetch_url(url: str, logger: logging.Logger, use_cache: bool = True, cache_max_age: int = 3600) -> str | None:
    """Fetch a URL, optionally using cache. Returns text or None."""
    if use_cache:
        cached = get_cached(url, cache_max_age, logger)
        if cached is not None:
            logger.info("Using cached response for %s", url)
            return cached

    body = fetch_with_retry(url, logger)
    if body is not None and use_cache:
        store_cache(url, body, logger)
    return body


# ---------------------------------------------------------------------------
# Source processing
# ---------------------------------------------------------------------------

def process_source(source: dict, logger: logging.Logger, dry_run: bool = False) -> list[dict]:
    """Process a single source from the registry.

    Returns a list of price record dicts. On any failure, logs the error
    and returns an empty list (never crashes).
    """
    source_id = source.get("id", "unknown")
    url = source.get("url")
    parse_status = source.get("parse_status", "inactive")

    if parse_status not in ("active", "pending_review"):
        logger.info("Skipping source '%s' (parse_status: %s)", source_id, parse_status)
        return []

    if not url:
        logger.info("Skipping source '%s' — no URL configured", source_id)
        return []

    try:
        body = fetch_url(url, logger)
        if body is None:
            logger.error("Could not retrieve content for source '%s'", source_id)
            return []

        # Source-specific parsing would go here.
        # For now, log that we fetched successfully but have no adapter.
        logger.info(
            "Fetched %d bytes from '%s' — no adapter registered (add one in import_offers.py)",
            len(body), source_id,
        )
        return []

    except Exception:
        logger.exception("Unexpected error processing source '%s' — skipping", source_id)
        return []


# ---------------------------------------------------------------------------
# Snapshot
# ---------------------------------------------------------------------------

def create_snapshot(records_path: Path, logger: logging.Logger, dry_run: bool = False) -> Path | None:
    """Create a dated snapshot of the price records file."""
    if not records_path.exists():
        logger.warning("Cannot snapshot — records file not found: %s", records_path)
        return None

    date_str = now_date()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snapshot_path = SNAPSHOT_DIR / f"{date_str}_{timestamp}.json"

    if dry_run:
        logger.info("[DRY RUN] Would create snapshot: %s", snapshot_path)
        return snapshot_path

    try:
        SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
        data = load_json_file(records_path, logger)
        save_json_file(snapshot_path, data, logger)
        logger.info("Snapshot created: %s (%d records)", snapshot_path, len(data))
        return snapshot_path
    except Exception:
        logger.exception("Failed to create snapshot")
        return None


# ---------------------------------------------------------------------------
# Pipeline orchestration
# ---------------------------------------------------------------------------

def run_pipeline(args: argparse.Namespace, logger: logging.Logger) -> int:
    """Run the full collection pipeline. Returns exit code (0 = success)."""
    timestamp = now_iso()
    logger.info("=" * 60)
    logger.info("reex_collector pipeline started at %s", timestamp)
    logger.info("Output: %s", args.output_file)
    logger.info("Dry run: %s", args.dry_run)
    logger.info("=" * 60)

    # Step 1: Load source registry
    registry = load_yaml_file(SOURCE_REGISTRY, logger)
    if not registry or not isinstance(registry, list):
        logger.info("Source registry empty or not found at %s", SOURCE_REGISTRY)
        logger.info("Add sources with URLs and parse_status: active to use collection.")
        return 0

    # Filter to specific source if requested
    if args.source_id:
        registry = [s for s in registry if s.get("id") == args.source_id]
        if not registry:
            logger.error("Source '%s' not found in registry", args.source_id)
            return 1

    logger.info("Processing %d source(s)", len(registry))

    # Step 2: Collect from each source
    all_new_records = []
    errors = 0

    for source in registry:
        source_id = source.get("id", "unknown")
        logger.info("--- Processing source: %s ---", source_id)
        try:
            records = process_source(source, logger, dry_run=args.dry_run)
            logger.info("Extracted %d record(s) from '%s'", len(records), source_id)
            all_new_records.extend(records)
        except Exception:
            logger.exception("Failed to process source '%s'", source_id)
            errors += 1

    logger.info("Collection complete: %d new records, %d source errors", len(all_new_records), errors)

    # Step 3: Merge with existing records
    if all_new_records:
        if args.dry_run:
            logger.info("[DRY RUN] Would write %d new records", len(all_new_records))
            logger.info("[DRY RUN] Records preview:")
            for rec in all_new_records[:5]:
                logger.info("  %s: %s %s @ $%s/kg",
                            rec.get("id", "?"),
                            rec.get("element_symbol", "?"),
                            rec.get("form", "?"),
                            rec.get("normalized_usd_per_kg", "?"))
            if len(all_new_records) > 5:
                logger.info("  ... and %d more", len(all_new_records) - 5)
        else:
            existing = load_json_file(args.output_file, logger)
            existing_ids = {r.get("id") for r in existing}
            added = 0
            for rec in all_new_records:
                rec["ingestion_timestamp"] = timestamp
                if rec.get("id") not in existing_ids:
                    existing.append(rec)
                    existing_ids.add(rec["id"])
                    added += 1
                else:
                    logger.debug("Skipping duplicate: %s", rec.get("id"))
            save_json_file(args.output_file, existing, logger)
            logger.info("Appended %d new record(s) — total now: %d", added, len(existing))
    else:
        logger.info("No new records to add")

    # Step 4: Run normalization (if available and not dry-run)
    normalize_script = SCRIPT_DIR / "normalize_prices.py"
    if normalize_script.exists() and not args.dry_run and all_new_records:
        logger.info("Running price normalization...")
        try:
            result = subprocess.run(
                [sys.executable, str(normalize_script), "--records-file", str(args.output_file)],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode == 0:
                logger.info("Normalization complete")
            else:
                logger.warning("Normalization exited with code %d: %s", result.returncode, result.stderr.strip())
        except Exception:
            logger.exception("Normalization script failed — continuing")

    # Step 5: Create timestamped snapshot
    if not args.dry_run:
        create_snapshot(args.output_file, logger, dry_run=args.dry_run)
    else:
        logger.info("[DRY RUN] Would create timestamped snapshot")

    logger.info("=" * 60)
    logger.info("Pipeline finished at %s", now_iso())
    logger.info("=" * 60)

    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rare Earth Export Control data collector — price and regulatory pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python reex_collector.py                     # Full pipeline run
  python reex_collector.py --dry-run           # Preview without writing
  python reex_collector.py --source-id sam-01  # Single source only
  python reex_collector.py --verbose            # Debug-level logging
""",
    )
    parser.add_argument(
        "--output-file",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSON file (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--source-id",
        type=str,
        default=None,
        help="Process only this source ID from the registry.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse but do not write files or create snapshots.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable debug-level logging.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Bypass response cache (always fetch fresh).",
    )
    args = parser.parse_args()
    args.output_file = args.output_file.resolve()

    logger = setup_logging(verbose=args.verbose)
    exit_code = run_pipeline(args, logger)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
