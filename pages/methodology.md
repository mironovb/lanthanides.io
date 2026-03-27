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

## Price Tiers

### Retail
Small-quantity purchases typically available to individual buyers, laboratories, or small businesses. Often sold by online retailers, specialty chemical suppliers, or small distributors. Quantities are usually under 25 kg.

### Bulk / Industrial / Distributor
Larger-quantity purchases through industrial distributors, manufacturers, or commodity brokers. Minimum order quantities (MOQ) typically start at 25 kg or higher. These prices often require direct quotation and may include negotiated terms.

**Retail and bulk prices are never merged or averaged.** They represent different market segments with different cost structures.

---

## Display Price Calculation {#display-price-calculation}

The headline price shown on the main grid for each element is a **confidence-weighted mean (CWM)** computed across all retail-tier price records:

$$
P_{\text{CWM}} = \frac{\sum_{i=1}^{n} p_i \cdot c_i}{\sum_{i=1}^{n} c_i}
$$

Where:
- *p<sub>i</sub>* is the normalised price (USD/kg) of the *i*-th retail record
- *c<sub>i</sub>* is the confidence score (0.0–1.0) assigned to that record
- *n* is the total number of retail records for the element

**Why CWM, not a simple average or latest price?**

| Approach | Problem |
|----------|---------|
| Latest price only | A single outlier quote (high or low) misleads; ignores all other data |
| Simple mean | Treats a low-confidence scrape equally to a verified invoice |
| Median | Discards magnitude information; less responsive to genuine shifts |
| **CWM** | **Higher-confidence records pull the average toward the most reliable signal** |

The CWM is labelled on each tile (e.g., "CWM · 3 offers"). It includes all retail records regardless of material form or purity — these are **not** merged with bulk/wholesale records, which remain separate.

For elements with only one retail record, the CWM equals the single available price. As more records are added, the estimate becomes more robust.

Bulk and wholesale prices are displayed separately on individual element pages and are never blended into the CWM.

---

## Normalization

All prices are normalized to **USD per kilogram** for comparability. The normalization process:

1. **Currency conversion**: Original prices in non-USD currencies are converted using the exchange rate recorded at the time of the quote or ingestion. The rate and its date are stored with each record.

2. **Unit conversion**: Prices quoted per gram, per pound, per ounce, or per ton are converted to per-kilogram using standard conversion factors.

3. **Original preservation**: The original quoted price, currency, and unit are always preserved in the record. The normalized value is a derived field.

**Normalization never changes the underlying quote.** It is a display convenience. Always check the original values in the provenance table for precision.

---

## Material Forms and Purity

Prices for different material forms are **never merged**:

- **Oxide** (e.g., Nd₂O₃) — often the most commonly traded form
- **Metal** (e.g., Nd metal) — typically more expensive than oxide
- **Powder** — may vary by particle size and specifications
- **Alloy** — composition-dependent pricing
- **Compound** — specific chemical compounds
- **Carbide**, **Magnet**, and others as applicable

Similarly, different purities (99%, 99.5%, 99.9%, 99.99%) are tracked separately. A 99.9% oxide price is not comparable to a 99.99% metal price.

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
