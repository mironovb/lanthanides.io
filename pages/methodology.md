---
layout: page
title: "Methodology"
description: "How price data is collected, normalized, verified, and displayed."
permalink: /methodology/
---

## Purpose

Strategic Materials Ledger tracks real-world prices for rare earth elements and strategic materials. It is designed for procurement analysis, supply-risk monitoring, and market intelligence — not for casual browsing or speculative trading.

All displayed prices require source provenance. No data is fabricated, interpolated, or synthetically generated.

---

## Display Price Calculation {#display-price}

The headline price shown on each element tile is an **estimated typical retail acquisition cost** — the price a knowledgeable retail buyer would likely pay for a practical quantity (roughly 10–100 g) of the element. The estimator is designed to be robust to outliers and to prefer the most directly comparable data.

### Algorithm overview

The display price is computed through a four-step pipeline:

**Step 1 — Form preference.** For each element, retail price records are partitioned by material form. If two or more **metal** records are available, only metal records are used. Otherwise, all retail records (oxide, metal, powder, compound) are pooled. This ensures the displayed price reflects the elemental metal wherever sufficient data exists, and falls back to the most commonly traded form when it does not.

**Step 2 — Sort and count.** The selected records are sorted by normalised price (USD/kg, ascending). Let *n* denote the number of records in the working set.

**Step 3 — Interquartile trimming.** Extreme prices — both high (laboratory small-quantity markups, investment-platform premiums) and low (stale quotes, loss-leader offers) — are excluded:

- If *n* ≥ 5: set *k* = ⌊*n*/4⌋. Discard the *k* lowest-priced and *k* highest-priced records. The remaining *n* − 2*k* records form the **interquartile core**.
- If *n* = 3 or 4: discard only the single highest-priced record (one-sided trim).
- If *n* ≤ 2: no trimming; use all records.

**Step 4 — Confidence-weighted mean.** The display price is the weighted average of the surviving records:

*P* = Σ(*p*<sub>*i*</sub> · *c*<sub>*i*</sub>) / Σ(*c*<sub>*i*</sub>)

where *p*<sub>*i*</sub> is the normalised price (USD/kg) and *c*<sub>*i*</sub> is the confidence score (0.0–1.0) of the *i*-th record. Higher-confidence records — those backed by verified invoices or corroborated across multiple sources — exert proportionally greater influence on the estimate.

### Why this approach

| Method | Failure mode |
|--------|-------------|
| Latest price only | A single outlier (lab markup, stale quote) dominates |
| Simple arithmetic mean | Treats a $40,600/kg lab-quantity purchase equally to a $4,680/kg standard retail offer |
| Unweighted median | Discards magnitude and confidence information; insensitive to genuine price shifts |
| Confidence-weighted mean (no trim) | Outliers still distort the estimate, especially with small *n* |
| **Trimmed confidence-weighted mean** | **Removes extreme tails; weights remaining records by data quality** |

The interquartile trim is a standard robust estimation technique (see Wilcox, *Introduction to Robust Estimation and Hypothesis Testing*, 4th ed., Academic Press, 2022). It converges to the population mean for symmetric distributions while bounding the influence of any single observation.

### Worked example: Terbium (Tb)

Terbium has five retail metal records. Sorted by price:

| Record | $/kg | Confidence | Note |
|--------|------|------------|------|
| R-0108 | $4,029 | 0.50 | Investment platform |
| R-0101 | $4,680 | 0.80 | PEGUYS 10 g — lowest $/g |
| R-0104 | $7,800 | 0.70 | PEGUYS 2 g |
| R-0102 | $13,800 | 0.75 | Smart-Elements 10 g ampoule |
| R-0103 | $22,150 | 0.70 | RWMM bullion ingot |

With *n* = 5 and *k* = ⌊5/4⌋ = 1, the bottom record ($4,029) and top record ($22,150) are trimmed. The surviving core {$4,680, $7,800, $13,800} yields:

*P* = (4,680 × 80 + 7,800 × 70 + 13,800 × 75) / (80 + 70 + 75) = 1,955,400 / 225 ≈ **$8,691/kg**

This is approximately $8.69/g — consistent with the middle of the retail range and representative of what a buyer would actually pay for a 10–100 g purchase.

