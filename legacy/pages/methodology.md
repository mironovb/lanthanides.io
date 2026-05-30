---
layout: data-page
title: "Methodology"
description: "How price data is collected, normalised, verified, and displayed on lanthanides.io."
keywords: "rare earth pricing methodology, price data sources, rare earth data collection, bulk benchmark methodology, retail reference price, rare earth price verification"
permalink: /methodology/
---

## Purpose

lanthanides.io tracks real-world prices for rare earths, rare metals (tantalum, niobium,
cobalt, lithium), strategic metals, and semiconductor materials. It is designed for procurement
analysis, supply-risk monitoring, and market intelligence.

All displayed prices require source provenance. No data is fabricated, interpolated, or
synthetically generated.

---

## Display Prices {#display-price}

Each element page shows two headline prices representing distinct market tiers.

### Retail Reference

The **retail reference** is the lowest verified, in-stock price from an established Western
retailer for a practical quantity (roughly 10–100 g). It answers the question: *what would
it cost to buy this element today?*

Selection criteria:

- **Source:** Established retailers with public storefronts and track records. Anonymous or
  unverified marketplace listings are excluded.
- **Stock:** Must be currently available — not sold out, backordered, or "notify me" status.
- **Form:** Metal is preferred when available. Where only oxide or other forms are sold at
  retail, the form is stated explicitly.
- **Quantity band:** The listing in the 10–100 g range yielding the lowest normalised cost
  (USD/kg) is selected. Listings under 5 g are excluded to avoid small-quantity premiums
  that distort the rate. Listings over 1 kg are excluded as wholesale.
- **Purity:** The most commonly available commercial purity, generally 99.9%–99.99% for
  rare earths.
- **Confidence:** The selected record must have a confidence score ≥ 0.5.

The retail reference is a *single observed price*, not a computed average. It is directly
actionable — a reader can visit the cited seller and purchase at or near this price.

### Bulk Benchmark

The **bulk benchmark** is the most recent credible price for industrial-scale quantities of
the element's primary trade form — usually oxide for rare earths. It answers the question:
*what is this material worth at commodity scale?*

Source hierarchy (in order of preference):

1. Recognised price-reporting agency (Fastmarkets, Argus, Shanghai Metals Market, IMARC)
2. USGS Mineral Commodity Summary unit value (if published within 12 months)
3. Corroborated direct-seller quote with MOQ ≥ 10 kg and confidence ≥ 0.6
4. Procurement index (BusinessAnalytiq or equivalent), labelled as index-derived

Delivery basis is stated with each benchmark (e.g., EXW China, FOB China, CIP NE Asia).
Where no commodity benchmark exists, the field displays "—" with an explanatory note.

### Retail Premium

Where both prices are available, the ratio Retail Reference ÷ Bulk Benchmark is displayed.
This ratio quantifies the combined cost of reduction, refining, packaging, certification,
and dealer margin above the commodity input price. For rare earth metals, this ratio
typically ranges from 2× (abundant light rare earths) to 100×+ (ultra-pure research
grades of scarce elements).

### Why not an average?

Previous versions of this site displayed a confidence-weighted mean across all retail
records. This was retired because averaging across structurally different market segments
(collector specimens, bullion bars, laboratory reagents, investment platforms) produces
a number that corresponds to no real transaction. A PEGUYS 10 g vial, an RWMM bullion
ingot, and a Sigma-Aldrich 1 g reagent jar are not three noisy observations of the same
price — they are three different products.

Commodity price benchmarks (Fastmarkets, Argus, SMM) solve this by defining a single
reference product with fixed specifications and surveying transaction prices for that
product only. The two-reference approach adopted here applies the same logic: each
displayed number refers to one specific product class, clearly identified.

The full offers table on each element page preserves all collected data for readers who
need the complete picture.

---

## Price Tiers

### Retail
Small-quantity purchases available to individuals, laboratories, or small businesses.
Sold by online retailers, specialty chemical suppliers, or small distributors. Quantities
typically under 25 kg.

### Bulk / Industrial
Larger-quantity purchases through industrial distributors, manufacturers, or commodity
brokers. MOQ typically ≥ 25 kg. Often require direct quotation with negotiated terms.

### Lab-grade
Research-quantity purchases from scientific suppliers (Alfa Aesar, Sigma-Aldrich,
Chemsavers, MSE Supplies). Per-gram costs are often 10–1,000× above commodity prices
due to certification, packaging, and ultra-high purity. These records are included in
the offers table for completeness but are never selected as the retail reference due
to their extreme per-kilogram rates.

