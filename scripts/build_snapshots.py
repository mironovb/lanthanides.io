#!/usr/bin/env python3
"""Build a dated snapshot of the current price records.

Copies _data/price_records.json to _data/snapshots/YYYY-MM-DD.json, creating
the snapshots directory if it does not already exist.
"""

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_RECORDS_FILE = PROJECT_ROOT / "_data" / "price_records.json"
SNAPSHOTS_DIR = PROJECT_ROOT / "_data" / "snapshots"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a dated snapshot of price_records.json.",
    )
    parser.add_argument(
        "--records-file",
        type=Path,
        default=DEFAULT_RECORDS_FILE,
        help=f"Source records file (default: {DEFAULT_RECORDS_FILE})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=SNAPSHOTS_DIR,
        help=f"Snapshots directory (default: {SNAPSHOTS_DIR})",
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Override snapshot date (YYYY-MM-DD). Defaults to today (UTC).",
    )
    args = parser.parse_args()

    records_file = args.records_file.resolve()
    output_dir = args.output_dir.resolve()

    if not records_file.exists():
        print(f"ERROR: Records file not found: {records_file}")
        sys.exit(1)

    # Determine snapshot date
    if args.date:
        snapshot_date = args.date
    else:
        snapshot_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Ensure snapshots directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    snapshot_path = output_dir / f"{snapshot_date}.json"

    # Validate the source is valid JSON before copying
    with open(records_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    record_count = len(data) if isinstance(data, list) else 0

    # Write snapshot (use json.dump for consistent formatting)
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Snapshot created: {snapshot_path}")
    print(f"  Date:    {snapshot_date}")
    print(f"  Records: {record_count}")
    print(f"  Size:    {snapshot_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