Without trimming, the confidence-weighted mean across all eight retail records (including three oxide records priced at $5,970–$40,600/kg for small laboratory quantities) would have been ~$13,847/kg — misleadingly high because of the Chemsavers 5 g oxide listing at $40,600/kg equivalent.

---

## Oxide-to-Metal Price Conversion {#oxide-to-metal}

Most rare earths are primarily traded in oxide form. When no retail metal records are available, the display price reflects oxide pricing directly. For reference, the theoretical relationship between oxide and metal prices is:

### Stoichiometric mass fraction

For a rare earth oxide RE<sub>*x*</sub>O<sub>*y*</sub>, the mass fraction of the metal is:

*f*<sub>RE</sub> = (*x* · *A*<sub>RE</sub>) / (*x* · *A*<sub>RE</sub> + *y* · *A*<sub>O</sub>)

where *A*<sub>RE</sub> is the atomic mass of the rare earth and *A*<sub>O</sub> = 15.999 u.

### Common rare earth oxides

| Oxide | Formula | Metal fraction | Metal from 1 kg oxide |
|-------|---------|---------------|----------------------|
| Scandium oxide | Sc₂O₃ | 0.652 | 652 g |
| Lanthanum oxide | La₂O₃ | 0.853 | 853 g |
| Cerium oxide | CeO₂ | 0.814 | 814 g |
| Neodymium oxide | Nd₂O₃ | 0.857 | 857 g |
| Terbium oxide | Tb₄O₇ | 0.850 | 850 g |
| Dysprosium oxide | Dy₂O₃ | 0.871 | 871 g |

### Metal price estimate from oxide

The raw metal content of an oxide is:

*P*<sub>metal,raw</sub> = *P*<sub>oxide</sub> / *f*<sub>RE</sub>

However, reducing an oxide to metal requires energy-intensive processing (typically calcium or lithium reduction under vacuum or inert atmosphere for rare earths). This adds a **processing premium** that varies by element, purity, and market conditions:

*P*<sub>metal,est</sub> = (*P*<sub>oxide</sub> / *f*<sub>RE</sub>) × *m*

where *m* is the metal-over-oxide multiple, typically 1.5–3.0× for rare earths. For example, with Chinese domestic Tb₄O₇ at ~$804/kg:

*P*<sub>Tb metal,est</sub> = ($804 / 0.850) × 2.0 ≈ **$1,891/kg**

This aligns well with observed wholesale metal quotes from Chinese direct sellers (~$2,090/kg), validating the conversion factor. The retail premium above wholesale further widens the gap, as retail metal prices in the West range from ~$4,680 to $22,150/kg depending on quantity and supplier.

**Note:** This conversion is presented for analytical reference. The display prices on the main page are computed directly from available price records and do not apply stoichiometric conversion. Future versions may incorporate automatic oxide-to-metal back-calculation for elements lacking metal retail data.

---

## Price Tiers

### Retail
Small-quantity purchases typically available to individual buyers, laboratories, or small businesses. Often sold by online retailers, specialty chemical suppliers, or small distributors. Quantities are usually under 25 kg.

### Bulk / Industrial / Distributor
Larger-quantity purchases through industrial distributors, manufacturers, or commodity brokers. Minimum order quantities (MOQ) typically start at 25 kg or higher. These prices often require direct quotation and may include negotiated terms.

**Retail and bulk prices are never merged or averaged.** They represent different market segments with different cost structures. The display price on the main page uses retail records exclusively.

---

## Normalization

All prices are normalized to **USD per kilogram** for comparability. The normalization process:

1. **Currency conversion**: Original prices in non-USD currencies are converted using the exchange rate recorded at the time of the quote or ingestion. The rate and its date are stored with each record.

2. **Unit conversion**: Prices quoted per gram, per pound, per ounce, or per ton are converted to per-kilogram using standard conversion factors.

3. **Original preservation**: The original quoted price, currency, and unit are always preserved in the record. The normalized value is a derived field.

**Normalization never changes the underlying quote.** It is a display convenience. Always check the original values in the provenance table for precision.

---

## Material Forms and Purity

Prices for different material forms are tracked separately:

