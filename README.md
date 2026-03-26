# Strategic Materials Ledger

Real-world price tracking and provenance auditing for rare earth elements and strategic materials. Built as a static Jekyll site deployable to GitHub Pages.

**All displayed prices require source provenance. No data is fabricated.**

---

## Quick Start

### Prerequisites

- Ruby 3.3+ with Bundler
- Python 3.9+ (for ingestion scripts)

### Local Setup

```bash
# Install Jekyll and dependencies
bundle install

# Serve locally (with live reload)
bundle exec jekyll serve --livereload

# Build for production
bundle exec jekyll build
```

The site will be available at `http://localhost:4000`.

---

## Project Structure

```
periodicprices/
├── _config.yml              # Jekyll configuration
├── Gemfile                  # Ruby dependencies
├── index.html               # Homepage dashboard
├── search.json              # Build-time search index
│
├── _data/
│   ├── element_catalog.yml  # Master element metadata
│   ├── price_records.json   # All normalized price records (starts empty)
│   ├── policy_events.yml    # Export controls, policy shocks
│   ├── source_registry.yml  # Curated data sources
│   ├── alternative_supply.yml # Alternative sourcing data
│   ├── site_settings.yml    # Configurable thresholds
│   └── demo/                # Demo data (never shown in production)
│
├── _elements/               # One .md file per tracked element
├── _layouts/                # Page layouts
├── _includes/               # Reusable components
├── _sass/                   # Sass stylesheets
├── assets/
│   ├── css/main.scss        # Master stylesheet
│   └── js/                  # Client-side JavaScript
│
├── pages/                   # Static pages (index, heatmap, methodology, sources)
├── scripts/                 # Python ingestion and validation tools
└── invoices/                # Upload invoice files here
```

---

## Adding a New Element

1. Add an entry to `_data/element_catalog.yml`:

```yaml
- symbol: La
  name: Lanthanum
  atomic_number: 57
  category: rare_earth_light
  family: Lanthanide
  default_forms:
    - oxide
    - metal
  export_control_status: monitored
  dominant_source_country: CN
  notes: "Used in catalysts, optics, and battery alloys."
```

2. Create `_elements/La.md`:

```yaml
---
layout: element-detail
symbol: La
name: Lanthanum
atomic_number: 57
category: rare_earth_light
title: "Lanthanum (La) — Strategic Materials Ledger"
description: "Price tracking, provenance, and supply intelligence for Lanthanum (La)."
permalink: /elements/La/
---
```

3. Rebuild the site. The element will appear on the dashboard, index, and heatmap automatically.

---

## Ingesting Price Data

### From Invoices

1. Place invoice files (PDF, CSV, XLSX) in the `invoices/` directory.
2. Run the import script:

```bash
cd scripts
pip install -r requirements.txt
python import_invoices.py
```

For a dry run (preview without writing):

```bash
python import_invoices.py --dry-run
```

### From Curated Online Offers

1. Register a source in `_data/source_registry.yml`:

```yaml
- id: example-supplier
  name: "Example Rare Earth Supplier"
  type: distributor
  trust_tier: 2
  url: "https://example.com/prices"
  country: CN
  ingestion_method: manual
  supported_elements: ["Nd", "Pr", "Dy"]
  last_fetch: null
  parse_status: pending_review
  review_status: pending
  notes: "Direct distributor with public price lists"
```

2. Run the offer import:

```bash
python import_offers.py --source-id example-supplier
```

### Manual Entry

Add records directly to `_data/price_records.json`. Each record must follow the full schema:

```json
{
  "id": "manual-001",
  "element_symbol": "Nd",
  "element_name": "Neodymium",
  "form": "oxide",
  "purity": "99.5%",
  "market_tier": "retail",
  "moq_kg": 1,
  "quoted_quantity_kg": 5,
  "original_currency": "USD",
  "original_unit": "kg",
  "original_price_per_unit": 95.00,
  "normalized_usd_per_kg": 95.00,
  "exchange_rate_used": 1.0,
  "exchange_rate_date": "2026-03-25",
  "incoterm": null,
  "taxes_included": "unknown",
  "shipping_included": "unknown",
  "seller_name": "Supplier Name",
  "seller_country": "CN",
  "buyer_country": null,
  "source_type": "distributor_offer",
  "source_id": "src-001",
  "source_url": "https://example.com",
  "invoice_ref": null,
  "quote_date": "2026-03-25",
  "ingestion_timestamp": "2026-03-25T10:00:00Z",
  "verification_status": "single_source_offer",
  "confidence_score": 0.6,
  "notes": "Manually entered from public listing"
}
```

---

## Validating Data

Run the validation script to check all data files:

```bash
python scripts/validate_data.py
```

Use `--strict` to treat warnings as errors (useful in CI):

```bash
python scripts/validate_data.py --strict
```

---

## Normalizing Prices

After adding records with non-USD currencies or non-kg units:

```bash
python scripts/normalize_prices.py
```

---

## Creating Snapshots

Save a dated snapshot of the current price data:

```bash
python scripts/build_snapshots.py
```

Snapshots are saved to `_data/snapshots/YYYY-MM-DD.json`.

---

## Verification Statuses

| Status | Meaning |
|--------|---------|
| Verified Invoice | Extracted from uploaded invoice |
| Corroborated | 2+ independent sources broadly aligned |
| Single-Source Offer | One public offer only |
| Benchmark-Linked | Supported by benchmark/index |
| Stale | Older than freshness threshold |
| Archived | Hidden from current views |

---

## Source Trust Tiers

| Tier | Source Type |
|------|-----------|
| 1 | Uploaded invoices |
| 2 | Direct distributor/manufacturer offers |
| 3 | Manually reviewed public offers |
| 4 | Benchmark references |
| 5 | News/context only (not a price source) |

---

## Configuration

Key settings in `_data/site_settings.yml`:

- `freshness_threshold_days`: Days before data is flagged as potentially stale (default: 90)
- `stale_threshold_days`: Days before data moves to stale status (default: 180)
- `high_confidence_minimum`: Confidence score threshold for "high" label (default: 0.8)
- `medium_confidence_minimum`: Confidence score threshold for "medium" label (default: 0.5)

---

## Deployment

### GitHub Pages

Push to a GitHub repository and enable GitHub Pages in repository settings. The site uses only GitHub Pages-compatible gems.

### Other Static Hosts

Build with `bundle exec jekyll build` and deploy the `_site/` directory to any static host (Netlify, Vercel, Cloudflare Pages, S3, etc.).

---

## Design Principles

- **No fabricated data**: Every displayed price must have source provenance
- **Retail and bulk are distinct**: Never merged or averaged
- **Form and purity matter**: Oxide ≠ metal ≠ powder; 99% ≠ 99.99%
- **Recency is visible**: Every price shows its quote date and last-updated timestamp
- **Sparse is better than fake**: Empty states are preferable to invented numbers
- **News ≠ price source**: Journalistic quotes provide context, not primary pricing

---

## License

[Add your license here]
