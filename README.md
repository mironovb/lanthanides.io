# lanthanides.io: Strategic Materials Ledger

**Source-transparent pricing and Chinese export-control intelligence for rare
earths and strategic metals.** Every price is tied to a named seller, date, and
quantity; every regulatory announcement is cited to its primary source. Open
data, CC BY 4.0.

🔗 **Live:** [www.lanthanides.io](https://www.lanthanides.io)

---

## What this is

Two products share one surface:

1. **An open-data reference**: sourced prices, provenance, and a continuously
   maintained record of the Chinese MOFCOM/GAC export-control announcements that
   govern these materials. This data *is* the product: it stays versioned in git,
   inspectable and forkable, never hidden behind a database or a paywall.
2. **A thin commercial layer built on that reference**: a price gauge, seller
   listings, a screened-offer feed, and a regulatory-alert channel. These are the
   early surfaces of a two-sided marketplace; each is candid about what is live
   today versus what is still a stub (see [Live vs. stubbed](#live-vs-stubbed)).

### Who it's for

Procurement officers, supply-chain analysts, researchers, and investors who need
to know two things about a strategic material: **what it costs**, and **whether
it can legally move**. Commodity benchmarks sit behind expensive subscriptions;
retail prices swing by orders of magnitude with form, purity, and quantity; and
the Chinese regulatory picture, which fundamentally determines heavy-rare-earth
supply, is barely tracked in English at all.

### Why now

Rare earths and a handful of strategic metals sit on the fault line of US–China
decoupling. They are indispensable to magnets, semiconductors, and defense systems, with
highly concentrated supply. Since gallium and germanium in July 2023, China's
MOFCOM has issued **11 successive export-control announcements**, now reaching
**22 of the 31 elements tracked here**. Some are suspended into late 2026, the rest
gated behind case-by-case export licences. A single notice can reprice or halt a
supply line overnight.

### The defensible asset

The moat is the **dataset and the tracker**, not any one feature. The
export-control tracker is the only continuously maintained, source-cited,
English-language record of these announcements we are aware of. The price dataset
is **provenance-first**. Every figure is inspectable in git rather than asserted
behind a paywall. A marketplace built on a credible, auditable reference is hard
to copy without first rebuilding the reference, and the reference is already live.

> A complete click-through for reviewers and investors lives in
> **[docs/INVESTOR-WALKTHROUGH.md](docs/INVESTOR-WALKTHROUGH.md)**.

---

## What's covered

- **31 elements** across four categories: light rare earths (La, Ce, Pr, Nd, Sm,
  Y, Sc), heavy rare earths (Eu, Gd, Tb, Dy, Ho, Er, Tm, Yb, Lu), strategic
  metals (Te, V, Sb, W, Bi, Mo, Zr, Ta, Nb, Co, Li), and semiconductor metals
  (Ga, Ge, Se, In).
- **238 sourced price records**: each names a seller, country, date, form,
  purity, quantity, confidence score, and verification status. 27 carry an
  independently *verified* status; the rest are single-source offers and
  benchmarks, every one carrying its provenance. Nothing is fabricated or
  interpolated. Empty means "not yet collected," never "estimated."
- **The two-price model**: each element carries a **Retail Reference** (lowest
  verified in-stock offer at practical small quantities) and a **Bulk Benchmark**
  (industrial-scale commodity pricing). They are never merged or averaged; the
  ratio between them quantifies processing, packaging, and dealer margin.
- **The regulatory tracker**: 5 detailed control regimes (MOFCOM/GAC, each with
  legal basis, Chinese reference, issuing authority, affected forms, and
  suspension state) and an 11-event policy timeline from the July-2023 Ga/Ge
  controls forward, plus the operational **`/framework/`** reference (regulatory
  tiering, the post-IEEPA US tariff stack, a realised-price model, and a 2026
  decision-trigger calendar).
- **Market intelligence**: 5 footnoted analysis articles and an auto-generated
  market-movements feed.

---

## Live vs. stubbed

Honesty is a feature here. The reference layer is fully live; the commercial
layer is early and labelled stub-by-stub.

| Surface | Status | Notes |
|:--|:--|:--|
| Reference data, element pages, regulatory tracker, `/framework`, dashboard, open-data exports | **Live** | Statically generated from versioned files; the whole open dataset. |
| **Telegram regulatory alerts** | **Live** | The six-hourly monitor (`scripts/`) polls Chinese-government sources and fires Telegram alerts on significant announcements. |
| Price gauge (`/tools/price-gauge`) | **Live** | A working estimator over the live records: pick element/form/purity/quantity, get a transparent low/mid/high USD/kg band + confidence + full basis. |
| Seller listings (`/sell` -> `POST /api/listings`) | **Live (storage-only)** | Captures a structured listing + a frozen price-gauge snapshot to the database. Publishing into the open dataset is a maintainer git-PR step, never automatic. |
| Screened-offer feed (`/offers`) | **Live, backend stubbed** | The feed is real and value-ranked, **seeded from the verified dataset** (220 rows). The live internet ingestion/screening backend is a documented stub (`lib/screening`, `docs/OFFER-SCREENING.md`). |
| **Email alerts** (`/alerts` -> `POST /api/subscribe`) | **Waitlist only** | Captures an email + topics to a waitlist. **Nothing is sent**: no email provider, no external calls. Telegram is the live channel. |

No paid services, no credentials, no live-ingestion theatre: anything external is
stubbed behind environment variables and placeholders.

---

## Tech stack & architecture

- **Next.js 14 (App Router)** + **TypeScript**: file-based routes; React Server
  Components keep the dense reference tables server-rendered with no hydration tax.
- **Tailwind CSS**: a documented terminal-grade design system (IBM Plex Sans /
  IBM Plex Mono / Source Serif 4, self-hosted).
- **Prisma** + **Postgres** (local dev **and** production): one engine
  everywhere: `DATABASE_URL` (point at a pooled endpoint on serverless hosts) plus
  `DIRECT_URL` for migrations; local dev runs a local/Docker Postgres. _(The
  migration originally used SQLite for dev; that was superseded at deploy. See
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).)_
- **Content tooling**: `gray-matter` (front matter), `yaml` (`_data/*.yml`),
  `react-markdown` + `remark-gfm` + `rehype-raw` (HTML-rich element/article bodies).

### The hybrid data strategy (the load-bearing decision)

Two stores with opposite needs, never mixed:

1. **Reference + provenance data stays in versioned files** (`_data/`,
   `_elements/`, `_articles/`), read at build time through the typed data layer in
   `lib/data/` and rendered SSG/ISR. It is open data (CC BY 4.0), and the Python
   pipeline in `scripts/` reads and writes it on a six-hour cadence. It is **never**
   moved into the database.
2. **Only genuinely dynamic, user-generated rows live in Prisma**: three models
   (`Listing`, `Subscription`, `ScreenedOffer`). Runtime writes, often private,
   **never** auto-published into the open dataset.

The full rationale, route map, and data contracts are in the docs:

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: directory layout, route map, TypeScript data contracts.
- **[docs/MIGRATION.md](docs/MIGRATION.md)**: stack decision, hybrid data strategy, the URL-preservation contract.
- **[docs/AUDIT.md](docs/AUDIT.md)**: what exists and the preservation contract (the original Jekyll-site inventory).
- **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** · **[docs/VISUALIZATION-AUDIT.md](docs/VISUALIZATION-AUDIT.md)** · **[docs/QA.md](docs/QA.md)** · **[docs/SEO.md](docs/SEO.md)** · **[docs/OFFER-SCREENING.md](docs/OFFER-SCREENING.md)**

### Repository layout

```
app/          Next.js App Router routes + handlers (api/, sitemap.ts, robots.ts, feed.xml/, movements.xml/)
components/   server-first React (seo/, charts/, elements/, regulatory/, trust/, layout/, ui/, …)
lib/          data/ (typed readers over _data/), types.ts, price-gauge.ts, screening/, seo.ts, db.ts, format.ts
prisma/       schema.prisma (Listing, Subscription, ScreenedOffer), seed.ts
_data/        versioned reference + provenance (yml/json), open data, the product
_elements/    31 element bodies (.md)   ·   _articles/   5 articles (.md)
scripts/      Python pipeline + regulatory monitor (scheduled PR updates)
public/       static assets (favicons, og image, manifest, open-data exports)
docs/         architecture, migration, audit, design system, QA, SEO, offer-screening, investor walkthrough
```

---

## Local development

Requires **Node 18.17+** (Next 14) and npm.

```bash
git clone https://github.com/mironovb/lanthanides.io.git
cd lanthanides.io
npm install                 # also runs `prisma generate`

# Local Postgres in one line (Docker), or point .env at any Postgres you have:
docker run --name lanth-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

cp .env.example .env        # local config; see Environment below
npx prisma migrate deploy   # apply the committed schema to your local Postgres
npx prisma db seed          # seed the screened-offer feed (220 rows) from the dataset

npm run dev                 # http://localhost:3000
```

| Command | What it does |
|:--|:--|
| `npm run dev` | Local dev server. |
| `npm run build` | Production build. **The gate: it must pass before every commit.** |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (`next/core-web-vitals`). |
| `npx prisma migrate dev` | Create/apply a dev migration after editing `prisma/schema.prisma`. |
| `npx prisma db seed` | Seed the database (`tsx prisma/seed.ts`). |
| `npx prisma generate` | Regenerate the Prisma client (also runs on `npm install`). |

### Environment

Copy `.env.example` to `.env` (gitignored; never commit it):

| Variable | Purpose |
|:--|:--|
| `DATABASE_URL` | Prisma datasource: a `postgresql://...` connection string. On a serverless host, point it at a **pooled** endpoint. |
| `DIRECT_URL` | Direct (non-pooled) Postgres connection used by `prisma migrate`. For a local/Docker Postgres, set it equal to `DATABASE_URL`. |
| `NEXT_PUBLIC_TELEGRAM_BOT_URL` | Public link to the MOFCOM alert bot. `NEXT_PUBLIC_` is inlined into the client bundle, so it must be public-safe (a bot/channel URL, never a token). Left as the placeholder, the "Get alerts" CTAs route to `/alerts/` instead of shipping a dead link. |

No paid/external service is needed to run the site. Postgres runs locally
(Docker) and every external integration (email, payments, live ingestion) is
stubbed.

---

## Data model & open data

Three Prisma models hold all runtime, user-generated state, and nothing that
belongs in the open dataset:

| Model | Source surface | Holds |
|:--|:--|:--|
| `Listing` | `/sell` | Seller submissions + a frozen price-gauge snapshot. `status: pending -> reviewed -> published`. Private `sellerContact` is never returned or rendered. |
| `Subscription` | `/alerts` | Notification signups (`channel`, optional `email`, `topics` CSV, `status: waitlist`). Deduped by email+channel. Never enumerated. |
| `ScreenedOffer` | `/offers` | The value-ranked offer feed. `origin: seed` (from the dataset) vs `screened` (live pipeline, not built). |

A row is **never** auto-published back into the open dataset. That stays the
reviewed git-PR flow.

**Open-data export.** The 238 price records are downloadable as JSON or CSV from
**`/api/export/json/`** and **`/api/export/csv/`** (generated from `lib/data`, so
a download can never drift from what the site renders), with CC BY 4.0 headers.
The **`/data`** landing page documents the dataset, provenance, and licence. The
pre-computed `/assets/data/fluctuations.json` export keeps its original URL.

---

## Deployment

A Node server is required (API route handlers, dynamic rendering, Prisma), and the
site is deployed on **Vercel** for Next.js App Router.
**Full step-by-step host setup, Postgres wiring, DNS cutover, and post-cutover
verification is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).**

1. **Database.** Provision a managed Postgres; set `DATABASE_URL` (pooled) and
   `DIRECT_URL` (direct). The schema is already Postgres (`provider = "postgresql"`)
   with a committed migration baseline, no per-deploy edit. Run
   `prisma migrate deploy` against the production database, then `prisma db seed`
   once to populate the offer feed. It is idempotent and safe to re-run.
2. **Environment.** Set `DATABASE_URL`, `DIRECT_URL`, and (optionally)
   `NEXT_PUBLIC_TELEGRAM_BOT_URL` in the host's secret store. Never commit a real
   `.env`. `prisma generate` runs on `postinstall`; set the host build command to
   `prisma migrate deploy && next build`.
3. **Domain.** `CNAME` (`www.lanthanides.io`) is preserved; only the host binding
   moves. No public URL changes. Every legacy permalink resolves or 301-redirects
   (the URL contract is in `docs/MIGRATION.md` §3).
4. **The data pipeline** (`scripts/`, Python) runs independently on scheduled
   GitHub Actions and opens review PRs for data or monitor-state updates. It does
   not deploy the web app. Vercel builds and deploys after merges to `main`.

---

## Contributing

Contributions of sourced pricing data, corrections, and market notes are welcome.
Every change must be factual, sourced, and verifiable, and price changes land as a
**reviewable git diff**, never an opaque edit. The intake is a two-human-checkpoint
flow: a structured issue, an `approved` label, a manually dispatched PR, merge.
See **[CONTRIBUTING.md](CONTRIBUTING.md)** for data formats, source standards, and
the submission workflow, and **[/contribute](https://www.lanthanides.io/contribute/)**
for the pipeline in context.

---

## License

Dual-licensed:

- **Code** (app, components, build config): **[MIT](LICENSE)**.
- **Content & data** (articles, element descriptions, pricing data, the regulatory
  corpus): **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.

See **[LICENSE](LICENSE)** for full terms. Contact: **hello@lanthanides.io**.
