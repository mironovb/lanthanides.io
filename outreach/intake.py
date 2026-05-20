"""Inbound quote intake for the outreach workflow.

This module is how a supplier's price reply lands in the price history. It
is human-mediated: the maintainer reads the supplier reply, picks the
structured fields out of it, and runs this tool to validate and file the
quote. Nothing here scrapes a mailbox, parses free-form text, or fetches
anything from the network. There is no AI extraction in this loop on
purpose — the maintainer is the parser.

Pipeline for one quote:
    1. Look up the supplier in the outreach registry. Refuse if not found
       or if ``consent.opted_in`` is not ``True``.
    2. Validate the structured fields with the same rules used elsewhere
       (positive price, non-future date, known tier, required fields).
    3. If the currency is not USD, convert using the static FX table in
       ``outreach/fx.yml``. The table is maintained by hand — this module
       never calls a live FX API. When a currency is not listed in the
       table, intake refuses rather than guesses.
    4. Append the observation to ``_data/price_history/<symbol>.yml`` with
       ``source`` set to the supplier id and ``source_type`` set to
       ``supplier_quote``. The original price, original currency, and FX
       rate used are preserved alongside the USD value.
    5. Call ``registry.record_contact()`` to bump the per-supplier
       rate-limit clock.

Importable API:
    record_quote(...)                  — validate and file one quote.
    convert_to_usd(amount, currency)   — read fx.yml and convert.

CLI:
    python outreach/intake.py          — interactive walk-through.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date as _date, datetime
from pathlib import Path
from typing import Any

import yaml

OUTREACH_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = OUTREACH_DIR.parent
FX_FILE = OUTREACH_DIR / "fx.yml"

# Allow running this file directly via ``python outreach/intake.py``.
if __package__ in (None, ""):
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

# price_history.py lives in scripts/, which is not a package.
_SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from outreach import registry  # noqa: E402
from price_history import (  # noqa: E402
    VALID_SOURCE_TYPES,
    VALID_TIERS,
    append_observation,
    validate_observation,
)

QUOTE_SOURCE_TYPE = "supplier_quote"
assert QUOTE_SOURCE_TYPE in VALID_SOURCE_TYPES


class FxRateMissing(KeyError):
    """Raised when a currency is not listed in outreach/fx.yml."""


def _load_fx() -> dict[str, Any]:
    if not FX_FILE.exists():
        return {}
    with FX_FILE.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    return data if isinstance(data, dict) else {}


def _fx_rates() -> dict[str, float]:
    raw = _load_fx().get("rates") or {}
    if not isinstance(raw, dict):
        return {}
    out: dict[str, float] = {}
    for k, v in raw.items():
        try:
            out[str(k).upper()] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def _fx_updated() -> str:
    raw = _load_fx().get("updated")
    if raw is None:
        return ""
    if isinstance(raw, _date):
        return raw.isoformat()
    return str(raw)


def convert_to_usd(amount: float, currency: str) -> tuple[float, float]:
    """Convert ``amount`` of ``currency`` to USD using outreach/fx.yml.

    Returns ``(usd_amount, fx_rate)``. ``fx_rate`` is ``1.0`` when the
    currency is already USD. Raises :class:`FxRateMissing` when the
    currency is not in the table — the maintainer must add it first.
    """
    cur = str(currency or "USD").strip().upper()
    if cur == "USD":
        return float(amount), 1.0
    rates = _fx_rates()
    if cur not in rates:
        raise FxRateMissing(
            f"currency {cur!r} is not in {FX_FILE.name}; add a rate manually "
            "before recording this quote (the tool will not guess)."
        )
    return float(amount) * rates[cur], rates[cur]


def _verify_supplier_opted_in(supplier_id: str) -> dict:
    suppliers = registry.load_suppliers()
    target = next((s for s in suppliers if s.get("id") == supplier_id), None)
    if target is None:
        raise KeyError(f"supplier id not found in registry: {supplier_id!r}")
    if not registry._has_explicit_opt_in(target):
        raise PermissionError(
            f"refusing to record a quote from {supplier_id!r}: "
            "consent.opted_in is not True."
        )
    return target


def _coerce_date(value: Any) -> _date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, _date):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def record_quote(
    *,
    supplier_id: str,
    element: str,
    tier: str,
    price_per_kg: float,
    currency: str,
    date: Any,
    form: str | None = None,
    purity: str | None = None,
    raw_note: str | None = None,
) -> bool:
    """Validate and file an inbound supplier quote.

    Returns ``True`` when the observation was appended. Returns ``False``
    only when an identical observation (same date, tier, source) was
    already in the history file. Raises on any other failure so the
    maintainer sees the precise reason:

        KeyError            supplier_id not in the registry
        PermissionError     supplier not opted in
        FxRateMissing       currency not in outreach/fx.yml
        FileNotFoundError   real outreach/suppliers.yml not set up
        ValueError          structured fields fail validation
    """
    if not registry.REAL_FILE.exists():
        raise FileNotFoundError(
            f"real registry not found at {registry.REAL_FILE}; "
            "copy suppliers.example.yml to suppliers.yml and add the "
            "supplier you are recording a quote from first."
        )

    supplier = _verify_supplier_opted_in(supplier_id)

    cur = str(currency or "USD").strip().upper()
    usd_price, fx_rate = convert_to_usd(float(price_per_kg), cur)
    quote_date = _coerce_date(date)

    obs: dict[str, Any] = {
        "date": quote_date.isoformat(),
        "tier": str(tier).strip(),
        "price_per_kg": usd_price,
        "currency": "USD",
        "source": supplier_id,
        "source_type": QUOTE_SOURCE_TYPE,
    }
    if cur != "USD":
        obs["original_price_per_kg"] = float(price_per_kg)
        obs["original_currency"] = cur
        obs["fx_rate"] = fx_rate
        fx_updated = _fx_updated()
        if fx_updated:
            obs["fx_rate_date"] = fx_updated
    if form:
        obs["form"] = str(form).strip()
    if purity:
        obs["purity"] = str(purity).strip()
    if raw_note:
        obs["notes"] = str(raw_note).strip()
    if supplier.get("name"):
        obs["seller"] = supplier["name"]

    ok, message = validate_observation(obs)
    if not ok:
        raise ValueError(f"quote rejected: {message}")

    wrote = append_observation(element, obs)
    if wrote:
        registry.record_contact(supplier_id, when=quote_date)
    return wrote


# ---------- interactive CLI ----------


def _prompt(label: str, default: str | None = None, *, required: bool = False) -> str:
    suffix = f" [{default}]" if default not in (None, "") else ""
    while True:
        try:
            value = input(f"{label}{suffix}: ").strip()
        except EOFError:
            value = ""
        if not value and default is not None:
            return default
        if not value and not required:
            return ""
        if not value and required:
            print("  (required — enter a value or Ctrl-C to abort)")
            continue
        return value


def _interactive() -> int:
    print("Inbound quote intake.")
    print("Enter the fields from the supplier reply. Empty value = use default.\n")

    if not registry.REAL_FILE.exists():
        print(
            f"  real registry not found at {registry.REAL_FILE}.\n"
            "  Copy suppliers.example.yml to suppliers.yml and add the "
            "supplier you are recording a quote from first."
        )
        return 2

    supplier_id = _prompt("Supplier id (must be opted in)", required=True)
    try:
        supplier = _verify_supplier_opted_in(supplier_id)
    except (KeyError, PermissionError) as exc:
        print(f"\n  {exc}")
        return 2

    consent = supplier.get("consent") or {}
    opt_in_date = consent.get("opt_in_date") or "?"
    print(f"  -> {supplier.get('name', supplier_id)} (opted in {opt_in_date})\n")

    element = _prompt("Element symbol (e.g. Nd)", required=True)

    while True:
        tier = _prompt(f"Tier {sorted(VALID_TIERS)}", required=True).lower()
        if tier in VALID_TIERS:
            break
        print(f"  (expected one of {sorted(VALID_TIERS)})")

    while True:
        raw_price = _prompt("Price per kg", required=True)
        try:
            price = float(raw_price)
            if price <= 0:
                raise ValueError
            break
        except ValueError:
            print("  (must be a positive number)")

    currency = _prompt("Currency", default="USD").upper()
    try:
        usd_price, fx_rate = convert_to_usd(price, currency)
    except FxRateMissing as exc:
        print(f"\n  {exc}")
        return 2

    form = _prompt("Form (optional, e.g. metal, oxide)") or None
    purity = _prompt("Purity (optional, e.g. 99.9% (3N))") or None
    today_iso = _date.today().isoformat()
    raw_date = _prompt("Quote date (YYYY-MM-DD)", default=today_iso)
    try:
        quote_date = _coerce_date(raw_date)
    except ValueError:
        print(f"  (invalid date: {raw_date!r})")
        return 2
    if quote_date > _date.today():
        print(f"  (date is in the future: {quote_date.isoformat()})")
        return 2

    raw_note = _prompt("Raw note from supplier (optional, one line)") or None

    print("\n------ Review ------")
    print(f"  Supplier:  {supplier_id} ({supplier.get('name', '')})")
    print(f"  Element:   {element}")
    print(f"  Tier:      {tier}")
    if currency == "USD":
        print(f"  Price:     {usd_price:.4f} USD/kg")
    else:
        print(
            f"  Price:     {price:.4f} {currency}/kg "
            f"-> {usd_price:.4f} USD/kg "
            f"(rate: 1 {currency} = {fx_rate} USD; fx.yml updated {_fx_updated() or '?'})"
        )
    print(f"  Form:      {form or '(blank)'}")
    print(f"  Purity:    {purity or '(blank)'}")
    print(f"  Date:      {quote_date.isoformat()}")
    print(f"  Note:      {raw_note or '(blank)'}")
    print("\nThis will:")
    print(f"  - append a supplier_quote observation to _data/price_history/{element}.yml")
    print(f"  - record_contact({supplier_id!r}) dated {quote_date.isoformat()}\n")

    confirm = _prompt("Write this quote? (yes/no)", default="no").lower()
    if confirm not in {"y", "yes"}:
        print("Aborted. Nothing was written.")
        return 1

    try:
        wrote = record_quote(
            supplier_id=supplier_id,
            element=element,
            tier=tier,
            price_per_kg=price,
            currency=currency,
            date=quote_date,
            form=form,
            purity=purity,
            raw_note=raw_note,
        )
    except (FxRateMissing, KeyError, PermissionError, ValueError, FileNotFoundError) as exc:
        print(f"\n  Failed: {exc}")
        return 2

    if not wrote:
        print(
            "\n  Quote validated but an identical observation "
            "(same date+tier+source) already exists. "
            f"No write to {element}.yml; no contact recorded."
        )
        return 1

    print(f"\n  Wrote 1 observation to _data/price_history/{element}.yml.")
    print(f"  Recorded contact for {supplier_id} on {quote_date.isoformat()}.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Interactive intake for inbound supplier quotes. The maintainer "
            "reads the supplier reply and enters the structured fields; "
            "this tool validates them, converts currency, files a dated "
            "observation with provenance, and records the contact."
        )
    )
    parser.parse_args(argv)
    return _interactive()


if __name__ == "__main__":
    sys.exit(main())