Retail and bulk prices are never merged or averaged. They represent different markets.

---

## Normalisation

All prices are normalised to **USD per kilogram** for comparability.

- **Currency:** Converted at the exchange rate recorded when the quote was collected.
  Rate and date are stored with each record.
- **Units:** Per-gram, per-pound, per-ounce, or per-tonne prices are converted using
  standard factors.
- **Original preservation:** The original quoted price, currency, and unit are always
  retained. The normalised value is a derived field.

Normalisation never changes the underlying quote. Always refer to the original values
in the provenance table for precision.

---

## Oxide-to-Metal Conversion {#oxide-to-metal}

Most rare earths are primarily traded in oxide form. When comparing oxide and metal
prices, the stoichiometric relationship and processing premium must be considered.

### Stoichiometric mass fraction

For a rare earth oxide RE<sub>*x*</sub>O<sub>*y*</sub>, the metal content is:

*f*<sub>RE</sub> = (*x* · *A*<sub>RE</sub>) / (*x* · *A*<sub>RE</sub> + *y* · *A*<sub>O</sub>)

where *A*<sub>RE</sub> is the atomic mass of the rare earth and *A*<sub>O</sub> = 15.999 u.

| Oxide | Formula | Metal fraction | Metal from 1 kg oxide |
|-------|---------|----------------|----------------------|
| Scandium oxide | Sc₂O₃ | 0.652 | 652 g |
| Lanthanum oxide | La₂O₃ | 0.853 | 853 g |
| Cerium oxide | CeO₂ | 0.814 | 814 g |
| Neodymium oxide | Nd₂O₃ | 0.857 | 857 g |
| Terbium oxide | Tb₄O₇ | 0.850 | 850 g |
| Dysprosium oxide | Dy₂O₃ | 0.871 | 871 g |
| Holmium oxide | Ho₂O₃ | 0.873 | 873 g |

### Metal price estimate from oxide

*P*<sub>metal,est</sub> = (*P*<sub>oxide</sub> / *f*<sub>RE</sub>) × *m*

where *m* is the metal-over-oxide multiple, typically 1.5–3.0× for rare earths,
reflecting reduction costs (calcium or lithium reduction under vacuum or inert
atmosphere).

This conversion is for analytical reference only. Display prices are taken directly
from observed records and do not apply stoichiometric conversion.

---

## Material Forms and Purity

Prices are tracked separately by form (oxide, metal, powder, alloy, compound, etc.)
and by purity (99%, 99.5%, 99.9%, 99.99%, etc.).

The retail reference price always states its form and purity. No aggregation across
forms or purities occurs in the headline display.

---

## Verification and Confidence

### Verification statuses

| Status | Meaning |
|--------|---------|
| Verified Invoice | Extracted from an uploaded invoice with quantity, date, price |
| Corroborated | ≥ 2 recent independent offers aligned on price range |
| Single-Source Offer | One recent public offer; no independent confirmation |
| Benchmark-Linked | Supported by a recognised index or benchmark entry |
| Stale | Older than 90 days; directionally useful but not current |
| Archived | Hidden from current views; retained for history |

### Confidence scores

| Range | Interpretation |
|-------|---------------|
| 0.8–1.0 | High — invoice-backed or well-corroborated |
| 0.5–0.79 | Medium — plausible, limited corroboration |
| 0.0–0.49 | Low — single source, unclear provenance |

Confidence is assigned during ingestion based on source type, parse quality,
corroboration, and recency. The confidence score determines eligibility for
reference-price selection (minimum 0.5 for retail reference, 0.6 for bulk benchmark)
but does not affect a weighted average — there is no weighted average.

---

## Source Categories

Price data is collected from four principal source categories.

### Specialty element retailers
Established Western retailers with public storefronts selling individual elements
in collector, educational, and laboratory quantities. Includes dedicated element
shops, eBay sellers with multi-year track records and verifiable feedback histories,
and bullion dealers. These provide retail reference prices.

### Chemical and laboratory suppliers
Companies selling reagent-grade, research-grade, or industrial chemical products.
Includes both large catalogues (Sigma-Aldrich, Alfa Aesar, MSE Supplies) and
smaller specialty chemical distributors (Chemsavers). These records are included
in offers tables for completeness but are generally not selected as the retail
reference due to extreme per-kilogram rates at laboratory scale.

