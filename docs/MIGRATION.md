# lanthanides.io — Migration Plan & Stack Decision

> Companion to `docs/AUDIT.md` (the inventory) and `docs/ARCHITECTURE.md` (the target layout & contracts).
> This document justifies the move from static **Jekyll** to a dynamic **Next.js** stack and fixes the
> data strategy, URL contract, and migration sequencing that every later prompt follows.
> **`docs/AUDIT.md` is the source of truth for what exists and what must be preserved.** Where this plan
> and the audit disagree, the audit wins and this plan is corrected.
> Scope of this prompt: **documentation only — no code, no installs, no deploy, no credentials.**

---

## 1. Stack decision & justification

**Target stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Prisma ORM (SQLite for local/dev, Postgres for production).

The current site is a static Jekyll build served from GitHub Pages. It does the *reference* job well but has no
server: it cannot run the price-gauge, accept a seller listing, or manage a notification subscription — the
commercial direction in `AUDIT.md` §6. The migration keeps everything Jekyll does well (versioned open data, SEO,
the crown-jewel regulatory tracker) and adds the thin slice of server capability the product roadmap needs.

| Choice | Why it fits this product | What it replaces / enables |
|:--|:--|:--|
| **Next.js — App Router** | File-based routing maps almost 1:1 onto the Jekyll pretty-permalink contract (`AUDIT.md` §2). React Server Components keep the dense, server-rendered price/regulatory tables server-rendered — no client hydration tax for read-only data, matching today's no-JS-first Jekyll output. Route handlers (`app/api/*`) give us the server endpoints the price-gauge / listings / subscriptions need, in the *same* project as the pages. | Replaces Jekyll's Liquid templating; enables the dynamic routes (`/sell`, `/offers`, `/alerts`, `/api/*`) that GitHub Pages structurally cannot host. |
| **SSR / ISR** | Reference pages (element detail, regulatory, framework, methodology) are SEO-critical and must ship complete HTML with JSON-LD. They are **statically generated (SSG)** from build-time `_data/` files; the few pages that blend file data with DB-backed enrichment (live listing counts, screened-offer feed) opt into **ISR** (`revalidate`) so they refresh without a full redeploy. | Preserves (and improves on) Jekyll's static-HTML SEO story while allowing dynamic data to appear without rebuilding the world. |
| **TypeScript** | The audit's worst data-integrity tell (§4.3) is two parallel stores producing *different* prices for the same element. A single typed data-access layer with the contracts in `ARCHITECTURE.md` makes the schema explicit and catches divergence at compile time. The data is heterogeneous YAML/JSON; types are the cheapest guardrail. | Replaces untyped Liquid field access (`page.foo` with no schema) with one checked interface set. |
| **Tailwind CSS** | The brand brief (`.impeccable.md`) wants a dense Bloomberg/terminal aesthetic — tight type scale, monospace numerics, high information density. Tailwind's token-driven config expresses that design system once (IBM Plex Sans/Mono + Source Serif 4 per the brief), and utility classes keep dense tables consistent. Resolves §4.7 (shipped site diverged from its own brief: Inter/JetBrains, no serif). | Replaces the 24 hand-rolled SCSS partials with one token source of truth. |
| **Prisma + SQLite/Postgres** | Genuinely dynamic, user-generated rows (seller listings, subscriptions, screened offers) need a real database with typed access and migrations. SQLite is zero-config for local/dev; Postgres is the production target. Prisma's `datasource` provider switch means **dev→prod is a connection-string change, not a code change.** | Adds the only persistence layer the product gains; everything else stays in files. |

### Explicit trade-off: hosting moves off GitHub Pages

A Node server is now required (API routes, ISR, Prisma). The site can no longer be served by GitHub Pages.

- **Deployment target:** a Node host (e.g. **Vercel**, the natural fit for Next.js App Router + ISR + Postgres).
- **`CNAME` is preserved.** The apex/`www` domain stays `www.lanthanides.io` (current `CNAME` content). The DNS/host
  binding moves from GitHub Pages to the Node host; the domain does not change, so no public URL is affected by the host move.
- **This prompt does NOT wire up any deploy, host config, or credentials.** Choosing and connecting the host is a later,
  explicitly-authorized step. We only record the decision and the constraint here.

---

## 2. Hybrid data strategy

The product is two things wearing one skin: an **open-data reference** (elements, prices, provenance, regulatory
intelligence) and a **thin commercial app** (listings, alerts, screened offers). They have opposite persistence needs,
so they get opposite stores.

