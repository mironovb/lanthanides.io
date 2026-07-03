# lanthanides.io: Strategic Materials Ledger

**An open, source-cited price reference for rare earths and strategic metals,
assembled from community-contributed observations.** Every price is tied to a
named seller, date, and quantity; every regulatory announcement is cited to its
primary source. Open data, CC BY 4.0.

🔗 **Live:** [www.lanthanides.io](https://www.lanthanides.io)

---

## What this is

One product: an **open-data reference** that anyone can read, download, cite,
and add to.

- **The dataset.** Sourced price records, provenance, and a continuously
  maintained record of the Chinese MOFCOM/GAC export-control announcements that
  govern these materials. The data lives as versioned files in git: inspectable,
  forkable, never hidden behind a database or a paywall.
- **The assembly.** Reference prices, the market dashboard, and the price gauge
  are all computed from that record pool, never from an opaque index. The
  price-gauge estimate discloses its full basis: which records, which sellers,
  what date span, what method.
- **The pipeline.** The ledger grows by review, not by scraping. A community
  contribution enters through the form on
  [/contribute/](https://www.lanthanides.io/contribute/) (a public review
  queue) or as a structured GitHub issue, passes a maintainer review and a
  pull request, and merges into the open dataset as a plain git diff. Each
  accepted observation sharpens the assembled prices.

### Who it's for

Procurement analysts, researchers, and supply-chain professionals who need to
know two things about a strategic material: **what it costs**, and **whether it
can legally move**. Commodity benchmarks sit behind expensive subscriptions;
retail prices swing by orders of magnitude with form, purity, and quantity; and
the Chinese regulatory picture, which fundamentally determines heavy-rare-earth
supply, is barely tracked in English at all.

---

## What's covered

- **31 elements** across four categories: light rare earths, heavy rare earths,
  strategic metals, and semiconductor metals.
- **Sourced price records**: each names a seller, country, date, form, purity,
  quantity, confidence score, and verification status. Nothing is fabricated or
  interpolated. Empty means "not yet collected," never "estimated."
- **The two-price model**: each element carries a **Retail Reference** (lowest
  verified in-stock offer at practical small quantities) and a **Bulk Benchmark**
  (industrial-scale commodity pricing). They are never merged or averaged.
- **The regulatory tracker**: detailed MOFCOM/GAC control regimes (legal basis,
  Chinese reference, issuing authority, affected forms, suspension state) and a
  policy timeline from the July-2023 Ga/Ge controls forward, plus the
  operational **`/framework/`** reference.
- **Market intelligence**: footnoted analysis articles and an auto-generated
  market-movements feed.

Live coverage counts are computed from the data on the
[open-data page](https://www.lanthanides.io/data/), never hard-coded here.

---

## Cite the dataset

The dataset has no DOI; cite it by its **version date** (the generation stamp
shown on [/data/](https://www.lanthanides.io/data/)) and your access date. A
plain-text citation and a BibTeX entry are generated on that page, and a
machine-readable [`CITATION.cff`](CITATION.cff) ships in this repository. For a
specific figure, cite the record id from the element's provenance table.

---

## Tech stack & architecture

- **Next.js 14 (App Router)** + **TypeScript**: file-based routes; React Server
  Components keep the dense reference tables server-rendered.
- **Tailwind CSS**: a documented design system (IBM Plex Sans / IBM Plex Mono /
  Source Serif 4, self-hosted).
- **Content tooling**: `gray-matter` (front matter), `yaml` (`_data/*.yml`),
  `react-markdown` + `remark-gfm` + `rehype-raw` (HTML-rich element/article bodies).
- **One database table.** The contributions inbox: `price_contributions` on
  Neon Postgres via `@neondatabase/serverless` (schema in
  [`db/schema.sql`](db/schema.sql)), holding community price contributions
  awaiting review and nothing else. No ORM, no migrations engine. _(The old
  Prisma layer for listings/offers/alerts/discussion was removed in 2026-07;
  see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), appendix.)_

### The data strategy (the core decision)

**Reference and provenance data lives in versioned files** (`_data/`,
`_elements/`, `_articles/`), read at build time through `lib/data/` and rendered
SSG. It is open data (CC BY 4.0). Updates, the weekly pipeline PRs and every
community contribution alike, land as **reviewed git diffs**, never as runtime
writes.

The one database table is deliberately not a second store: a
`price_contributions` row is a **review-queue entry**, never reference data. It
renders as "pending" on `/contribute/`, and an accepted observation enters the
dataset only when a maintainer merges it into `_data/` as a PR. The build never
reads the database.

Docs: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (layout, route map, data
contracts) · **[docs/MIGRATION.md](docs/MIGRATION.md)** (the Jekyll→Next
migration record and URL contract) · **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** ·
**[docs/VISUALIZATION-AUDIT.md](docs/VISUALIZATION-AUDIT.md)** ·
**[docs/QA.md](docs/QA.md)** · **[docs/SEO.md](docs/SEO.md)** ·
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

### Repository layout

```
app/          Next.js App Router routes + handlers (api/, sitemap.ts, robots.ts, feed.xml/, movements.xml/)
components/   server-first React (seo/, charts/, elements/, regulatory/, trust/, layout/, ui/, …)
lib/          data/ (typed readers over _data/), types.ts, price-gauge.ts, contributions.ts, seo.ts, format.ts
db/           schema.sql + init.mjs, the single contributions-inbox table
_data/        versioned reference + provenance (yml/json), open data, the product
_elements/    31 element bodies (.md)   ·   _articles/   analysis articles (.md)
scripts/      Python pipeline (scheduled PR updates for _data/)
public/       static assets (favicons, og image, manifest, open-data exports)
docs/         architecture, migration, audit, design system, QA, SEO, deployment
```

---

## Local development

Requires **Node 18.17+** (Next 14) and npm.

```bash
git clone https://github.com/mironovb/lanthanides.io.git
cd lanthanides.io
npm install
npm run dev                 # http://localhost:3000
```

That is the whole setup: every page renders from the versioned files. The one
optional extra is the contributions inbox. To exercise it locally, set
`DATABASE_URL` in `.env` (see `.env.example`) to a Neon database and create the
single table once:

```bash
npm run db:init             # idempotent; creates price_contributions
```

Without it, `/contribute` simply marks the queue unavailable.

| Command | What it does |
|:--|:--|
| `npm run dev` | Local dev server. |
| `npm run build` | Production build. **The gate: it must pass before every commit.** Never reads the DB. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (`next/core-web-vitals`). |
| `npm run db:init` | Create the contributions-inbox table (`db/schema.sql`), idempotent. |

---

## Open data & exports

The full price-record dataset is downloadable as JSON or CSV from
**`/api/export/json/`** and **`/api/export/csv/`** (generated from `lib/data`,
so a download can never drift from what the site renders), with CC BY 4.0
headers. The **`/data/`** landing page documents the dataset, provenance,
licence, and citation. The pre-computed `/assets/data/fluctuations.json` export
keeps its original URL.

---

## Deployment

The site deploys on **Vercel** (a few API route handlers and two
request-rendered pages need a Node server; everything else is SSG). The build
command is pinned to plain `next build` by `vercel.json`, and the only
environment variable is `DATABASE_URL` (the contributions inbox; the site
degrades gracefully without it). Full host setup, DNS cutover, and post-cutover
verification: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

The data pipeline (`scripts/`, Python) runs on scheduled GitHub Actions and
opens review PRs for data updates. It does not deploy the web app; Vercel
builds and deploys after merges to `main`.

---

## Contributing

**Contributions are the point.** The goal of this project is a reference price
that can be assembled from community-contributed, source-cited observations.
Every change must be factual, sourced, and verifiable, and lands as a
**reviewable git diff**, never an opaque edit. Submissions pass a maintainer
review and a merged pull request; nothing publishes automatically.

- **[/contribute/](https://www.lanthanides.io/contribute/)**: submit a price
  observation with the on-site form and watch the public review queue, or use
  the GitHub issue templates.
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: data formats, source standards, and
  the submission workflow.

---

## License

Dual-licensed:

- **Code** (app, components, build config): **[MIT](LICENSE)**.
- **Content & data** (articles, element descriptions, pricing data, the regulatory
  corpus): **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.

See **[LICENSE](LICENSE)** for full terms. Contact: **hello@lanthanides.io**.
