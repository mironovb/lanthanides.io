# CLAUDE.md — lanthanides.io

Conventions every unattended session must follow. **Read this first.** The hard
rules below are non-negotiable; the migration checklist at the bottom tracks
progress across prompts 1–25.

Companion docs (read when relevant): `docs/AUDIT.md` (what exists, the
preservation contract), `docs/MIGRATION.md` (why this stack, the URL contract,
build-green sequencing), `docs/ARCHITECTURE.md` (directory layout, route map,
TypeScript data contracts).

---

## What this is

**lanthanides.io — Strategic Materials Ledger** is migrating from a static
**Jekyll** site to a dynamic **Next.js** app, as a sequence of unattended
prompts. The product is two things in one skin: an **open-data reference**
(elements, prices, provenance, regulatory intelligence) and a **thin commercial
app** (seller listings, alerts, screened offers).

## Stack

- **Next.js 14 (App Router)** + **TypeScript** — file-based routes; React Server
  Components keep dense reference tables server-rendered (no hydration tax).
- **Tailwind CSS** — tokens in `tailwind.config.ts`; fonts as CSS variables in
  `app/globals.css`. Type pairing: **IBM Plex Sans** (UI) · **IBM Plex Mono**
  (all numerics, tabular figures) · **Source Serif 4** (headings).
- **Prisma** + **SQLite** (local/dev) / **Postgres** (prod) — the datasource
  `provider` switches by `DATABASE_URL` only, never by code.
- Content tooling: `gray-matter` (front matter), `yaml` (`_data/*.yml`),
  `react-markdown` + `remark-gfm` + `rehype-raw` (HTML-rich element/article
  bodies).

## Hybrid data strategy (the load-bearing decision)

Two stores with opposite needs — **never mix them**:

1. **Reference + provenance data stays in versioned files** — `_data/`,
   `_elements/`, `_articles/`. Read at build time through the typed data layer
   in **`lib/data/`** (contracts in `lib/types.ts`, mirroring ARCHITECTURE §3),
   rendered **SSG/ISR**. This data *is* the product: it must stay inspectable in
   git (open-data / CC BY 4.0), and the Python pipeline in `scripts/` reads &
   writes it on a 6-hour cadence. **Never** move reference data into the DB.
2. **Only genuinely dynamic, user-generated rows live in Prisma** — three
   models: `Listing` (`/sell`), `Subscription` (`/alerts`), `ScreenedOffer`
   (`/offers`). Runtime writes, often private; **never** auto-published into the
   open dataset (that stays the reviewed git-PR flow).

## Commands

- `npm run dev` — local dev server.
- **`npm run build`** — **the gate. It MUST pass before every commit.** A
  not-yet-ported route renders a labeled placeholder; it must never be a build
  error (MIGRATION §4 invariant).
- `npm run lint` — ESLint (`next/core-web-vitals`).
- `npx prisma migrate dev` — create/apply a dev migration after editing
  `prisma/schema.prisma`.
- `npx prisma db seed` — seed the DB (seeder lands with the Prisma models).
- `npx prisma generate` — regenerate the client (also runs on `npm install`).

## Hard rules (non-negotiable)

1. **No fabricated data.** Never invent prices, dates, sources, regulatory
   facts, or counts. Read from `_data/` (or the DB). If a value is missing,
   surface the gap — do not fill it.
2. **Preserve permalinks.** `trailingSlash: true` is set in `next.config.mjs`;
   every page URL keeps its trailing slash. Machine-readable endpoints
   (`.xml`/`.json`/`.txt`/`.webmanifest`) keep their exact extension path with
   **no** trailing slash. The only URL that changes: `/prices/ → 301 →
   /elements/`. Element URLs are case-sensitive (`/elements/Dy/`, not `/dy/`).
   Preserve in-page anchors (e.g. `/methodology/#display-price`,
   `/framework/#pricing`).
3. **No credentials, no paid services.** SQLite only (local file). Stub anything
   external (email delivery, payments, live ingestion) with env vars +
   placeholders. Never commit a real `.env`, key, or secret. **Do not
   `git add -A`** — `.arun/`, `combined*.txt`, `chat.md` are gitignored
   scratch/secrets; **stage deliverables explicitly.**