### 2.1 Reference + provenance data stays in versioned files (`_data/`, `_elements/`, `_articles/`)

Everything the audit calls canonical stays exactly where it is, read at build time:

| Data | File(s) | Records |
|:--|:--|:--|
| Element catalog | `_data/element_catalog.yml` | 31 |
| Price records (display canonical) | `_data/price_records.json` | 238 |
| Price history (time series) | `_data/price_history/*.yml` | 31 files / 285 observations |
| Pre-computed fluctuations | `_data/fluctuations.json` | per-element windows |
| Movements feed | `_data/movements.yml` | events + sparkline geometry |
| Regulatory notices | `_data/regulatory/*.yml` | 5 (the crown jewel) |
| Policy timeline | `_data/policy_events.yml` | 11 |
| Source registry | `_data/source_registry.yml` | 5 |
| Source breakdown | `_data/source_breakdown.yml` | 285-obs mix |
| Site settings / labels | `_data/site_settings.yml` | — |
| Element bodies | `_elements/*.md` | 31 |
| Articles | `_articles/*.md` | 5 |

A typed **data-access layer** (`lib/data/`, contracts in `ARCHITECTURE.md` §3) reads these files at build time and
returns validated objects; pages render via **SSG/ISR**. No database sits in front of the reference data.

**Why the provenance dataset must NOT be hidden behind a database** — this is the load-bearing decision of the whole migration:

1. **The data *is* the product, and its credibility comes from being inspectable.** `AUDIT.md` §6 names the regulatory
   tracker the differentiator precisely because a funder "can verify it in five minutes and not find it elsewhere." A
   database row has no public URL, no diff, no history. A YAML file in git has all three. Hiding the dataset behind an
   opaque server destroys the one property that makes it defensible.
2. **It honors the open-data / CC BY 4.0 licence in substance, not just in a footer.** The dataset is published so it can
   be forked, audited, and cited. Files in git *are* the open-data export; a DB would force us to re-publish a derivative
   and ask the world to trust that the export matches the live data.
3. **It keeps the existing Python pipeline in `scripts/` working unchanged.** `validate_data.py`, `normalize_prices.py`,
   `fluctuations.py`, `detect_movements.py`, `source_breakdown.py`, and the **regulatory-monitor** (`run_monitor.py` →
   `scraper/` → `triage.py` → `notify/`) all read and write these files. The monitor bot commits `_data` updates every
   6 hours (`AUDIT.md` §1.9, §5). Moving the data into a DB would break this freshness engine or force a costly rewrite.
4. **Provenance review is a git-PR flow.** The contributor pipeline (`AUDIT.md` §5) — issue templates →
   `approved` label → `community-intake.yml` opens a PR with two human checkpoints — depends on price changes being a
   reviewable file diff. That is the consent-/review-gated provenance model documented on `/methodology/`.
5. **Read-heavy, write-rare, build-time-stable.** The reference data changes a few times a day at most and is read on
   every page view. Files + SSG/ISR is the cheapest, fastest, most cacheable shape; a DB query per request would add load
   and latency for zero benefit.

> The data layer also resolves the §4.3 count contradiction (238 price records vs 285 observations) by exposing **labeled**
> counts from one place, so home/about/methodology stop disagreeing. It collapses the parallel `_data/elements/*.yml`
> store (which only fed the divergent interactive ledger) — `price_records.json` becomes the single canonical price store.

### 2.2 Only genuinely dynamic, user-generated data lives in Prisma/SQLite

Three tables, and nothing that belongs in `_data/`:

| Prisma model | Holds | Why it's a DB, not a file |
|:--|:--|:--|
| `Listing` | Seller-submitted listings from `/sell` | User-generated at runtime; not provenance; must not enter the open dataset without review. |
| `Subscription` | Notification subscriptions from `/alerts` | Per-user state (channel + destination); private; never published. |
| `ScreenedOffer` | Seeded screened-offers feed behind `/offers` | Demand-side rows; seeded for tonight; will later be ingested/screened dynamically. |

These are runtime writes, often private, and explicitly **not** part of the auditable open dataset. They get a real
database, migrations, and typed access — and they stay out of git history.

---

## 3. URL preservation (the routing contract)

`AUDIT.md` §2 is the hard contract. Every public URL the Jekyll site serves must keep working or get an explicit
redirect. Jekyll uses `permalink: pretty` (trailing-slash pages), so the Next app sets **`trailingSlash: true`** in
`next.config` to match — every page URL keeps its trailing slash. Machine-readable endpoints that carry a file
extension (`.xml`, `.json`, `.txt`, `.webmanifest`) keep their exact extension-bearing path with **no** trailing slash
and are served by route handlers or static files in `public/`.