- **Oxide** (e.g., Nd₂O₃, Tb₄O₇) — often the most commonly traded form
- **Metal** (e.g., Nd metal) — typically more expensive than oxide due to reduction processing
- **Powder** — may vary by particle size and specifications
- **Alloy** — composition-dependent pricing
- **Compound** — specific chemical compounds
- **Carbide**, **Magnet**, and others as applicable

Different purities (99%, 99.5%, 99.9%, 99.99%) are tracked separately. The display price on the main page averages across available purities within the selected form, weighted by confidence. The footer notes that displayed prices reflect prevailing purities, generally in the 99–99.99% range for rare earths.

---

## Verification Statuses

Each price record carries a verification status:

| Status | Meaning |
|--------|---------|
| **Verified Invoice** | Extracted from an uploaded invoice with parseable quantity, date, and price. Highest confidence. |
| **Corroborated** | At least 2 recent independent public offers are broadly aligned on price range. |
| **Single-Source Offer** | One recent public offer only. Lower confidence — no independent confirmation. |
| **Benchmark-Linked** | Supported by a recognized benchmark or industry index entry. |
| **Stale** | Data older than the configured freshness threshold (default: 90 days). May still be directionally useful but should not be treated as current. |
| **Archived** | Hidden from current views. Retained for historical analysis only. |

---

## Confidence Scoring

Each record has a confidence score from 0.0 to 1.0:

| Range | Interpretation |
|-------|---------------|
| **0.8 – 1.0** | High confidence. Invoice-backed or well-corroborated. |
| **0.5 – 0.79** | Medium confidence. Plausible but limited corroboration. |
| **0.0 – 0.49** | Low confidence. Single source, unclear provenance, or partially parsed. |

Confidence is assigned during ingestion based on:
- Source type (invoices score higher than marketplace scrapes)
- Parse quality (fully structured data scores higher than OCR-extracted data)
- Corroboration (multiple aligned sources increase confidence)
- Recency (older data may be downgraded)

The confidence score directly affects the display price: a record with *c* = 0.8 exerts twice the weight of a record with *c* = 0.4.

---

## Source Trust Tiers

Sources are ranked from highest to lowest trust:

1. **Uploaded invoices** — direct transactional evidence
2. **Direct distributor/manufacturer offers** — explicit quantity, date, and price
3. **Manually reviewed public offers** — curator-verified marketplace listings
4. **Benchmark references** — industry indices and published benchmarks
5. **News/context only** — editorial quotes and analyst commentary (not used as primary price sources)

**News articles are context sources, not primary price sources.** A journalist's paraphrase of a market condition is not the same as a quoted price with quantity and date.

---

## Data Freshness

- **Fresh**: Last quoted within the freshness threshold (default: 90 days)
- **Stale**: Older than the freshness threshold but within the stale threshold (default: 180 days)
- **Archived**: Older than the stale threshold or manually archived

Stale data is flagged visually. It may still be useful for trend analysis but should not be cited as a current market price.

---

## Heatmap Interpretation

The price dislocation heatmap is an **analytical proxy**. It shows:

- **Inflation score** = Current median price / Baseline median price
- **Premium** = Percentage above (or below) the baseline

This is a simplified indicator. It does **not** prove that any single factor (policy change, supply disruption, demand shift) is solely responsible for a price movement. Multiple variables interact.

Available baselines:
- Rolling 30-day median
- Rolling 180-day median
- All-time data median
- Pre-policy baseline (manually configured)

---

## Minimum Order Quantity (MOQ)

MOQ is prominently displayed because it fundamentally affects price. A 1 kg retail quote is not comparable to a 500 kg industrial quote, even for the same material and purity.

---

## Why Some Pages Show Sparse Data

This ledger tracks only verified data with clear provenance. For many elements:
- Public pricing is opaque
- Markets are illiquid
- Prices are negotiated privately
- Available data may be from a single source

Sparse data is better than fabricated data. Empty fields mean "we don't have this information yet," not "this information doesn't exist."

---

## How to Contribute Data

1. **Upload invoices**: Place PDF, CSV, or XLSX files in the `invoices/` directory and run the import script
2. **Add curated offers**: Register a source in `_data/source_registry.yml` and run the offer import script
3. **Manual entry**: Add records directly to `_data/price_records.json` following the schema

All contributions should include source provenance. See the [Sources](/sources/) page for the current source registry.
