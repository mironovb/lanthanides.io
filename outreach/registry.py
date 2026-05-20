"""Supplier registry for the outreach foundation.

This module is the canonical reader/writer for the supplier registry. It does
not send anything. It only loads supplier records, filters them by an explicit
consent gate plus a per-supplier rate limit, and updates the last_contacted
field after the maintainer has manually sent a draft.

Hard rule: a supplier is NEVER eligible for outreach unless
``consent.opted_in`` is exactly ``True``. There is no override flag, no force
parameter, and no kwarg that bypasses this gate. If you find yourself wanting
one, the answer is to record the opt-in first.

Files:
    outreach/suppliers.example.yml  Committed template documenting the schema.
    outreach/suppliers.yml          Gitignored real registry (preferred at runtime).
"""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml

OUTREACH_DIR = Path(__file__).resolve().parent
REAL_FILE = OUTREACH_DIR / "suppliers.yml"
EXAMPLE_FILE = OUTREACH_DIR / "suppliers.example.yml"

DEFAULT_CONTACT_FREQUENCY_DAYS = 30
VALID_CONTACT_METHODS: frozenset[str] = frozenset({"email", "web_form", "none"})
VALID_TIERS: frozenset[str] = frozenset({"retail", "lab", "bulk"})


def _active_path() -> Path:
    return REAL_FILE if REAL_FILE.exists() else EXAMPLE_FILE


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def load_suppliers() -> list[dict]:
    """Return the supplier list from the real registry if it exists, else the example."""
    path = _active_path()
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    suppliers = data.get("suppliers") or []
    if not isinstance(suppliers, list):
        raise ValueError(f"{path}: 'suppliers' must be a list")
    return suppliers


def _has_explicit_opt_in(supplier: dict) -> bool:
    """The consent gate. Only an exact-True opt_in passes."""
    consent = supplier.get("consent")
    if not isinstance(consent, dict):
        return False
    return consent.get("opted_in") is True


def _rate_limit_elapsed(supplier: dict, today: date) -> bool:
    last = _parse_date(supplier.get("last_contacted"))
    if last is None:
        return True
    freq = supplier.get("contact_frequency_days", DEFAULT_CONTACT_FREQUENCY_DAYS)
    return (today - last).days >= int(freq)


def eligible_for_contact(
    suppliers: list[dict] | None = None,
    today: date | None = None,
) -> list[dict]:
    """Return suppliers that pass BOTH the consent gate and the rate-limit gate.

    A supplier without ``consent.opted_in is True`` is never returned. This
    function intentionally has no override parameter.
    """
    if suppliers is None:
        suppliers = load_suppliers()
    if today is None:
        today = date.today()

    return [
        s
        for s in suppliers
        if _has_explicit_opt_in(s) and _rate_limit_elapsed(s, today)
    ]


def record_contact(supplier_id: str, when: date | None = None) -> None:
    """Persist that ``supplier_id`` was contacted on ``when`` (default: today).

    Writes only to the real registry file. If the real file does not exist,
    raises FileNotFoundError rather than mutating the committed example.
    Refuses to record a contact for a supplier that has not opted in.
    """
    if not REAL_FILE.exists():
        raise FileNotFoundError(
            f"real registry not found at {REAL_FILE}; "
            "copy suppliers.example.yml to suppliers.yml and fill in real entries first"
        )
    if when is None:
        when = date.today()

    with REAL_FILE.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    suppliers = data.get("suppliers") or []

    target = next((s for s in suppliers if s.get("id") == supplier_id), None)
    if target is None:
        raise KeyError(f"supplier id not found: {supplier_id}")
    if not _has_explicit_opt_in(target):
        raise PermissionError(
            f"refusing to record contact for {supplier_id}: consent.opted_in is not True"
        )

    target["last_contacted"] = when.isoformat()

    with REAL_FILE.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(data, fh, sort_keys=False, allow_unicode=True)