### 3.1 Top-level pages

| Old Jekyll URL | New Next route | Status |
|:--|:--|:--|
| `/` | `app/page.tsx` → `/` | preserved |
| `/dashboard/` | `app/dashboard/page.tsx` | preserved |
| `/elements/` | `app/elements/page.tsx` | preserved |
| `/regulatory/` | `app/regulatory/page.tsx` | preserved |
| `/framework/` | `app/framework/page.tsx` | **preserved — see note ★** |
| `/movements/` | `app/movements/page.tsx` | preserved |
| `/news/` | `app/news/page.tsx` | preserved |
| `/methodology/` | `app/methodology/page.tsx` | preserved |
| `/about/` | `app/about/page.tsx` | preserved (reframed as About **/ Vision**, P15) |
| `/vision/` *(new alias)* | — | **301 → `/about/`** — the About page is the investor-facing About/Vision page; `/vision` is an alias investors may type (P15) |
| `/sources/` | `app/sources/page.tsx` | preserved |
| `/prices/` | — | **CHANGES → 301 redirect to `/elements/`** (see §3.5) |
| `/404.html` | `app/not-found.tsx` | preserved in behavior (Next serves the 404 page for any unmatched route; the literal `.html` path was a Jekyll artifact, not linked) |

> ★ **`/framework/` reconciliation.** The enumerated route list in the migration prompt omitted `/framework`. But
> `AUDIT.md` §2 (permalink contract), §5 (assets to preserve), and §6 (crown-jewel cluster) make `/framework/` a **hard
> contract and a near-unique asset to preserve verbatim**. Per the run rule (`AUDIT.md` is the source of truth), it is
> **included** here and in `ARCHITECTURE.md`. Later prompts must build `/framework/` and keep its in-page anchors.

### 3.2 Element collection (31) — case-sensitive symbols

`/elements/<Symbol>/` with **original-case** symbols → `app/elements/[symbol]/page.tsx` with `generateStaticParams()`
emitting the exact 31 symbols from `element_catalog.yml`:

`La Ce Pr Nd Sm Y Sc Eu Gd Tb Dy Ho Er Tm Yb Lu Te V Sb W Bi Mo Zr Ta Nb Co Li Ga Ge Se In`

> ⚠️ Case sensitivity is part of the contract: the canonical URL is `/elements/Dy/`, **not** `/elements/dy/`. `generateStaticParams`
> emits the cased symbols; a lowercase request should 301 to the cased form (handled in a later prompt, not assumed by the router).

### 3.3 Article collection (5)

`/news/<slug>/` → `app/news/[slug]/page.tsx` with `generateStaticParams()` over `_articles/*.md`:

`/news/chinas-invisible-rare-earth-wall/` · `/news/chinese-export-licence-timelines/` ·
`/news/ebay-rare-earth-market-research-april-2026/` · `/news/mofcom-october-2025-suspension/` ·
`/news/retail-premium-puzzle/`

### 3.4 Machine-readable / feeds / SEO (exact paths, no trailing slash)

| Old URL | New home | Mechanism |
|:--|:--|:--|
| `/sitemap.xml` | `app/sitemap.ts` | Next sitemap (replaces jekyll-sitemap) |
| `/feed.xml` | `app/feed.xml/route.ts` | Atom route handler (replaces jekyll-feed) |
| `/movements.xml` | `app/movements.xml/route.ts` | custom Atom feed (port of `movements.xml`) |
| `/robots.txt` | `app/robots.ts` | Next robots (sitemap pointer preserved) |
| `/humans.txt` | `public/humans.txt` | static file |
| `/assets/images/site.webmanifest` | `public/assets/images/site.webmanifest` | static file — **fix the `/periodicpricing/...` icon paths (§4.8) → `/assets/images/...`** and align theme/background colors to brand tokens |
| `/assets/data/elements.json` | **301 → `/api/export/json/`** (P8) | superseded by the canonical price-records export — see §3.4.1 |
| `/assets/data/fluctuations.json` | `public/assets/data/fluctuations.json` | **open-data export — URL preserved** (P8: copied from canonical `_data/fluctuations.json`) |
| `/assets/images/*` (favicons, og-default.png, logos) | `public/assets/images/*` | static files (binaries carried over verbatim) |

