#!/usr/bin/env python3
"""Comprehensive data validation for the Strategic Materials Ledger.

Validates:
  - _data/price_records.json: schema completeness, value ranges, consistency
  - _data/policy_events.yml: required fields and date formats
  - _data/source_registry.yml: required fields and URL formats

Exits with code 0 if all checks pass, code 1 if errors are found.
With --strict, warnings are treated as errors.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import yaml
except ImportError:
    yaml = None


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

PRICE_RECORDS_FILE = PROJECT_ROOT / "_data" / "price_records.json"
POLICY_EVENTS_FILE = PROJECT_ROOT / "_data" / "policy_events.yml"
SOURCE_REGISTRY_FILE = PROJECT_ROOT / "_data" / "source_registry.yml"
ELEMENT_CATALOG_FILE = PROJECT_ROOT / "_data" / "element_catalog.yml"
SITE_SETTINGS_FILE = PROJECT_ROOT / "_data" / "site_settings.yml"

REQUIRED_RECORD_FIELDS = [
    "id",
    "element_symbol",
    "form",
    "market_tier",
    "source_type",
    "verification_status",
]

VALID_VERIFICATION_STATUSES = {
    "verified_invoice",
    "corroborated",
    "single_source_offer",
    "benchmark_linked",
    "stale",
    "archived",
}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_RE = re.compile(r"^https?://")

REQUIRED_POLICY_FIELDS = ["id", "date", "title", "affected_elements", "source_url"]
REQUIRED_SOURCE_FIELDS = ["id", "name", "type", "trust_tier"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> list | None:
    """Load a JSON file. Returns None if the file does not exist."""
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_yaml_file(path: Path) -> list | dict | None:
    """Load a YAML file. Returns None if the file does not exist."""
    if yaml is None:
        print("WARNING: PyYAML is not installed. YAML validation skipped.")
        return None
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def is_valid_date(s: str) -> bool:
    """Check if a string is a valid YYYY-MM-DD date."""
    if not DATE_RE.match(str(s)):
        return False
    try:
        datetime.strptime(str(s), "%Y-%m-%d")
        return True
    except ValueError:
        return False


def is_valid_url(s: str) -> bool:
    """Check if a string is a well-formed HTTP(S) URL."""
    if not s:
        return False
    try:
        result = urlparse(str(s))
        return result.scheme in ("http", "https") and bool(result.netloc)
    except Exception:
        return False


class ValidationReport:
    """Collects errors and warnings during validation."""

    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    def print_report(self) -> None:
        if self.errors:
            print(f"\n{'='*60}")
            print(f"ERRORS ({len(self.errors)})")
            print(f"{'='*60}")
            for e in self.errors:
                print(f"  [ERROR] {e}")

        if self.warnings:
            print(f"\n{'='*60}")
            print(f"WARNINGS ({len(self.warnings)})")
            print(f"{'='*60}")
            for w in self.warnings:
                print(f"  [WARN]  {w}")

        print()
        if not self.errors and not self.warnings:
            print("All checks passed.")
        else:
            print(f"Summary: {len(self.errors)} error(s), {len(self.warnings)} warning(s)")


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

def validate_price_records(
    report: ValidationReport,
    valid_symbols: set[str],
    freshness_days: int,
) -> None:
    """Validate _data/price_records.json."""
    print("Validating price_records.json ...")

    data = load_json(PRICE_RECORDS_FILE)
    if data is None:
        report.warning("price_records.json not found.")
        return
    if not isinstance(data, list):
        report.error("price_records.json root must be a JSON array.")
        return

    if not data:
        report.warning("price_records.json is empty.")
        return

    seen_ids = set()
    now = datetime.now(timezone.utc)

    # Track element+form combinations for form-mixing check
    element_forms: dict[str, set[str]] = {}

    for i, record in enumerate(data):
        prefix = f"price_records[{i}]"

        if not isinstance(record, dict):
            report.error(f"{prefix}: record is not an object.")
            continue

        rec_id = record.get("id")

        # Required fields
        for field in REQUIRED_RECORD_FIELDS:
            val = record.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                report.error(f"{prefix} (id={rec_id}): missing required field '{field}'.")

        # Duplicate IDs
        if rec_id:
            if rec_id in seen_ids:
                report.error(f"{prefix}: duplicate id '{rec_id}'.")
            seen_ids.add(rec_id)

        # Valid verification_status
        vs = record.get("verification_status")
        if vs and vs not in VALID_VERIFICATION_STATUSES:
            report.error(
                f"{prefix} (id={rec_id}): invalid verification_status '{vs}'. "
                f"Valid values: {', '.join(sorted(VALID_VERIFICATION_STATUSES))}"
            )

        # normalized_usd_per_kg should be present if original_price_per_unit is set
        if record.get("original_price_per_unit") is not None:
            if record.get("normalized_usd_per_kg") is None:
                report.warning(
                    f"{prefix} (id={rec_id}): has original_price_per_unit "
                    f"but missing normalized_usd_per_kg."
                )

        # Valid quote_date format
        quote_date = record.get("quote_date")
        if quote_date is not None:
            if not is_valid_date(str(quote_date)):
                report.error(
                    f"{prefix} (id={rec_id}): invalid quote_date format "
                    f"'{quote_date}' (expected YYYY-MM-DD)."
                )

        # Non-negative prices
        for price_field in ("original_price_per_unit", "normalized_usd_per_kg"):
            val = record.get(price_field)
            if val is not None:
                try:
                    if float(val) < 0:
                        report.error(
                            f"{prefix} (id={rec_id}): {price_field} is negative ({val})."
                        )
                except (ValueError, TypeError):
                    report.error(
                        f"{prefix} (id={rec_id}): {price_field} is not a valid number ({val})."
                    )

        # Valid element_symbol
        element = record.get("element_symbol")
        if element and valid_symbols and element not in valid_symbols:
            report.error(
                f"{prefix} (id={rec_id}): element_symbol '{element}' "
                f"not found in element_catalog.yml."
            )

        # Source provenance
        source_type = record.get("source_type")
        if not source_type or (isinstance(source_type, str) and not source_type.strip()):
            report.error(f"{prefix} (id={rec_id}): source_type is empty or missing.")

        # Track forms per element
        form = record.get("form")
        if element:
            element_forms.setdefault(element, set())
            if form:
                element_forms[element].add(form)
            else:
                element_forms[element].add("__unlabeled__")

        # Staleness check
        if quote_date and is_valid_date(str(quote_date)):
            try:
                qd = datetime.strptime(str(quote_date), "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
                age_days = (now - qd).days
                if age_days > freshness_days:
                    report.warning(
                        f"{prefix} (id={rec_id}): record is {age_days} days old "
                        f"(freshness threshold: {freshness_days} days)."
                    )
            except ValueError:
                pass

    # Form mixing check
    for element, forms in element_forms.items():
        if len(forms) > 1 and "__unlabeled__" in forms:
            labeled = forms - {"__unlabeled__"}
            report.warning(
                f"Element '{element}' has records mixing labeled forms "
                f"({', '.join(sorted(labeled))}) with unlabeled records. "
                f"Consider adding form labels to all records."
            )

    print(f"  Checked {len(data)} record(s).")


def validate_policy_events(report: ValidationReport) -> None:
    """Validate _data/policy_events.yml."""
    print("Validating policy_events.yml ...")

    data = load_yaml_file(POLICY_EVENTS_FILE)
    if data is None:
        report.warning("policy_events.yml not found.")
        return
    if not isinstance(data, list):
        if data is None or data == []:
            print("  File is empty — nothing to validate.")
            return
        report.error("policy_events.yml root must be a YAML array.")
        return

    if not data:
        print("  File is empty — nothing to validate.")
        return

    for i, event in enumerate(data):
        prefix = f"policy_events[{i}]"

        if not isinstance(event, dict):
            report.error(f"{prefix}: entry is not a mapping.")
            continue

        event_id = event.get("id")

        for field in REQUIRED_POLICY_FIELDS:
            val = event.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                report.error(f"{prefix} (id={event_id}): missing required field '{field}'.")

        # Date validation
        date_val = event.get("date")
        if date_val is not None and not is_valid_date(str(date_val)):
            report.error(
                f"{prefix} (id={event_id}): invalid date format "
                f"'{date_val}' (expected YYYY-MM-DD)."
            )

        # affected_elements should be a list
        ae = event.get("affected_elements")
        if ae is not None and not isinstance(ae, list):
            report.error(
                f"{prefix} (id={event_id}): affected_elements should be a list."
            )

        # source_url validation
        url = event.get("source_url")
        if url and not is_valid_url(str(url)):
            report.warning(
                f"{prefix} (id={event_id}): source_url does not look like a valid URL: '{url}'"
            )

    print(f"  Checked {len(data)} event(s).")


def validate_source_registry(report: ValidationReport) -> None:
    """Validate _data/source_registry.yml."""
    print("Validating source_registry.yml ...")

    data = load_yaml_file(SOURCE_REGISTRY_FILE)
    if data is None:
        report.warning("source_registry.yml not found.")
        return
    if not isinstance(data, list):
        if data is None or data == []:
            print("  File is empty — nothing to validate.")
            return
        report.error("source_registry.yml root must be a YAML array.")
        return

    if not data:
        print("  File is empty — nothing to validate.")
        return

    for i, source in enumerate(data):
        prefix = f"source_registry[{i}]"

        if not isinstance(source, dict):
            report.error(f"{prefix}: entry is not a mapping.")
            continue

        source_id = source.get("id")

        for field in REQUIRED_SOURCE_FIELDS:
            val = source.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                report.error(f"{prefix} (id={source_id}): missing required field '{field}'.")

        # URL validation if present
        url = source.get("url")
        if url and not is_valid_url(str(url)):
            report.warning(
                f"{prefix} (id={source_id}): url does not look valid: '{url}'"
            )

    print(f"  Checked {len(data)} source(s).")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate all data files for the Strategic Materials Ledger.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as errors (exit 1 if any warnings).",
    )
    args = parser.parse_args()

    print("Strategic Materials Ledger — Data Validation")
    print("=" * 50)
    print()

    # Load element catalog for cross-reference
    valid_symbols: set[str] = set()
    catalog = load_yaml_file(ELEMENT_CATALOG_FILE)
    if catalog and isinstance(catalog, list):
        for entry in catalog:
            if isinstance(entry, dict) and "symbol" in entry:
                valid_symbols.add(entry["symbol"])
        print(f"Loaded {len(valid_symbols)} element(s) from catalog.")
    else:
        print("WARNING: Could not load element_catalog.yml for cross-reference.")

    # Load freshness threshold from site settings
    freshness_days = 90  # default
    settings = load_yaml_file(SITE_SETTINGS_FILE)
    if settings and isinstance(settings, dict):
        freshness_days = settings.get("freshness_threshold_days", 90)
    print(f"Freshness threshold: {freshness_days} days")
    print()

    report = ValidationReport()

    validate_price_records(report, valid_symbols, freshness_days)
    print()
    validate_policy_events(report)
    print()
    validate_source_registry(report)

    report.print_report()

    # Determine exit code
    if report.has_errors():
        sys.exit(1)
    if args.strict and report.has_warnings():
        print("Exiting with error due to --strict mode.")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
