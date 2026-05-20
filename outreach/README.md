# Outreach Foundation — Supplier Registry

This directory holds the **foundation** for a price-checking outreach workflow.
It is intentionally small: a YAML registry and a Python module that filters
it. Nothing here sends anything.

The tool we are building is a **sourcing-workflow assistant** for the
maintainer. It tracks suppliers who have *agreed* to be contacted for
periodic price quotes, and (in a later layer) drafts messages for the
maintainer to review and send by hand. It is **not** a scraper, **not** a
bulk mailer, and **not** a cold-outreach tool.

## Philosophy

1. **Consent-first.** A supplier is contacted only if they have explicitly
   opted in. The opt-in is recorded in `consent.opted_in` with a date and a
   short note describing where consent came from. There is **no** override
   flag, **no** "force" parameter, and **no** "just this once" exception.
   `registry.eligible_for_contact()` will not return a supplier whose
   `consent.opted_in` is not exactly `True`, full stop.

2. **Per-supplier rate limiting.** Every supplier carries
   `contact_frequency_days` (default 30). The registry will not surface a
   supplier as eligible until that many days have elapsed since
   `last_contacted`. This protects suppliers from being pestered even after
   they have opted in.

3. **The human sends.** Future layers may draft a message, but the maintainer
   is always the one who reviews and sends it. The tool's job is to keep the
   list honest, surface who is eligible today, and record that a contact
   happened so the rate limit is respected next time.

4. **Opt-outs are honored immediately.** If a supplier asks to stop, flip
   `consent.opted_in` to `false` in `outreach/suppliers.yml`. From that point
   on `eligible_for_contact()` will never return them. Keep the entry (so a
   future maintainer does not re-add them by accident) but mark it opted out
   and note the date and reason in `notes`.

## Files

| Path | Committed? | Purpose |
| --- | --- | --- |
| `outreach/suppliers.example.yml` | yes | Schema documentation and template. Contains no real contact details. |
| `outreach/suppliers.yml` | **no** (gitignored) | Real registry with real contact details. Create by copying the example. |
| `outreach/*.local.*` | **no** (gitignored) | Scratch files for local drafts; never committed. |
| `outreach/registry.py` | yes | Loader, consent+rate-limit filter, contact recorder. |

The whole `outreach/` directory is excluded from Jekyll's build (see
`_config.yml`) so nothing here is ever served on the public site.

## Schema

See `suppliers.example.yml` for the canonical schema. Required fields per
supplier:

- `id` — unique kebab-case identifier
- `name`, `website`
- `contact_method` — `email`, `web_form`, or `none`
- `contact_value` — the actual address or URL (kept only in the gitignored real file)
- `consent.opted_in` (bool), `consent.opt_in_date` (ISO date), `consent.opt_in_source` (string)
- `elements_supplied` (list of element symbols)
- `tiers` — any subset of `[retail, lab, bulk]`
- `contact_frequency_days` — minimum days between contacts
- `last_contacted` — ISO date or `null`
- `notes` — free-form

## Using the module

```python
from outreach.registry import load_suppliers, eligible_for_contact, record_contact

# 1. Inspect who is eligible today.
for s in eligible_for_contact():
    print(s["id"], s["name"], s["contact_method"])

# 2. After you manually send a message, record it so the rate limit applies.
record_contact("example-distributor-opted-in")
```

`record_contact` writes only to `outreach/suppliers.yml`. It will refuse to
mutate the committed example file, and it will refuse to record a contact
for a supplier whose `consent.opted_in` is not `True`.

## Adding a new supplier

1. Confirm consent **before** adding the entry. Acceptable sources:
   - A reply from the supplier saying they want to receive periodic
     quote requests.
   - A signup the supplier completed themselves (trade-show form, their
     own "request a quote" page that invites repeat inquiries, etc.).
2. Add the entry to `outreach/suppliers.yml` (not the example file) with
   `consent.opted_in: true`, the opt-in date, and a one-line `opt_in_source`
   that names where the consent came from. Future-you needs to be able to
   audit this.
3. Set a sensible `contact_frequency_days`. Default 30; for suppliers who
   prefer quarterly cadence, use 90. When in doubt, ask them and write what
   they said.

## What this directory will *never* do

- Send email or fill web forms automatically.
- Contact a supplier whose `consent.opted_in` is not `True`.
- Bypass the rate limit because "it's been almost long enough".
- Be served on the public Jekyll site.
- Be committed to git in a form that exposes real contact details.
