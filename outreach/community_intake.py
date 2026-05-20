"""Community price-submission intake.

This module is how a reviewed and approved community price submission lands
in the price history. The pipeline is deliberately mediated by a human at
two points:

    1. A submitter opens a price-update GitHub issue using the issue form
       template. The fields are structured (element, price, form, purity,
       quantity, tier, source URL, date observed).

    2. The maintainer reads the issue, sanity-checks the source link, and
       only then runs this tool (or triggers the workflow that wraps it).
       Nothing in here scrapes GitHub on its own. Nothing fires from the
       ``issues: opened`` event. There is no path from an unreviewed issue
       to a written observation.

    3. Even after step 2, the maintainer-triggered workflow opens a pull
       request rather than committing directly, so the data change passes
       through a second human checkpoint before it appears on the public
       site.

Validation reuses the same rules as ``scripts/price_history.py`` and the
same FX table as ``outreach/intake.py`` so all three intake paths (public
listings, supplier quotes, community submissions) write observations under
the same constraints. The only thing that changes between paths is the
``source_type`` tag and the chain of provenance recorded with each row.

Importable API:
    record_submission(...)             — validate and file one submission.
    parse_issue_body(body)             — pick fields out of a GitHub issue
                                          form body (the format produced by
                                          ``.github/ISSUE_TEMPLATE/price-update.yml``).
    parse_price_string(s)              — "60 USD/kg" -> (60.0, "USD").
    parse_element_field(s)             — "Nd (Neodymium)" -> "Nd".
    parse_tier_field(s)                — "Retail (small quantity, ...)" -> "retail".

CLI:
    python outreach/community_intake.py
        Interactive walk-through. The maintainer pastes the fields by hand.

    python outreach/community_intake.py --issue-body-file body.md --issue-number 42
        Non-interactive mode used by the GitHub Action. Reads the issue body
        from a file, parses it, validates, and writes the observation.
        Exits non-zero on any validation failure so the workflow surfaces
        the precise reason instead of silently producing nothing.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date as _date, datetime
from pathlib import Path
from typing import Any

OUTREACH_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = OUTREACH_DIR.parent

if __package__ in (None, ""):
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

_SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from outreach.intake import FxRateMissing, convert_to_usd, _fx_updated  # noqa: E402
from price_history import (  # noqa: E402
    VALID_SOURCE_TYPES,
    VALID_TIERS,
    append_observation,
    validate_observation,
)

SUBMISSION_SOURCE_TYPE = "community_submission"
assert SUBMISSION_SOURCE_TYPE in VALID_SOURCE_TYPES


# ---------- field parsers ----------


_PRICE_RE = re.compile(
    r"""
    ^\s*
    (?P<amount>-?\d+(?:\.\d+)?)
    \s*
    (?P<currency>[A-Za-z]{3})
    \s*
    /
    \s*
    (?P<unit>kg|g|lb|lbs|pound|pounds)
    \s*$
    """,
    re.VERBOSE | re.IGNORECASE,
)


def parse_price_string(value: str) -> tuple[float, str]:
    """Parse a price string like ``"60 USD/kg"`` or ``"5.50 EUR/g"``.

    Returns ``(price_per_kg_in_original_currency, currency_code)``. The
    per-gram and per-pound forms are converted to per-kg here so all
    downstream code can assume per-kg pricing. Anything not matching the
    "<amount> <CCY>/<unit>" shape raises ``ValueError`` — there is no
    fallback to "just the number" because a missing currency cannot be
    safely guessed and a missing unit changes the price by 1000x.
    """
    if not value or not value.strip():
        raise ValueError("price string is empty")

    text = value.strip()
    m = _PRICE_RE.match(text)
    if not m:
        raise ValueError(
            f"price string {value!r} not in expected form "
            "'<amount> <CCY>/<kg|g|lb>' (e.g. '60 USD/kg', '5.50 EUR/g')"
        )

    amount = float(m.group("amount"))
    if amount <= 0:
        raise ValueError(f"price must be positive (got {amount})")

    currency = m.group("currency").upper()
    unit = m.group("unit").lower()

    if unit == "kg":
        per_kg = amount
    elif unit == "g":
        per_kg = amount * 1000.0
    elif unit in ("lb", "lbs", "pound", "pounds"):
        per_kg = amount / 0.45359237
    else:
        raise ValueError(f"unrecognised unit: {unit!r}")

    return per_kg, currency


_ELEMENT_RE = re.compile(r"^\s*([A-Z][a-z]?)\b")


def parse_element_field(value: str) -> str:
    """Parse ``"Nd (Neodymium)"`` (the issue-form dropdown shape) into ``"Nd"``."""
    if not value or not value.strip():
        raise ValueError("element field is empty")
    m = _ELEMENT_RE.match(value)
    if not m:
        raise ValueError(f"could not extract element symbol from {value!r}")
    return m.group(1)


_TIER_MAP = {
    "retail": "retail",
    "bulk": "bulk",
    "industrial": "bulk",
    "bulk / industrial": "bulk",
    "lab": "lab",
    "lab-grade": "lab",
    "lab grade": "lab",
}


def parse_tier_field(value: str) -> str:
    """Map the issue-form tier label to the canonical tier.

    The issue dropdown values are the verbose "Retail (small quantity,
    public storefront)" / "Bulk / Industrial (...)" / "Lab-grade (...)" —
    take the part before any parenthesis, lowercase, and look up.
    """
    if not value or not value.strip():
        raise ValueError("tier field is empty")
    head = value.split("(", 1)[0].strip().lower()
    if head in _TIER_MAP:
        return _TIER_MAP[head]
    if head in VALID_TIERS:
        return head
    raise ValueError(
        f"unrecognised tier {value!r} (expected retail / bulk / lab variants)"
    )


def _coerce_date(value: Any) -> _date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, _date):
        return value
    return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()


# ---------- issue-body parser ----------


_FIELD_LABELS = {
    "element": "element",
    "price": "price",
    "form": "form",
    "purity": "purity",
    "quantity": "quantity",
    "quantity / moq": "quantity",
    "market tier": "tier",
    "tier": "tier",
    "source": "source",
    "date observed": "date_observed",
    "additional notes": "notes",
    "notes": "notes",
}

_NO_RESPONSE = {"_no response_", "no response", "n/a", "na", "-", ""}


def parse_issue_body(body: str) -> dict[str, str]:
    """Pick the price-update fields out of a GitHub issue-form body.

    GitHub Issue Forms render each field as::

        ### <Label>

        <value>

    This walks those headings and returns a dict keyed by canonical field
    name (``element``, ``price``, ``form``, ``purity``, ``quantity``,
    ``tier``, ``source``, ``date_observed``, ``notes``). Unknown headings
    are ignored; missing required fields are caught by the caller via
    validation, not here.
    """
    if not body:
        return {}

    lines = body.replace("\r\n", "\n").split("\n")
    out: dict[str, str] = {}

    current_label: str | None = None
    buf: list[str] = []

    def flush() -> None:
        if current_label is None:
            return
        text = "\n".join(buf).strip()
        if text.lower() in _NO_RESPONSE:
            return
        key = _FIELD_LABELS.get(current_label)
        if key is not None:
            out[key] = text

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("### "):
            flush()
            current_label = stripped[4:].strip().lower()
            buf = []
        else:
            if current_label is not None:
                buf.append(line)
    flush()

    return out


# ---------- core write path ----------


def _build_observation(
    *,
    issue_number: int,
    element: str,
    price_per_kg: float,
    currency: str,
    tier: str,
    source: str,
    date: _date,
    form: str | None,
    purity: str | None,
    quantity: str | None,
    seller: str | None,
    source_url: str | None,
    raw_notes: str | None,
) -> dict[str, Any]:
    usd_price, fx_rate = convert_to_usd(price_per_kg, currency)

    obs: dict[str, Any] = {
        "date": date.isoformat(),
        "tier": tier,
        "price_per_kg": usd_price,
        "currency": "USD",
        "source": source,
        "source_type": SUBMISSION_SOURCE_TYPE,
        "issue_number": int(issue_number),
    }
    if currency.upper() != "USD":
        obs["original_price_per_kg"] = float(price_per_kg)
        obs["original_currency"] = currency.upper()
        obs["fx_rate"] = fx_rate
        fx_updated = _fx_updated()
        if fx_updated:
            obs["fx_rate_date"] = fx_updated
    if form:
        obs["form"] = form.strip()
    if purity:
        obs["purity"] = purity.strip()
    if quantity:
        obs["quantity_basis"] = quantity.strip()
    if seller:
        obs["seller"] = seller.strip()
    if source_url:
        obs["source_url"] = source_url.strip()
    if raw_notes:
        obs["notes"] = raw_notes.strip()
    return obs


def record_submission(
    *,
    issue_number: int,
    element: str,
    price_per_kg: float,
    currency: str,
    tier: str,
    source: str,
    date: Any,
    form: str | None = None,
    purity: str | None = None,
    quantity: str | None = None,
    seller: str | None = None,
    source_url: str | None = None,
    raw_notes: str | None = None,
) -> bool:
    """Validate and file one reviewed community submission.

    Returns ``True`` when the observation was appended, ``False`` when an
    identical (date, tier, source) row already exists. Raises on any
    other failure so the caller can surface the precise reason:

        ValueError          structured fields fail validation
        FxRateMissing       currency not in outreach/fx.yml

    The caller is responsible for confirming the issue has actually been
    reviewed and approved by a human. This function does not call the
    GitHub API and cannot, on its own, tell an unreviewed issue from an
    approved one.
    """
    if not isinstance(issue_number, int) or issue_number <= 0:
        raise ValueError(
            f"issue_number must be a positive integer (got {issue_number!r})"
        )

    symbol = element.strip()
    if not symbol:
        raise ValueError("element symbol is empty")

    tier_value = tier.strip().lower()
    if tier_value not in VALID_TIERS:
        raise ValueError(
            f"invalid tier {tier!r} (expected one of {sorted(VALID_TIERS)})"
        )

    source_value = source.strip()
    if not source_value:
        raise ValueError("source is empty")

    quote_date = _coerce_date(date)
    if quote_date > _date.today():
        raise ValueError(f"date is in the future: {quote_date.isoformat()}")

    obs = _build_observation(
        issue_number=issue_number,
        element=symbol,
        price_per_kg=float(price_per_kg),
        currency=str(currency or "USD").strip().upper(),
        tier=tier_value,
        source=source_value,
        date=quote_date,
        form=form,
        purity=purity,
        quantity=quantity,
        seller=seller,
        source_url=source_url,
        raw_notes=raw_notes,
    )

    ok, message = validate_observation(obs)
    if not ok:
        raise ValueError(f"submission rejected: {message}")

    return append_observation(symbol, obs)


# ---------- convenience: parse + write in one step ----------


def record_from_issue_body(
    *, body: str, issue_number: int, dry_run: bool = False
) -> tuple[bool, dict[str, Any]]:
    """Parse an issue-form body, build the observation, and (optionally) write it.

    Returns ``(wrote, observation_or_preview)``. When ``dry_run`` is true,
    returns the observation that *would* be written without touching the
    history file. Raises ``ValueError`` / ``FxRateMissing`` on any failure
    so the caller (workflow or CLI) sees the exact reason.
    """
    fields = parse_issue_body(body)

    required = ("element", "price", "form", "purity", "quantity", "tier", "source", "date_observed")
    missing = [f for f in required if not fields.get(f)]
    if missing:
        raise ValueError(
            f"issue body is missing required field(s): {missing}. "
            "Found fields: " + ", ".join(sorted(fields)) + ". "
            "Make sure the issue used the price-update template and was "
            "filled out completely before triggering intake."
        )

    element = parse_element_field(fields["element"])
    price_per_kg, currency = parse_price_string(fields["price"])
    tier = parse_tier_field(fields["tier"])
    quote_date = _coerce_date(fields["date_observed"])

    source_text = fields["source"].strip()
    if source_text.startswith("http://") or source_text.startswith("https://"):
        source_url: str | None = source_text
        seller: str | None = None
    else:
        source_url = None
        seller = source_text

    obs_preview = _build_observation(
        issue_number=issue_number,
        element=element,
        price_per_kg=price_per_kg,
        currency=currency,
        tier=tier,
        source=source_text,
        date=quote_date,
        form=fields.get("form"),
        purity=fields.get("purity"),
        quantity=fields.get("quantity"),
        seller=seller,
        source_url=source_url,
        raw_notes=fields.get("notes"),
    )

    ok, message = validate_observation(obs_preview)
    if not ok:
        raise ValueError(f"submission rejected: {message}")

    if dry_run:
        return False, obs_preview

    wrote = record_submission(
        issue_number=issue_number,
        element=element,
        price_per_kg=price_per_kg,
        currency=currency,
        tier=tier,
        source=source_text,
        date=quote_date,
        form=fields.get("form"),
        purity=fields.get("purity"),
        quantity=fields.get("quantity"),
        seller=seller,
        source_url=source_url,
        raw_notes=fields.get("notes"),
    )
    return wrote, obs_preview


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
    print("Community price-submission intake.")
    print(
        "Use this AFTER you have reviewed the GitHub issue and decided it is "
        "trustworthy. Enter the fields exactly as the submitter provided.\n"
    )

    raw_issue = _prompt("Issue number", required=True)
    try:
        issue_number = int(raw_issue)
        if issue_number <= 0:
            raise ValueError
    except ValueError:
        print(f"  (issue number must be a positive integer; got {raw_issue!r})")
        return 2

    raw_element = _prompt("Element (e.g. 'Nd' or 'Nd (Neodymium)')", required=True)
    try:
        element = parse_element_field(raw_element)
    except ValueError as exc:
        print(f"  {exc}")
        return 2

    raw_price = _prompt("Price (e.g. '60 USD/kg' or '5.50 EUR/g')", required=True)
    try:
        price_per_kg, currency = parse_price_string(raw_price)
    except ValueError as exc:
        print(f"  {exc}")
        return 2

    try:
        usd_price, fx_rate = convert_to_usd(price_per_kg, currency)
    except FxRateMissing as exc:
        print(f"  {exc}")
        return 2

    form = _prompt("Form (e.g. metal, oxide)", required=True)
    purity = _prompt("Purity (e.g. 99.9%, 3N)", required=True)
    quantity = _prompt("Quantity / MOQ (e.g. 1 kg)", required=True)

    while True:
        raw_tier = _prompt(
            "Tier (Retail / Bulk-Industrial / Lab-grade)", required=True
        )
        try:
            tier = parse_tier_field(raw_tier)
            break
        except ValueError as exc:
            print(f"  {exc}")

    source = _prompt("Source (seller name or URL)", required=True)
    if source.startswith("http://") or source.startswith("https://"):
        source_url: str | None = source
        seller: str | None = None
    else:
        source_url = None
        seller = source

    today_iso = _date.today().isoformat()
    raw_date = _prompt("Date observed (YYYY-MM-DD)", default=today_iso)
    try:
        quote_date = _coerce_date(raw_date)
    except ValueError:
        print(f"  (invalid date: {raw_date!r})")
        return 2
    if quote_date > _date.today():
        print(f"  (date is in the future: {quote_date.isoformat()})")
        return 2

    notes = _prompt("Additional notes (optional)") or None

    print("\n------ Review ------")
    print(f"  Issue:     #{issue_number}")
    print(f"  Element:   {element}")
    if currency == "USD":
        print(f"  Price:     {usd_price:.4f} USD/kg")
    else:
        print(
            f"  Price:     {price_per_kg:.4f} {currency}/kg "
            f"-> {usd_price:.4f} USD/kg "
            f"(rate: 1 {currency} = {fx_rate} USD; fx.yml updated {_fx_updated() or '?'})"
        )
    print(f"  Form:      {form}")
    print(f"  Purity:    {purity}")
    print(f"  Quantity:  {quantity}")
    print(f"  Tier:      {tier}")
    print(f"  Source:    {source}")
    print(f"  Date:      {quote_date.isoformat()}")
    print(f"  Notes:     {notes or '(blank)'}")
    print(
        f"\nThis will append a community_submission observation to "
        f"_data/price_history/{element}.yml with issue_number={issue_number}.\n"
    )
    confirm = _prompt("Write this submission? (yes/no)", default="no").lower()
    if confirm not in {"y", "yes"}:
        print("Aborted. Nothing was written.")
        return 1

    try:
        wrote = record_submission(
            issue_number=issue_number,
            element=element,
            price_per_kg=price_per_kg,
            currency=currency,
            tier=tier,
            source=source,
            date=quote_date,
            form=form,
            purity=purity,
            quantity=quantity,
            seller=seller,
            source_url=source_url,
            raw_notes=notes,
        )
    except (FxRateMissing, ValueError) as exc:
        print(f"\n  Failed: {exc}")
        return 2

    if not wrote:
        print(
            "\n  Submission validated but an identical observation "
            "(same date+tier+source) already exists. "
            f"No write to {element}.yml."
        )
        return 1

    print(f"\n  Wrote 1 observation to _data/price_history/{element}.yml.")
    return 0


# ---------- non-interactive CLI (used by the workflow) ----------


def _from_file(args: argparse.Namespace) -> int:
    body_path = Path(args.issue_body_file)
    if not body_path.exists():
        print(f"  issue body file not found: {body_path}", file=sys.stderr)
        return 2
    body = body_path.read_text(encoding="utf-8")

    try:
        wrote, obs = record_from_issue_body(
            body=body, issue_number=args.issue_number, dry_run=args.dry_run
        )
    except (FxRateMissing, ValueError) as exc:
        print(f"  intake failed: {exc}", file=sys.stderr)
        return 2

    if args.dry_run:
        print("  dry-run: parsed and validated successfully. Observation preview:")
        for k, v in obs.items():
            print(f"    {k}: {v}")
        return 0

    if not wrote:
        print(
            "  submission validated but an identical observation already exists "
            "(same date+tier+source); nothing was written.",
            file=sys.stderr,
        )
        return 1

    symbol = obs.get("source")  # nominal — used only for logging
    print(f"  wrote 1 community_submission observation (issue #{args.issue_number}).")
    print(f"  source: {symbol}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Intake for reviewed community price submissions. Either run "
            "interactively (default) or pass a previously fetched issue body "
            "via --issue-body-file for the maintainer-triggered workflow."
        )
    )
    parser.add_argument(
        "--issue-body-file",
        help="Path to a file containing the raw GitHub issue body.",
    )
    parser.add_argument(
        "--issue-number",
        type=int,
        help="GitHub issue number (positive integer).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate the issue body but do not write to the "
        "price-history file.",
    )
    args = parser.parse_args(argv)

    if args.issue_body_file or args.issue_number is not None:
        if not (args.issue_body_file and args.issue_number is not None):
            parser.error(
                "--issue-body-file and --issue-number must be given together "
                "in non-interactive mode."
            )
        if args.issue_number <= 0:
            parser.error("--issue-number must be positive.")
        return _from_file(args)

    return _interactive()


if __name__ == "__main__":
    sys.exit(main())