> Anchors to preserve (deep-linked from multiple pages): `/methodology/#display-price`, `#provenance-chain`,
> `#data-sources-breakdown`, `#oxide-to-metal`; and on `/framework/`: `#pricing`, `#us-side-tariff-stack-may-14-2026`.
> Section `id`s must match so existing inbound links and in-page navigation keep working.

#### 3.4.1 Open-data export — decisions taken in Prompt 8

The canonical open-data export is now the route handler **`/api/export/[format]`** (`format` ∈ `json` | `csv`),
generated from the price-records dataset via `lib/data` so a download can never drift from what the site renders.
Both formats are pre-rendered at build (`generateStaticParams` + `dynamicParams=false`) and carry CC BY 4.0 headers
(`X-License`, `Link: …; rel="license"`) plus `Access-Control-Allow-Origin: *`. The `/data` landing page documents the
dataset, provenance, licence, and every download link.

The two legacy `/assets/data/*.json` URLs are handled as follows so every old URL keeps resolving:

- **`/assets/data/elements.json` → 301 → `/api/export/json/`.** The legacy file was a *Jekyll template* (not a committed
  static JSON), produced a per-element retail/bulk **summary**, and its only consumer was the retired interactive ledger
  JS (`legacy/assets/js/ledger.js`, replaced by the server-rendered `/elements`). The canonical price-records export is a
  superset, so the URL redirects there rather than reproducing a thinner shape.
- **`/assets/data/fluctuations.json` → preserved as a static file** at `public/assets/data/fluctuations.json`. It is real
  pre-computed data (byte-identical to canonical `_data/fluctuations.json`), so Prompt 8 copies it into `public/` to keep
  the exact URL serving the exact shape. (Prompt 7 wires build-time regeneration from the canonical store; until then the
  copy is refreshed per build.)

### 3.5 The one URL that changes

**`/prices/` → 301 → `/elements/`.** The Jekyll site has two near-duplicate price tables: `/prices/` ("The Ledger",
interactive) and `/elements/` (the directory, 4 category tables). They are merged into a single canonical price
directory at `/elements/` (resolving `AUDIT.md` §4.3 / viz item #11 — two stores, one truth). `/prices/` becomes a
permanent redirect to `/elements/` so no inbound link breaks. This is the only public page URL that changes.

> **Wired in Prompt 8.** `next.config.mjs` now serves this as an explicit `statusCode: 301` redirect (not Next's
> `permanent: true`, which emits 308) to honour the "301" contract verbatim. Chosen over adding a thin `/prices` page:
> the merge into `/elements/` is the documented intent, and a second near-duplicate table would re-introduce the very
> two-stores problem this resolves. (`trailingSlash: true` first normalises a slashless `/prices` → `/prices/`, which
> then 301s to `/elements/`.)

> New routes introduced by the commercial direction have **no** old equivalent and therefore need no redirect:
> `/data`, `/tools/price-gauge`, `/sell`, `/offers`, `/alerts`, and all `/api/*`. The nav label "Prices" repoints to
> `/elements`; "Contribute" continues to point at the GitHub contributor flow (issue templates), not a new app route.

---

## 4. Migration sequencing (prompts 3–8)

The invariant: **`next build` must succeed on every commit from prompt 3 onward** (a not-yet-ported page renders a
labeled placeholder, never a build error), and **the Jekyll site stays buildable in parallel** for side-by-side parity
diffing until prompt 25. Jekyll's templating/build files are moved into **`legacy/`** as each route reaches parity (the
Next build never imports from `legacy/`); the entire `legacy/` tree is deleted only after **prompt 25** signs off full
route parity against `AUDIT.md` §2.