4. **`legacy/` is reference-only.** It holds the quarantined Jekyll build files
   (layouts, includes, SCSS, pages, config, old JS/CSS). The Next build **never**
   imports from `legacy/`. It is deleted in **Prompt 25** after route-parity
   sign-off.
5. **`build` stays green on every commit** (MIGRATION §4 sequencing invariant).

## Directory map (condensed from ARCHITECTURE §1)

```
app/          Next.js App Router — routes + handlers (api/, sitemap.ts, robots.ts, feed.xml/, movements.xml/)
components/    server-first React (structured-data/, charts/, price/, regulatory/, layout/, ui/)
lib/          data/ (typed readers over _data/), types.ts, price-gauge.ts, seo.ts, db.ts
prisma/       schema.prisma (Listing, Subscription, ScreenedOffer), seed.ts
_data/        UNCHANGED — versioned reference + provenance (yml/json)
_elements/    UNCHANGED — 31 element bodies (.md)
_articles/    UNCHANGED — 5 articles (.md)
scripts/      UNCHANGED — Python pipeline + regulatory monitor (commits _data/ every 6h)
public/       assets/images (favicons, og, manifest), assets/data (open-data exports, build-generated)
docs/         AUDIT.md, MIGRATION.md, ARCHITECTURE.md
legacy/       quarantined Jekyll files (reference-only; removed in Prompt 25)
```

`_data/`, `_elements/`, `_articles/`, `scripts/`, `assets/images`, `assets/data`,
`CNAME`, `robots.txt`, `humans.txt` stay at the repo root, reused by Next.

## Route map (ARCHITECTURE §2 — SSG unless noted; built across Prompts 6–8)

| Route | Render | Old URL |
|:--|:--|:--|
| `/` | SSG | `/` |
| `/elements` | SSG | `/elements/` (+ `/prices/` 301→here) |
| `/elements/[symbol]` | SSG (31, case-sensitive) | `/elements/<Symbol>/` |
| `/regulatory` | SSG | `/regulatory/` |
| `/framework` | SSG | `/framework/` (preserve anchors) |
| `/methodology` · `/sources` · `/about` | SSG | same `/…/` |
| `/news` · `/news/[slug]` | SSG (5 articles) | `/news/…/` |
| `/dashboard` | ISR | `/dashboard/` |
| `/movements` | SSG | `/movements/` |
| `/data` | SSG | — (new open-data landing) |
| `/tools/price-gauge` · `/sell` · `/offers` · `/alerts` | Dynamic/ISR | — (new, **STUB**) |
| `/sitemap.xml` · `/robots.txt` · `/feed.xml` · `/movements.xml` | Handler | same exact path |
| `/api/price-gauge` · `/api/listings` · `/api/subscribe` · `/api/export/[format]` | Handler | — (new) |

## Design tokens (baseline — Prompt 3)

Terminal-adjacent, dense, understated: near-black/graphite surfaces, one
restrained teal accent, sharp corners (no rounded cards), small base font (13px),
monospace tabular numerics. Color only ever encodes meaning — price movement
(`up`/`down`/`neutral`), regulatory risk (`risk-low`/`-medium`/`-high`/
`-suspended` = teal/amber/red/gray), and the four element categories. Colors live
in `tailwind.config.ts`; fonts are CSS variables in `app/globals.css`.

> **Reconciliation note:** `.impeccable.md` specifies a **light-mode** brand
> system. These dark baseline tokens are the scaffold; **Prompt 11** refines them
> into the full design system. Keep tokens semantic so the light-mode switch is a
> token edit, not a utility-class rewrite.

---

## Migration status checklist (Prompts 1–25)

Each prompt must leave `npm run build` green. Later prompts tick these off.

- [x] **1 — Audit.** `docs/AUDIT.md`: current-site inventory, visualization
  inventory, investment-readiness gaps.
- [x] **2 — Plan & architecture.** `docs/MIGRATION.md` (stack decision, data
  strategy, URL contract, sequencing) + `docs/ARCHITECTURE.md` (layout, route
  map, data contracts).