### Chinese trading platforms and manufacturers
Alibaba-verified suppliers, direct manufacturer quotes, and Chinese commodity
indices. These sources provide bulk benchmark pricing. For export-controlled
elements, listed prices may not reflect obtainable export pricing — the applicable
regulatory status is always noted alongside.

### Direct supplier quotes and invoices
Quotations solicited directly from distributors, manufacturers, or trading companies,
plus uploaded purchase invoices. These carry the highest trust tier and are the
preferred source for both retail and bulk reference prices.

Solicited supplier quotes are collected through a **consent-gated workflow**.
A supplier appears in the outreach registry only after explicit opt-in
(`consent.opted_in: true`), with a dated note recording where the consent came
from, and contact is rate-limited per supplier. When a supplier replies with a
price, the maintainer enters the structured fields through `outreach/intake.py`,
which:

- validates the input (rejecting non-positive prices, future dates, unknown
  tiers, or missing required fields),
- converts non-USD prices using a manually maintained FX table at
  `outreach/fx.yml`; no live FX API is called, and a currency missing from
  that table is refused rather than guessed,
- preserves the original quoted price, original currency, and FX rate used
  alongside the USD-normalised value,
- appends a dated observation to the element's price history with
  `source_type: supplier_quote` and the supplier id as the source,
- and records the contact in the registry so the per-supplier rate limit is
  honoured on the next outreach run.

The `source_type` tag lets the front end and downstream analysis distinguish
maintainer-collected quotes from public-listing prices. If a supplier omits
a value (purity, form, exchange-rate context), the corresponding field is
left blank rather than guessed — no prices are invented. Suppliers can
withdraw consent at any time and are removed from outreach immediately; the
observations they previously contributed remain in place, attributed to them
by id and dated as of the original reply.

### Permanently excluded sources
Certain sources are permanently excluded from the database regardless of apparent
pricing. Exclusion criteria include: sellers with documented patterns of misrepresenting
purity or origin; platforms where provenance cannot be independently established;
aggregator sites that republish prices without source attribution; and any source
where repeated verification attempts have produced inconsistent or fabricated data.
Excluded sources are not named publicly but are tracked internally.

---

## Provenance Chain {#provenance-chain}

Every price observation in the database arrives through one of three intake
paths. All three apply the same validation rules — positive price, non-future
date, known tier, known element, FX rate present for non-USD — and every
observation carries an explicit `source_type` tag identifying which path it
came from. No observation is ever fabricated, interpolated, or synthesised
from a model.

### Public listings (`source_type: public_listing`)

Prices observed on a public storefront — specialty retailers, eBay sellers
with verifiable feedback histories, Alibaba pages, lab-supply catalogues.
Collected by the maintainer or the data pipeline with the seller name, date,
form, purity, quantity, and (where available) the original URL recorded
alongside the price. A reader can, in principle, visit the cited URL and
verify the listing.

### Community submissions (`source_type: community_submission`)

Prices submitted by readers through the [price-update GitHub issue template](https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml).
The path has **two human checkpoints** by design:

1. **The maintainer reads the issue.** Until the maintainer applies the
   `approved` label, no automation will touch the data. The issue might
   describe a real and useful observation; it might also describe something
   stale, mis-typed, or speculative. The maintainer is the one who decides
   the difference and records that decision by labelling the issue.
2. **A pull request opens with the data change.** The maintainer-triggered
   workflow at `.github/workflows/community-intake.yml` (manual
   `workflow_dispatch` only — never automatic on issue creation) parses the
   approved issue, validates the fields with the same rules used for
   listings and quotes, and opens a PR adding one observation to
   `_data/price_history/<symbol>.yml`. Merging the PR is what publishes
   the observation. Closing it without merging discards the submission
   cleanly. The submission carries the original issue number for traceability.

A submission that cannot be validated (bad price string, missing field,
future date, unknown currency) fails loudly in the workflow run rather
than silently producing a half-record. There is no path from an
unreviewed, unlabelled, or malformed issue into the price history.

### Supplier quotes (`source_type: supplier_quote`)

Prices replied directly by suppliers who have opted in to the outreach
registry. The opt-in is recorded with a date and a short note describing
where consent came from; a supplier without `consent.opted_in: true` is
never contacted and never has a quote recorded against them. When a
supplier replies, the maintainer reads the message and runs
`outreach/intake.py` to enter the structured fields by hand — no scraping,
no auto-parsing of free-form text, no live FX API. The original quoted
price, original currency, and FX rate used are preserved alongside the
USD-normalised value, and the contact is recorded in the registry so the
per-supplier rate limit is honoured on the next outreach run. Suppliers
can withdraw consent at any time; the observations they previously
contributed remain in place, attributed to them and dated as of the
original reply.

