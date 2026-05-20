# Outreach — Supplier Registry & Draft Generator

This directory holds the price-checking outreach workflow.
It is intentionally small: a YAML registry, a filter module, and a
draft-text generator. **Nothing here sends anything.**

The tool is a **sourcing-workflow assistant** for the maintainer. It
tracks suppliers who have *agreed* to be contacted for periodic price
quotes, drafts polite messages for the maintainer to review, and records
when contact actually happened so per-supplier rate limits hold. It is
**not** a scraper, **not** a bulk mailer, and **not** a cold-outreach
tool. The software assists a human relationship; it never autonomously
contacts anyone.

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

3. **The human sends.** `draft.py` produces text into `outreach/drafts/`,
   but the maintainer is always the one who reviews and sends it from
   their own email client (or pastes it into the supplier's own quote
   form). The tool's job is to keep the list honest, surface who is
   eligible today, fill a polite template, and record that a contact
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
| `outreach/draft.py` | yes | Renders templated drafts to `outreach/drafts/`. |
| `outreach/templates/*.txt` | yes | Plain-text message templates with placeholders. |
| `outreach/drafts/` | **no** (gitignored) | Per-supplier draft files. May contain contact context. |
| `outreach/PAUSED` | (optional) | Global kill switch — if this file exists, `draft.py` does nothing. |

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

## Using the registry directly

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

## The drafting workflow

The complete cycle has four steps. **The software does steps 1 and 4. The
maintainer does steps 2 and 3.**

### 1. Generate drafts

```bash
python -m outreach.draft
```

This loads the registry, asks `eligible_for_contact()` for the opted-in
and rate-limit-cleared subset, fills `templates/price_inquiry.txt` for
each, and writes the result to `outreach/drafts/{supplier_id}_{date}.txt`.
A summary is printed: how many drafts were generated, how many suppliers
were skipped, and the reason for each skip (not opted in / rate-limited
/ a draft already exists for today).

`draft.py` never re-renders over a draft from the same day, so the script
is safe to re-run.

### 2. Review

Open each file in `outreach/drafts/`. Every draft begins with a `#`
metadata header — recipient, contact method, contact value, template
used, generation date, and the exact command to run after sending. The
header ends with a `===` separator; **everything below the separator is
the message body**, everything above it is for the maintainer only and
should not be sent.

Edit the body freely. Add specifics. Tone-match what you know of the
supplier. The template is a starting point, not a script.

### 3. Send manually

Open the supplier's contact method by hand:

- `contact_method: email` — paste the body into your own email client.
- `contact_method: web_form` — paste the body into the form at
  `contact_value`.
- `contact_method: none` — do not send anything; the registry should not
  have surfaced this supplier in the first place.

Nothing about this step is automated.

### 4. Record the contact

After you actually pressed send, record it so the per-supplier rate
limit is honored on the next run:

```bash
python -c "from outreach.registry import record_contact; record_contact('example-webform-opted-in')"
```

Each draft's header includes this exact command pre-filled with the
supplier id. If you reviewed a draft and decided not to send it, don't
record anything — just delete the file.

### Following up

If a supplier hasn't replied and you'd like to send one polite follow-up,
use the dedicated template:

```bash
python -m outreach.draft --template follow_up
```

The follow-up generator goes through the same eligibility filter, so it
will only surface suppliers whose rate-limit window has elapsed. For a
supplier still inside their rate-limit window, copy
`templates/follow_up.txt` by hand, fill it in, and send it directly —
that is a deliberate, one-off human action, not something automated.

**Never send more than one follow-up.** If the second message also gets
no reply, drop it. Treat silence as a soft opt-out.

## The kill switch

If anything feels off — a supplier complaint, an unclear consent record,
a registry change you haven't fully reviewed — halt all draft generation
with:

```bash
touch outreach/PAUSED
```

While that file exists, `python -m outreach.draft` does nothing except
print a message saying outreach is paused. Remove the file to resume:

```bash
rm outreach/PAUSED
```

The kill switch is a global stop, not a per-supplier one. Per-supplier
opt-outs go in `suppliers.yml` (`consent.opted_in: false`).

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
- Connect to any SMTP server, mail API, or third-party messaging service.
- Contact a supplier whose `consent.opted_in` is not `True`.
- Bypass the rate limit because "it's been almost long enough".
- Send more than one follow-up to a supplier who hasn't replied.
- Be served on the public Jekyll site.
- Be committed to git in a form that exposes real contact details or
  drafts.