- [x] **3 — Scaffold.** Next.js + TS + Tailwind + Prisma app shell; baseline
  design tokens; Jekyll build files quarantined into `legacy/`; this `CLAUDE.md`.
  `npm run build` passes on the placeholder home.
- [x] **4 — Data layer.** `lib/data/types.ts` (+ `lib/types.ts` re-export) =
  ARCHITECTURE §3 contracts; `lib/data/{load,index,verify}.ts` readers over the
  `_data/` files (catalog, price_records, price_history, fluctuations,
  regulatory, policy_events, news, source_registry, source_breakdown);
  `lib/price-gauge.ts` ports `price-selection.html` (retail/bulk refs + premium);
  build-time validation throws on a malformed file and asserts 31 elements /
  238 records / every regulated element resolves to a notice. (`_elements/`,
  `_articles/` markdown-body readers land with their pages in P6.)
- [ ] **5 — Design system & shell.** Token system, fonts (self-hosted), `nav`/
  `footer`, `<head>`/SEO via `lib/seo.ts`, JSON-LD components, breadcrumb.
- [ ] **6 — Reference & content pages.** `/`, `/elements`, `/elements/[symbol]`,
  `/regulatory`, `/framework`, `/methodology`, `/sources`, `/about`, `/news`,
  `/news/[slug]` (markdown bodies rendered server-side). **Element pages DONE**
  (the "Prompt 6" task in the local prompt sequence — same offset as P8): SSG
  `/elements` category grid (`ElementCard` tiles, control/demand indicators,
  retail+bulk refs) and all 31 case-sensitive `/elements/[symbol]` detail pages
  (`generateStaticParams`, `dynamicParams=false`) — header/badges, two
  reference-price cards + retail premium, Price Movement % table, full **sortable**
  provenance table (expanded to the complete schema), inline regulatory notice,
  editorial `_elements/*.md` bodies (`gray-matter` via `lib/content.ts`, HTML-rich
  markdown through react-markdown + rehype-raw, the `{% include provenance-table %}`
  resolved to the live table; front-matter `title`/`description`/`keywords` drive
  metadata), related + prev/next nav. New: `components/elements/*`, `lib/content.ts`,
  `components/elements/element-body.css`. `/regulatory` landed in P7 (below).
  **Content pages DONE** (the "Prompt 8" task in the local prompt sequence):
  SSG `/methodology` (prose relocated to `app/methodology/methodology.md` so the
  build never reads `legacy/`; live "Data sources breakdown" table from
  `source_breakdown.yml`; deep-link anchors preserved via a heading-id renderer),
  `/sources` (trust tiers from `site_settings.yml` + the source registry),
  `/about` (live coverage counts; `TODO(P15)` marker for the investor reframe),
  `/news` (the `_articles` collection as feature cards + the `news.yml` developments
  timeline), and `/news/[slug]` (SSG over the 5 `_articles/*.md`,
  `generateStaticParams`/`dynamicParams=false`, front-matter metadata + OG). New:
  `lib/content.ts` article loaders, `lib/data` `getSiteSettings`,
  `components/content/*` (`Markdown`, `SourceBreakdownTable`, `content-body.css`),
  `components/news/*`. **Remaining:** `/`, `/framework`.
