# lanthanides.io

Open-access pricing and regulatory intelligence for rare earth elements and strategic materials.

## What this is

An independent platform tracking real, source-verified prices across retail, bulk, and lab-grade tiers for 31 elements — light and heavy rare earths, strategic metals, and semiconductor metals. Includes a Chinese export control tracker covering MOFCOM/GAC announcements from 2023 to present. All data requires source provenance; nothing is fabricated or interpolated.

## Live site

[https://www.lanthanides.io](https://www.lanthanides.io)

## What's covered

**Elements** — 31 elements across four categories:

- Light rare earths (La, Ce, Pr, Nd, Sm, Y, Sc)
- Heavy rare earths (Eu, Gd, Tb, Dy, Ho, Er, Tm, Yb, Lu)
- Strategic metals (Te, V, Sb, W, Bi, Mo, Zr, Ta, Nb, Co, Li)
- Semiconductor metals (Ga, Ge, Se, In)

**Two-price system** — Each element carries a Retail Reference price (lowest verified in-stock offer at practical small quantities) and a Bulk Benchmark (industrial-scale commodity pricing, MOQ 10+ kg). These are never merged or averaged. The ratio between them quantifies processing, packaging, and dealer margin.

**Regulatory tracker** — Timeline of Chinese export control actions (MOFCOM/GAC announcements), per-element regulatory status (active, suspended, none), and detailed breakdowns of major policy events.

**Market intelligence** — Analysis articles and news dispatches covering supply chain dynamics, pricing patterns, and policy impacts.

## Tech stack

- Jekyll 4.4+ on GitHub Pages
- Python 3.9+ data pipeline (invoice parsing, offer import, price normalization, validation)
- Vanilla JavaScript (table sorting, regulatory timeline, heatmap, charts)
- Sass/SCSS stylesheets
- No frontend frameworks

## Local development

```bash
git clone https://github.com/mironovb/lanthanides.io.git
cd lanthanides.io
bundle install
bundle exec jekyll serve --livereload
```

Site runs at `http://localhost:4000`.

For the data pipeline:

```bash
cd scripts
pip install -r requirements.txt
python validate_data.py              # validate all data files
python generate_element_data.py      # rebuild per-element YAML from price records
python import_invoices.py --dry-run  # preview invoice import
```

## Contributing

Contributions welcome — price updates, data corrections, and market notes. See [CONTRIBUTING.md](CONTRIBUTING.md) for data format requirements, source standards, and submission workflow. Issues use structured templates for each contribution type.

## Data methodology

The methodology page documents how prices are collected, normalized to USD/kg, verified, and displayed — including source trust tiers, confidence scoring, verification statuses, and the rationale for the two-reference-price approach over averages. See [lanthanides.io/methodology](https://www.lanthanides.io/methodology/).

## License

Dual-licensed: [MIT](LICENSE) for code (templates, layouts, stylesheets, JavaScript, build configuration) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) for content and data (articles, element descriptions, pricing data, news entries). See [LICENSE](LICENSE) for full terms.