### Shared guarantees across all three paths

- **Validated.** Every observation goes through `scripts/price_history.py`'s
  validator: positive `price_per_kg`, non-future `date`, known `tier`
  (`retail`, `bulk`, `lab`), known `source_type`, non-empty `source`.
- **Dated.** Every observation carries the date it was observed, quoted,
  or invoiced — never an ingestion date dressed up as a quote date.
- **Attributed.** Every observation names its source. For listings, that's
  the seller and (where available) URL. For quotes, the supplier id from
  the registry. For community submissions, the seller / URL the submitter
  gave, plus the issue number.
- **Never invented.** No field is filled in to "complete the record". If a
  supplier omits purity, the purity field is blank. If a community
  submission omits a date, the workflow refuses to write the row.

---

## Data sources breakdown {#data-sources-breakdown}

The mix of observations currently in the database, by intake path.
Regenerated by `scripts/source_breakdown.py` from
`_data/price_history/*.yml` — this table reflects what the data actually
contains, not an aspirational target.

{% assign breakdown = site.data.source_breakdown %}
{% if breakdown %}
<p><em>Generated {{ breakdown.generated_on }} from {{ breakdown.total_observations }} observations.</em></p>

| Source type | Count | Share | Description |
|-------------|------:|------:|-------------|
{% for row in breakdown.by_source_type -%}
| **{{ row.label }}** | {{ row.count }} | {{ row.percent }}% | {{ row.description }} |
{% endfor %}
{% endif %}

---

## Source Trust Tiers

1. Uploaded invoices — direct transactional evidence
2. Direct distributor/manufacturer offers — explicit quantity, date, price
3. Manually reviewed public offers — curator-verified marketplace listings
4. Benchmark references — industry indices and published benchmarks
5. News/context only — not used as primary price sources

---

## Data Freshness

- **Fresh:** Quoted within 90 days
- **Stale:** 90–180 days old; flagged visually
- **Archived:** Older than 180 days or manually archived

---

## Update Frequency and Timestamps

Price records carry two timestamps:

- **Quote date:** The date the price was observed, quoted, or invoiced. This is the
  authoritative date for freshness calculations.
- **Ingestion timestamp:** When the record was added to the database.

The database is updated on a rolling basis as new quotes are collected, invoices are
processed, or benchmark updates are published. There is no fixed update schedule.
Freshness is determined per-record, not per-page: an element page may display a fresh
retail reference alongside a stale bulk benchmark if one has been updated more recently
than the other.

Build timestamps in the site footer indicate when the static site was last regenerated,
not when data was last collected.

---

## Minimum Order Quantity (MOQ)

MOQ is displayed with each record because it fundamentally determines price.
A 1 kg retail quote is not comparable to a 500 kg industrial contract.

---

## Why Some Pages Show Sparse Data

This ledger tracks only verified data with clear provenance. Sparse data is better
than fabricated data. Empty fields mean "not yet collected," not "does not exist."

---

## How to Contribute Data

Community contributions are welcome. There are several ways to submit data:

- **Submit a price observation:** [Open a GitHub issue](https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml) using the price update template. See [Provenance Chain](#provenance-chain) for what happens next: the maintainer reviews and labels the issue, a workflow opens a pull request, and a second review merges it. Two human checkpoints before the data appears on the public site.
- **Report a data error:** [Open a correction issue](https://github.com/mironovb/lanthanides.io/issues/new?template=data-correction.yml)
- **Submit a market note:** [Open a market note issue](https://github.com/mironovb/lanthanides.io/issues/new?template=market-note.yml)
- **Submit a pull request:** Edit `_data/price_records.json` or `_data/elements/` files directly

For developers and analysts who want to contribute via PR:

- **Upload invoices:** Place PDF, CSV, or XLSX files in `invoices/` and run the
  import script
- **Add curated offers:** Register a source in `_data/source_registry.yml` and run
  the offer import script
- **Manual entry:** Add records directly to `_data/price_records.json` following
  the schema

All contributions must include source provenance. See the full [contribution guide](https://github.com/mironovb/lanthanides.io/blob/main/CONTRIBUTING.md) for data formats, source requirements, and local setup instructions. See the [Sources](/sources/) page for the current source registry.