- [ ] **7 — Data exports, feeds & dashboard.** `/dashboard`, `/movements`,
  `movements.xml`, `feed.xml`, `sitemap.ts`, `robots.ts`, `/data` landing, and the
  preserved `/assets/data/*.json` exports (build-generated). **Regulatory tracker
  + market movements DONE** (the "Prompt 7" task in the local prompt sequence):
  SSG `/regulatory` — element-filter island (`RegulatoryView` + `ElementFilter`,
  keyboard-accessible, instant client-side filter over server-rendered content)
  over classified active-control-regime cards (`RegulatoryNoticeCard`) and the
  newest-first announcement timeline (`RegulatoryTimeline`), key-legal-references
  aside, strong metadata + BreadcrumbList & Dataset JSON-LD; SSG `/movements` —
  the auto-generated price/regulatory event feed (`MovementRow`, sparklines,
  detection-threshold footer, honest "no editorial interpretation" framing); and
  the `/movements.xml` Atom feed route handler (faithful port, 50-event cap,
  preserved no-trailing-slash URL). New: `components/regulatory/*`,
  `components/movements/*`; `lib/data` gains the movements reader (`getMovements`,
  `MovementEvent`/`MovementsFile` types, build-time smoke-parse) and
  `getRegulatedAndSuspendedElements`. **Open-data `/data` + exports DONE** (the
  "Prompt 8" task in the local prompt sequence): the `/data` landing page
  (dataset description, provenance, CC BY 4.0, download links) and the preserved
  `/assets/data/*.json` exports — `fluctuations.json` copied into `public/`
  verbatim; `elements.json` 301→`/api/export/json/` (MIGRATION §3.4.1).
  **Remaining:** `/dashboard`, `feed.xml`, `sitemap.ts`, `robots.ts`.
- [ ] **8 — Commercial stubs & API.** **Prisma models (`Listing`,
  `Subscription`, `ScreenedOffer`) + seed: DONE** — the dynamic data model and the
  dataset-seeded `ScreenedOffer` feed (220 rows, `origin:"seed"`, SQLite dev /
  Postgres prod, ARCHITECTURE §5) landed early as the "Prompt 5" task in the local
  prompt sequence (which the checklist numbers as part of P8, not P5/Design).
  **`/api/export/[format]` DONE** (the "Prompt 8" task in the local prompt
  sequence): json/csv open-data export of the 238 price records from `lib/data`,
  CC BY 4.0 headers, both formats build-time static. **Remaining:**
  stub routes `/tools/price-gauge`, `/sell`, `/offers`, `/alerts`; handlers
  `/api/price-gauge`, `/api/listings`, `/api/subscribe`.
- [x] **9 — Remove choppy/low-data visualizations.** Executed the AUDIT §3
  REMOVE decisions — the per-element price-history line chart (never ported) is
  replaced by the Price Movement % table + a new sortable **Price History**
  observations table (`components/elements/PriceHistoryTable.tsx`, fed by
  `getPriceHistory`); the movements-feed sparkline is gated to ≥3 points (24 of
  26 sparkline events were 2-point); the dashboard "30-day movers" board + its 2-point
  sparkline and the orphaned `fluctuation-fallback.html` are ensured
  never-ported. Hard rule adopted: ≤2 distinct points ⇒ a table/stat, never a
  line. Full rationale in `docs/VISUALIZATION-AUDIT.md`.
- [x] **10 — Rebuild clean, data-honest visualizations.** A single shared
  charting primitive with a centralized **data-sufficiency gate**
  (`components/charts/sufficiency.ts`: `MIN_LINE_POINTS=5` per-series,
  `MIN_SPARKLINE_POINTS=3`; `LineChart.tsx` refuses to draw below it and falls
  back to a table). Rebuilt only the audit-approved set: a gated **Price Trend**
  line on element pages (`PriceHistoryChart`; renders for **0** elements today —
  no tier reaches 5 distinct days — so the P9 observations table stands in, the
  gate proven by 0 `<polyline>` in built output); the **data-coverage grid**
  (`CoverageGrid`, heatmap with per-tile counts), **control-by-category** bars
  (`MarketStructure`→`BarTable`, bar-in-table not pie), and the sortable
  **retail-premium leaderboard** (`PremiumLeaderboard`, with a form-**Basis**
  disclosure column) all on `/data`; the movements sparkline re-routed through the
  same gate; the regulatory timeline refined to terminal-grade. Every rendered
  visual states its own sample size and degrades to a table; no animation. Full
  final inventory + threshold rationale in `docs/VISUALIZATION-AUDIT.md`.
- [ ] **11–24 — Polish & rebuilds** (MIGRATION §4): content/positioning
  (§4.5–§4.6), design polish (Prompt 11 = full design system), PWA/manifest fixes
  (§4.8, incl. `/periodicpricing/…` → `/assets/images/…`).
- [ ] **25 — Parity & cleanup.** Verify route parity against AUDIT §2; **remove
  `legacy/`**.