| Prompt | Stands up | Build state at end |
|:--|:--|:--|
| **3 — Scaffold** | Next.js App Router + TS + Tailwind + Prisma installed alongside Jekyll. `next.config` (`trailingSlash: true`), `tailwind.config` (brand tokens + IBM Plex/Source Serif), `tsconfig`, root `app/layout.tsx` shell. Repo hygiene (`AUDIT.md` §4.2): remove scratch files, `git rm -r --cached` the `__pycache__` dirs. `legacy/` quarantine convention established. | `next build` passes (shell + placeholders); Jekyll still builds. |
| **4 — Data layer** | `lib/types.ts` (the `ARCHITECTURE.md` §3 contracts) + `lib/data/*` readers over `_data/`, `_elements/`, `_articles/`. `lib/price-gauge.ts` (port of `price-selection.html` retail_ref/bulk_ref logic). Validation so a malformed file (e.g. the `La.yml` placeholder, §4.4) fails the build loudly. | `next build` passes; data loads & validates. |
| **5 — Design system & shell** | Tailwind token system, fonts, `nav`/`footer`, `<head>`/SEO via `generateMetadata` (`lib/seo.ts`), the four JSON-LD components, breadcrumb. Dense terminal aesthetic per `.impeccable.md`. | `next build` passes; shell renders on every route. |
| **6 — Reference & content pages** | SSG/ISR ports: `/`, `/elements`, `/elements/[symbol]`, `/regulatory`, `/framework`, `/methodology`, `/sources`, `/about`, `/news`, `/news/[slug]`. Element/article markdown bodies rendered server-side. | `next build` passes; reference routes at parity. |
| **7 — Data exports, feeds & dashboard** | `/dashboard`, `/movements`, plus `app/movements.xml`, `app/feed.xml`, `app/sitemap.ts`, `app/robots.ts`, the open-data `/data` landing page, and the preserved `/assets/data/*.json` exports (generated at build). | `next build` passes; feeds/sitemap/robots validate; open-data URLs preserved. |
| **8 — Commercial stubs & API** | Prisma schema (`Listing`, `Subscription`, `ScreenedOffer`) + seed. Stubbed routes `/tools/price-gauge`, `/sell`, `/offers`, `/alerts` and handlers `/api/price-gauge`, `/api/listings`, `/api/subscribe`, `/api/export/[format]`. Clear real-vs-stub boundary (`ARCHITECTURE.md` §4). | `next build` passes; SQLite migrates & seeds; stubs respond. |

> Prompts 9–24 (out of scope here) cover the visualization rebuilds (`AUDIT.md` §3), content/positioning (§4.5–§4.6),
> design polish, and PWA/manifest fixes (§4.8). **Prompt 25** verifies route parity against `AUDIT.md` §2 and then
> removes `legacy/`.

---

## 5. Preservation checklist

Every must-preserve asset from `AUDIT.md` §5, with its new home. Nothing on this list may be lost in the migration.

| Asset | New home / mechanism |
|:--|:--|
| ☐ **SEO meta** (title/desc/keywords/canonical/OG/Twitter, per-layout OG title logic) | `lib/seo.ts` + per-route `generateMetadata()` |
| ☐ **JSON-LD** — WebSite + FAQPage, Product + Offer[], Article, BreadcrumbList | `components/structured-data/*` emitted per route |
| ☐ **Sitemap** (`/sitemap.xml`) | `app/sitemap.ts` |
| ☐ **Atom feed** (`/feed.xml`) | `app/feed.xml/route.ts` |
| ☐ **Custom movements Atom feed** (`/movements.xml`, category-tagged) | `app/movements.xml/route.ts` |
| ☐ **robots** (`/robots.txt` + sitemap pointer) | `app/robots.ts` |
| ☐ **Favicons / manifest** (ico/16/32/svg/apple-touch/android-chrome 192+512, `site.webmanifest`) | `public/assets/images/*`; **fix `/periodicpricing/...`→`/assets/images/...` paths and align colors (§4.8)** |
| ◑ **Open-data export** (`/assets/data/elements.json`, `/assets/data/fluctuations.json`) | P8: `/api/export/[format]` (json/csv) is canonical; `fluctuations.json` preserved as a static file in `public/`; `elements.json` 301s to the export. See §3.4.1. |
| ☐ **CC BY 4.0 + MIT dual license** | `LICENSE` unchanged; surfaced in footer, `<head>` `rel="license"`, and Atom `<rights>` |
| ☐ **Contributor pipeline** (issue templates, PR template, `community-intake.yml`, two-human-checkpoint flow) | unchanged — data stays in `_data/`, flow stays a git-PR flow |
| ☐ **Regulatory-monitor pipeline** (`regulatory-monitor.yml`, `scripts/scraper/`, `triage.py`, `notify/`, `run_monitor.py`, `run_state.json`) | `scripts/` unchanged; still commits to `_data/` on its 6-hour cadence |
| ☐ **`CNAME`** (`www.lanthanides.io`) | preserved; host binding moves to the Node host (no public URL change) |
| ☐ **31 element pages + 5 articles + `/framework/`** | `_elements/`, `_articles/` in place; `/framework/` ported verbatim with anchors |
| ☐ **Two-price model + `price-selection` logic** | `lib/price-gauge.ts` (typed port of `retail_ref`/`bulk_ref`) |

---

*End of migration plan. Read with `docs/AUDIT.md` (what exists) and `docs/ARCHITECTURE.md` (target layout, route map,
data contracts, feature modules). Treat §3 as the hard URL contract and §4 as the build-must-stay-green sequencing rule.*
