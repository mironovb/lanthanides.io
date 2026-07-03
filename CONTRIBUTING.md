# Contributing to lanthanides.io

lanthanides.io accepts sourced pricing data, data corrections, and market notes
for rare earths and strategic metals. Contributions are the point of the
project: every reference price on the site is assembled from the pool of
source-cited observations this pipeline feeds. The rule is simple: every
factual claim must be traceable to a source another person can inspect.

The public dataset is versioned in git. Community submissions never publish
directly to the site. They pass through a structured GitHub issue, a maintainer
approval label, a generated pull request, and a second review at merge.

## The Contribution Paths

### 1. Submit a Price Observation

The quickest path is the form on
[lanthanides.io/contribute](https://www.lanthanides.io/contribute/): it
validates the observation, queues it in a public review inbox, and shows it in
the queue table immediately. Prefer GitHub? Use the
[Price Update](https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml)
issue template instead. Both paths end in the same maintainer review.

A usable price observation includes:

- Element
- Price, currency, and unit, for example `60 USD/kg`
- Material form, purity, and quantity or MOQ
- Market tier: retail, bulk, or lab-grade
- Source name or URL
- Date observed in `YYYY-MM-DD` format

After review, a maintainer applies the `approved` label and runs the manual
`Community Submission Intake` workflow. That workflow writes one observation to
`_data/price_history/<symbol>.yml`, refreshes derived data files, and opens a
pull request. Vercel owns site builds and deployments after the pull request is
merged. The observation is published only if that pull request is merged.

### 2. Report a Correction

Use the [Data Correction](https://github.com/mironovb/lanthanides.io/issues/new?template=data-correction.yml)
template when a rendered value, source attribution, regulatory status, or element
description appears wrong.

Include:

- What the site currently shows
- What it should show
- The source supporting the correction
- The affected page or element, if applicable

Corrections usually become a normal maintainer pull request, because they may
touch `_data/`, `_elements/`, `_articles/`, or page copy.

### 3. Share a Market Note

Use the [Market Note](https://github.com/mironovb/lanthanides.io/issues/new?template=market-note.yml)
template for a sourced supply-chain, pricing, or regulatory development.

Market notes can become a short item in `_data/news.yml` or a longer article in
`_articles/`. They still need dated sources. Analysis is welcome when it is
clearly labelled as analysis and not entered as price data.

## Source Standards

Acceptable sources should be:

- Identifiable: the seller, publisher, agency, or reporting organization is named.
- Dated: the observation has a real quote or publication date.
- Specific: the material form, purity, quantity, and terms are clear enough to compare.
- Verifiable: a reviewer can open the link, contact the seller, or inspect the citation.

Do not submit:

- Forecasts, projections, or model outputs as observed prices.
- Anonymous posts with no supporting evidence.
- Aggregator summaries that do not identify the underlying source.
- Private contact details that should not appear in a public git diff.
- Guessed fields. If a value is missing, say it is missing.

## Data Boundaries

Reference data lives in versioned files:

- `_data/price_history/*.yml` stores observed price history.
- `_data/price_records.json` stores the selected reference-price record set.
- `_data/regulatory/` stores export-control notices and policy events.
- `_elements/` and `_articles/` store editorial markdown.

One database table exists: `price_contributions` (`db/schema.sql`), the inbox
behind the /contribute form. A row there is a review-queue entry, never
published data; it enters the dataset only when a maintainer merges it into
`_data/` as a reviewed git diff. Do not add further tables or write paths.

## Maintainer Intake Runbook

For a form submission (an inbox row on
[/contribute](https://www.lanthanides.io/contribute/)):

1. Read the pending row and inspect the source, exactly as for an issue.
2. If usable, add the observation to `_data/price_history/<symbol>.yml`,
   refresh the derived files (the script block below), and open a PR.
3. After the PR merges, mark the row directly in SQL:
   `UPDATE price_contributions SET status = 'merged' WHERE id = ...;`
   (or `'rejected'`). The app never changes a row's status itself.

For a community price issue:

1. Read the issue and inspect the source.
2. Confirm the element, form, purity, quantity, tier, price, unit, and date are present.
3. Apply the `approved` label only if the submission is usable.
4. Run a dry run:

   ```bash
   gh workflow run community-intake.yml -f issue_number=123 -f dry_run=true
   ```

5. If the dry run passes, run the real intake:

   ```bash
   gh workflow run community-intake.yml -f issue_number=123 -f dry_run=false
   ```

6. Review the generated pull request. Confirm the diff matches the issue and that
   no private contact information appears.
7. Merge only after checks pass.

The workflow intentionally has no `issues:` trigger. A submitted issue cannot
write data by itself.

## Local Development

Requires Node 18.17 or newer and npm (plus Python 3 for the data scripts).

```bash
git clone https://github.com/mironovb/lanthanides.io.git
cd lanthanides.io
npm install

npm run lint
npm run build
npm run dev
```

The contributions inbox is optional: set `DATABASE_URL` in `.env` (see
`.env.example`) and run `npm run db:init` once if you want to exercise the
/contribute form locally. Without it the site runs fully; the queue just
reports itself unavailable.

## Pull Request Checklist

Before opening a pull request:

- Run `npm run lint`.
- Run `npm run build`.
- Keep sourced data and editorial claims tied to citations.
- Do not commit credentials, private contact details, or real `.env` files.
- Do not fabricate missing values to complete a record.

If your change edits price history or derived data, refresh the generated files:

```bash
python scripts/source_breakdown.py
python scripts/fluctuations.py --verbose
python scripts/detect_movements.py --verbose
```

## Questions

Open an issue or email `hello@lanthanides.io`.
