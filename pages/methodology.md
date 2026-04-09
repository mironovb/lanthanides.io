---
layout: data-page
title: "Methodology"
description: "How price data is collected, normalised, verified, and displayed on lanthanides.io."
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

## Minimum Order Quantity (MOQ)

MOQ is displayed with each record because it fundamentally determines price.
A 1 kg retail quote is not comparable to a 500 kg industrial contract.

---

## Why Some Pages Show Sparse Data

This ledger tracks only verified data with clear provenance. Sparse data is better
than fabricated data. Empty fields mean "not yet collected," not "does not exist."

---

## How to Contribute Data

- **Upload invoices:** Place PDF, CSV, or XLSX files in `invoices/` and run the
  import script
- **Add curated offers:** Register a source in `_data/source_registry.yml` and run
  the offer import script
- **Manual entry:** Add records directly to `_data/price_records.json` following
  the schema

All contributions must include source provenance. See the [Sources](/sources/) page for the current source registry.
