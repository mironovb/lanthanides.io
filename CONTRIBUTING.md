# Contributing to lanthanides.io

lanthanides.io is an open-access rare earth and strategic materials pricing platform.
Contributions of price data, corrections, and market intelligence are welcome from
anyone who can provide sourced, verifiable information.

## Ways to Contribute

### Submit a Price Update

If you have a current price observation for any tracked element:

1. **Open an issue** using the [Price Update](https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml) template
2. **Or submit a PR** editing the relevant file in `_data/elements/` and adding a record to `_data/price_records.json`

A price update must include: element symbol, price, currency, unit, quantity, form,
purity, source (seller name or URL), and the date you observed the price.

### Report a Data Error

If you spot incorrect data on the site:

1. **Open an issue** using the [Data Correction](https://github.com/mironovb/lanthanides.io/issues/new?template=data-correction.yml) template
2. Include what's wrong, what it should be, and a source supporting the correction

### Submit a Market Note

If you have market intelligence, supply chain news, or regulatory developments:

1. **Open an issue** using the [Market Note](https://github.com/mironovb/lanthanides.io/issues/new?template=market-note.yml) template
2. Or submit a PR adding an article to `_articles/`

## Data Format

### Element YAML files (`_data/elements/`)

Each element has a YAML file keyed by symbol (e.g., `Nd.yml`):

```yaml
symbol: Nd
name: Neodymium
atomic_number: 60
category: rare_earth_light   # rare_earth_light | rare_earth_heavy | strategic_metal | semiconductor

retail_reference:
  price_per_kg: 600
  source: "Description of source(s)"
  date: 2026-04-04            # YYYY-MM-DD, the date the price was observed
  form: "metal, oxide"
  quantity_basis: "1 kg MOQ, retail"

bulk_benchmark:
  price_per_kg: 80
  source: "Description of source(s)"
  date: 2026-04-04
  terms: FOB                   # FOB, EXW, CIF, CIP, etc.

retail_premium_ratio: 7.5      # retail / bulk

regulatory_status:
  status_code: none            # none | active
  active_notices: []
  last_updated: null

applications_summary: "Brief description of primary uses."
supply_chain_notes: "Brief description of supply landscape."
```

### Price records (`_data/price_records.json`)

Individual price observations follow this schema:

```json
{
  "id": "R-0001",
  "element_symbol": "Nd",
  "original_price_per_unit": 60,
  "original_currency": "USD",
  "normalized_usd_per_kg": 600,
  "form": "metal",
  "purity": "99.9% (3N)",
  "market_tier": "retail",
  "moq_kg": 1,
  "source_type": "distributor_offer",
  "source_id": "source-registry-key",
  "seller_name": "Example Materials Co.",
  "verification_status": "single_source_offer",
  "confidence_score": 0.6,
  "quote_date": "2026-04-04"
}
```

**Market tier** values: `retail`, `bulk`, `lab-grade`

**Verification status** values: `verified_invoice`, `corroborated`, `single_source_offer`, `benchmark_linked`, `stale`, `archived`

**Confidence score**: 0.0-1.0. See [Methodology](/methodology/) for scoring criteria.

## Source Requirements

Acceptable sources must meet these general criteria:

- **Identifiable origin**: the seller, publisher, or reporting agency can be identified
- **Dated**: the price observation has a specific date, not just "current"
- **Specific**: the price is for a defined form, purity, and quantity
- **Verifiable**: another person could, in principle, confirm the price by contacting the same source

Sources that are **not** acceptable:

- Aggregator sites that republish prices without attribution
- Undated or vaguely dated observations ("sometime in 2025")
- Prices without a named seller or publisher
- Estimates, projections, or model outputs presented as market prices
- Anonymous forum posts or social media claims without supporting evidence

If you are unsure whether your source qualifies, submit it anyway and note your uncertainty.
We will review and make a determination.

## Code of Conduct

All contributions must be:

- **Factual**: based on observable, verifiable data
- **Sourced**: every price claim must cite where it came from
- **Non-speculative**: do not submit price forecasts, predictions, or opinions as data
- **Good faith**: do not submit data you know to be false or misleading

This project tracks what things cost, not what someone thinks they should cost.
Speculation and market commentary are welcome in market notes if clearly labelled as
analysis, but must never be entered as price data.

## Local Development

### Prerequisites

- **Ruby** (>= 2.7) and **Bundler**
- **Python 3** (>= 3.8) with pip
- **Git**

### macOS Setup

```bash
# Install Ruby (if not using system Ruby)
brew install ruby
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install Bundler
gem install bundler

# Install Python 3 (if needed)
brew install python3
```

### Linux Setup (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install ruby-full build-essential zlib1g-dev python3 python3-pip
gem install bundler
```

### Running the Site

```bash
# Clone the repository
git clone https://github.com/mironovb/lanthanides.io.git
cd lanthanides.io

# Install Ruby dependencies
bundle install

# Serve locally with live reload
bundle exec jekyll serve --livereload
# Site is now at http://localhost:4000

# Or build without serving
bundle exec jekyll build
```

### Running the Data Pipeline

```bash
# Install Python dependencies
pip3 install -r scripts/requirements.txt

# Generate element data files from price records
python3 scripts/generate_element_data.py

# Import price offers from registered sources
python3 scripts/import_offers.py

# Validate data integrity
python3 scripts/validate_data.py

# Or run everything
bash run-all.sh
```

### Adding a Price Record Manually

1. Add the record to `_data/price_records.json` following the schema above
2. Run `python3 scripts/generate_element_data.py` to update element YAML files
3. Run `bundle exec jekyll serve` and verify the element page looks correct
4. Submit a PR

## Submitting a Pull Request

1. Fork the repository and create a branch
2. Make your changes
3. Test locally (`bundle exec jekyll serve`)
4. Run data validation (`python3 scripts/validate_data.py`)
5. Push and open a PR using the pull request template

See the [Methodology](/methodology/) page for details on how prices are selected,
normalised, and verified.

## Questions?

Open an issue or email **bogdan@lanthanides.io**.
