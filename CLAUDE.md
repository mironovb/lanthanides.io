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
4. **No Jekyll dependency.** The Next build **never** imported from `legacy/`
   (the quarantined Jekyll layouts/includes/SCSS/pages/config/JS). `legacy/` was
   **removed in Prompt 25** after route-parity sign-off (with the two dead
   Jekyll-Liquid root sources `humans.txt` + `movements.xml`); the root
   `robots.txt` is retained per the P25 do-not-remove list but is not served (Next
   serves `/robots.txt` from `app/robots.ts`). Nothing in the app may reintroduce a
   Jekyll/Liquid build path.
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
docs/         AUDIT.md, MIGRATION.md, ARCHITECTURE.md, INVESTOR-WALKTHROUGH.md, …
              (legacy/ — the quarantined Jekyll tree — was removed in Prompt 25)
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
- [x] **8 — Commercial stubs & API.** **Prisma models (`Listing`,
  `Subscription`, `ScreenedOffer`) + seed: DONE** — the dynamic data model and the
  dataset-seeded `ScreenedOffer` feed (220 rows, `origin:"seed"`, SQLite dev /
  Postgres prod, ARCHITECTURE §5) landed early as the "Prompt 5" task in the local
  prompt sequence (which the checklist numbers as part of P8, not P5/Design).
  **`/api/export/[format]` DONE** (the "Prompt 8" task in the local prompt
  sequence): json/csv open-data export of the 238 price records from `lib/data`,
  CC BY 4.0 headers, both formats build-time static. **Price-gauge engine +
  `/api/price-gauge` DONE** (the "Prompt 18" task in the local prompt sequence):
  `lib/price-gauge.ts` gains `estimatePrice(input, records)` — a pure,
  side-effect-free estimator returning a robust **weighted interquartile range**
  (P25/P50/P75 of `normalized_usd_per_kg`, weighted by
  confidence×recency×purity-proximity so a lone tiny-quantity vial can't blow up
  the band), a **holistic confidence** (match count · seller diversity · recency ·
  form precision · price agreement; conservative — thin/dispersed ⇒ `low`), and a
  `basis` (matched records, distinct sellers, date range, method, record ids). It
  derives the retail (<25 kg) vs bulk tier band from quantity, **never merges
  bands**, widens form only when the exact form has **zero** records, and returns
  an explicit **"insufficient data"** result — never a fabricated price (hard rule
  #1) — on zero matches, with a "try the other tier" hint. A built-in
  `selfCheck(records)` asserts bounded/ordered ranges + the insufficient path.
  `app/api/price-gauge/route.ts` exposes it (GET query / POST JSON; 200 incl.
  insufficient, 404 unknown element, 400 unknown form/tier/quantity, CORS,
  `force-dynamic`/nodejs). **Price-gauge widget DONE** (the "Prompt 19" task in the
  local prompt sequence): SSR `/tools/price-gauge/` — pick element / form / purity /
  quantity (+unit) / optional tier override and get a transparent **low/mid/high
  USD/kg range**, a monochrome **confidence** grade, and a full **basis** disclosure
  (records matched, distinct sellers, quote-date span, method, observed min–max, and
  the contributing record ids → linked to the element's provenance table). The form is
  a plain `method="get"` island (`components/tools/PriceGaugeForm`) so the whole tool
  works **without JS** — the engine runs server-side over `searchParams` and the result
  is server-rendered; JS only narrows the Form select to the element's stocked forms. It
  calls `estimatePrice` directly (no client round-trip) and renders the engine's explicit
  **"insufficient data"** path — never a fabricated price (hard rule #1) — on zero
  matches, with an **"indicative only"** caveat on low-confidence / form-widened /
  multi-form results. A static observed-min–max bar places the IQR band + median marker
  on the real price axis (no trend line — the P10 gate doesn't apply to a one-value
  summary). New `components/tools/*` (`gauge.ts` pure parse/options helpers,
  `PriceGaugeForm`, `PriceGaugeResult`, `ConfidenceMeter`); metadata + WebApplication &
  BreadcrumbList JSON-LD; nav un-flags Price Gauge (`soon` removed) and the home Tools
  pillar links to it. **Seller listing + `/api/listings` DONE** (the "Prompt 20" task
  in the local prompt sequence): SSR `/sell/` — a seller submits a structured listing
  (element / form / purity / quantity-kg / asking price + currency / seller name /
  optional **private** contact + notes) and gets an **instant price-gauge response
  inline** — the same `estimatePrice` engine returns a low/mid/high USD/kg band +
  confidence + basis, and the asking price is positioned **below / in / above** that
  band (with the gap to the median). The submission persists to the Prisma `Listing`
  table via **POST `/api/listings`** with `status:'pending'` and a FROZEN gauge snapshot
  (`gaugeLow/Mid/High/Confidence`); inputs are validated server-side (shared
  `validateListing` — identical client + server rules), rejecting bad/empty/negative
  values with per-field errors (400). A server-rendered **listings table** on the page
  shows recent submissions (newest-first, every status; `router.refresh()` after submit)
  so the loop is visible end-to-end, labelled that publishing is a maintainer step —
  a `Listing` is never auto-published into the open dataset, and the private contact is
  **never** returned or rendered (`hasContact` boolean only). The asking-vs-range
  comparison is computed only for **USD** quotes (the dataset is USD-normalized and there
  is no live FX — hard rules #1/#3); other currencies are stored + shown verbatim with a
  note, and a zero-match request renders the engine's explicit **"insufficient data"**
  path (no fabricated price). Storage only — no email/payment/notification side effects
  (the "we'll review it" messaging is stubbed). New `lib/db.ts` (Prisma client singleton),
  `components/sell/*` (`sell.ts` pure helpers + `validateListing`/`positionAskingPrice`/
  `toListingDTO`, `SellForm` client island, `ListingGaugeResult`, `ListingsTable`);
  `GET /api/listings` lists published listings (status filter, contact-safe). `/sell` +
  `/api/listings` are `force-dynamic`/nodejs (live DB). Full metadata (no longer
  `noindex`) + WebApplication & BreadcrumbList JSON-LD; nav un-flags Sell/List (`soon`
  removed) and the home Tools pillar links to it. **Offer-screening feed +
  `lib/screening` DONE** (the "Prompt 21" task in the local prompt sequence): SSR
  `/offers/` — a dense, filterable, value-ranked feed of the seeded `ScreenedOffer`
  rows (element / form / purity / quantity / price-per-kg / seller / country / source
  type / observed date / confidence + a **value rank**). It reads the rows through
  `lib/screening`'s `screen()`, joins element metadata (name, category, **export-control
  status**) from `lib/data` to annotate each row, and renders the sortable table
  (`components/offers/OffersFeed` client island over the shared `SortableTable` +
  `FilterChips`) **sorted by value by default**. Filters — element, category, form,
  source type, and a medium+-confidence toggle — are instant client-side AND-filters over
  server-rendered rows (works without JS; SSR'd with all offers visible). Each row links to
  its element page (and to the source URL when present — none on seeded rows) and is tagged
  **seeded vs. screened** via `origin`; the value rank + confidence render **monochrome**
  (not a colour axis — only the category/regulatory annotation badges carry colour). A
  headline **honesty banner** (`OffersBanner`) states the feed is **seeded from the
  verified dataset** (220 rows) with live internet screening **in development** — no
  "scanned the web" theatre (hard rule #1), its status read from `SCREENING_BACKEND`. The
  **`lib/screening`** stub module exposes the intended pipeline interface — `ingest()`
  (STUB → `[]`, the only true gap), `normalize()` (real, pure; USD/kg only from a supplied
  FX table — never a guessed rate, hard rules #1/#3), `rank()`/`valueScore()` (real, pure;
  the **same same-form-median × confidence formula** `prisma/seed.ts` uses), and `screen()`
  (returns the seeded rows today) — so the wiring is legible to a reader. **`docs/OFFER-
  SCREENING.md`** specifies the live backend (target sources, ingest→normalize→verify→rank→
  dedup→**human-review checkpoint**→publish, reusing the Python pipeline in `scripts/` as the
  normalization foundation) and marks every STUB/TODO. Full metadata (no longer `noindex`) +
  Dataset & BreadcrumbList JSON-LD; nav un-flags Offer Feed (`soon` removed), the home Tools
  pillar links to it, and the vision page's demand-side card/roadmap move to **In progress**
  (live seeded feed, screening backend stubbed). New `lib/screening/index.ts`,
  `components/offers/*` (`offers.ts` pure DTO/helpers, `OffersBanner`, `OffersFeed`). `/offers`
  is `force-dynamic`/nodejs (live DB). **Notification signup + `/api/subscribe` DONE** (the
  "Prompt 22" task in the local prompt sequence): SSG `/alerts/` — the alerts layer's two
  channels, each honest about status. **Telegram (LIVE):** places the prompt-16
  `TelegramBadge` subscribe CTA to the MOFCOM alert bot (real link via
  `NEXT_PUBLIC_TELEGRAM_BOT_URL`, else routes back here with a maintainer note), plus a
  "what you get" panel — the regulatory monitor already dispatches these alerts.
  **Email (WAITLIST):** an accessible capture form (email + topic checkboxes
  regulatory / price-movements) POSTs to **`/api/subscribe`**, which validates server-side
  (shared `validateSubscription` — identical client + server rules), **dedupes by
  email+channel** (app-level; no migration), and persists a `Subscription` with
  `channel:'email'`, `status:'waitlist'`, topics CSV — returning the **contact-safe** DTO
  (`hasEmail` boolean; the address is never echoed). The confirmation states plainly that
  **email alerts are in development and nothing was sent** (hard rule #1); **no external
  calls, no email provider, no tracking** (hard rule #3) — and there is deliberately **no
  GET** (the subscriber list is private, never enumerated). Privacy note + the
  "regulatory now, price-movements next" vision framing tie it to `/about`. New
  `components/alerts/*` (`alerts.ts` pure helpers + `validateSubscription`/`parseTopics`/
  `serializeTopics`/`toSubscriptionDTO`, `EmailWaitlistForm` client island,
  `TelegramSubscribe`). `/api/subscribe` is `force-dynamic`/nodejs (live DB). Full
  metadata (no longer `noindex`) + WebApplication & BreadcrumbList JSON-LD; nav un-flags
  Alerts (`soon` removed, footer brand-band tag dropped), and the home pillar +
  regulatory page link here. (`NEXT_PUBLIC_TELEGRAM_BOT_URL` was already in `.env.example`
  from P16.)
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
- [x] **11 — Terminal-grade design system & base component library.** Formalized
  the Prompt 3 baseline into a documented system. Tokens (`tailwind.config.ts` +
  `app/globals.css`): kept the dark instrument-panel palette as **hex** (the
  `*-body.css` prose styles resolve them via PostCSS `theme()`, which can't expand
  the `<alpha-value>` placeholder that `/opacity` modifiers need — so CSS-variable
  tokens were rejected as a silent-regression risk), extended with the up/down/**flat**
  trio, the five regulatory states (resolved onto the 4-stop `risk` scale by `Badge`),
  a formalized type scale (+`md`), `caps`/`eyebrow` tracking, and `fast`/`base`
  durations; two house classes (`.eyebrow`, `.numeric`). Base library
  `components/ui/*` (barrel `index.ts`): `Table`/`SortableTable`+`useSortable`,
  `Card`/`Panel`, `Badge`/`Chip`, `Stat`/`StatGrid`, `Button`/`LinkButton`, `Tabs`,
  `FilterChips`, `Tooltip`, `Callout`, `Breadcrumbs`, `SectionHeading`, `cn` — server-
  first, keyboard-accessible, prop-driven. Layout shell `components/layout/*`:
  `SiteHeader` (sticky brand + `SiteNav` active/mobile island), `SiteFooter`
  (CC BY 4.0 + open-data + real contact), `Container`, shared `nav.ts`; wired into
  `app/layout.tsx` (flex-column body, skip-to-content). Full system in
  `docs/DESIGN-SYSTEM.md` incl. the dark↔light reconciliation. Page-by-page adoption
  is Prompt 12. `npm run build` green (51 routes).
- [x] **12 — Apply the design system across pages with responsive layout.**
  Page-by-page adoption: every ported page (`/`, `/elements` + detail,
  `/regulatory`, `/movements`, `/about`, `/methodology`, `/sources`, `/news` +
  article, `/data`) now composes from `components/layout/*` and `components/ui/*`
  instead of bespoke markup. New `components/layout/PageHeader` (breadcrumb +
  eyebrow + serif H1 + lead) standardizes every masthead onto `Container`;
  hand-rolled tables → `Table`/`SortableTable` primitives (Provenance,
  PriceHistory, PremiumLeaderboard, SourceBreakdown, the sources page); section
  titles → `SectionHeading`; element-page boxed sections → `Panel`; status tags →
  `Badge`; asides (key legal refs, disclaimer, licence) → `Callout`; coverage
  readouts → `Stat`/`StatGrid`; the regulatory element filter → the shared
  `FilterChips` (bespoke `ElementFilter` deleted); home CTAs → `LinkButton`.
  **Responsive:** mobile nav is a 44px-target toggle + full-width disclosure menu
  (≥44px links); every table sits in an `overflow-x-auto` scroll container; the
  element/periodic grids and panels reflow to one column on mobile; `Container`
  removes fixed widths. **Consistency:** one shared `lib/format.ts` is the single
  source of truth — `fmtUsdPrice` (USD `$` + thousands separators, null-safe "—")
  for every standalone price, and one `formatDate` ("Mon D, YYYY") for every
  editorial/feed surface (article cards, news + regulatory timelines, movements
  rows, reference cards, "last update"); dense data tables keep sortable ISO dates
  by design. `npm run build` green (51 routes); `npm run lint` clean; the P10
  chart gate still holds (0 `<polyline>` in built output).
- [x] **13 — Investment-grade landing page & value proposition.** Replaced the
  migration placeholder at `app/page.tsx` (`/`) with a focused above-the-fold
  (resolving AUDIT §4.6, the missing "what/who/why-now", and §4.5, the apologetic
  "sparse data" voice): a value-prop headline + audience subhead, a sober **Why
  now** panel (US–China decoupling + the live MOFCOM announcement count/controlled
  tally, no fabricated market-size figure), live **proof stats** via `Stat` (all
  from `lib/data`: elements, sourced records, sources, China-controlled,
  regulatory announcements), and primary CTAs. New `components/home/*`
  (`Hero`, `ProofStats`, `PillarCards`). Below the fold, a three-pillar product
  story (Data & Provenance → **Regulatory Intelligence** (crown jewel, AUDIT §6,
  led) → Tools & Marketplace). **Honesty:** the 238 records are labelled
  **"sourced"** not "verified" (only 27 hold a `verified` status) per hard rule #1;
  CTAs route only to surfaces that exist today (`/regulatory`, `/elements`,
  `/data`) — the not-yet-built price-gauge/alerts/marketplace tools are previewed
  as an **"In development"** pillar, never dead links (nav.ts keeps the stubs out
  until their prompt). Trust band surfaces per-price provenance, CC BY 4.0 open
  data, and the 6-hourly Telegram monitor (no fabricated bot link). Full metadata
  + OpenGraph/Twitter (`og-default.png` copied into `public/assets/images/`) and
  `WebSite`/`Organization` JSON-LD. `npm run build` green.
- [x] **14 — Product narrative, navigation & information architecture.** Tied the
  pages into one story. **Global IA** — `components/layout/nav.ts` is now a single
  *grouped* source of truth: four header menus — **Data** (Elements · Market
  Dashboard · Open Data), **Intelligence** (Regulatory Tracker · Market Movements ·
  News), **Tools** (Price Gauge · Sell/List · Offer Feed), **About** (About/Vision ·
  Methodology · Sources · Contribute on GitHub) — plus a standalone **Alerts** link.
  `SiteNav` rebuilt as accessible disclosure menus (open on hover/focus/click; close
  on mouse-leave/Escape/outside-click/focus-out; `aria-expanded`+`aria-controls`,
  active-group highlight) with a grouped, 44px-target mobile panel; the desktop menu
  links are JS-revealed, but the **footer mirrors the full IA server-side** so every
  destination stays crawlable / no-JS-reachable. Routes not built yet (Dashboard + the
  Tools/Alerts commercial layer, prompts 15–24) are flagged `soon` and link to a
  shared, labelled **`ComingSoon`** placeholder (`noindex`, "coming in this build",
  routes to live surfaces) — never a 404. **Footer** (`SiteFooter`) rebuilt onto the
  same IA: licence (CC BY 4.0 data · MIT code), open-data exports (JSON/CSV),
  contributor pipeline (GitHub), methodology/sources, the Telegram/email **Alerts**
  entry (no fabricated bot link → `/alerts`), and a **de-`.edu`'d contact**
  (`hello@lanthanides.io`, flagged `TODO(owner)` per AUDIT §4.1; also fixed on
  `/about`). **Connective tissue:** a new consistent `StoryLink` cross-link under every
  section masthead (Elements→Regulatory, Regulatory→Movements, Movements→News,
  News→Regulatory, Methodology→Elements, Sources→Elements, About→Regulatory/Elements,
  Data→Elements/Regulatory). **Breadcrumbs** normalised — the `/elements` crumb is now
  "Elements" (matching the detail page's parent crumb); every trail starts at Home. New:
  `components/layout/{StoryLink,ComingSoon}.tsx`, `app/{dashboard,tools/price-gauge,
  sell,offers,alerts}/page.tsx`. `npm run build` green (56 routes); `npm run lint` clean.
- [x] **15 — About / Vision page framing the commercial direction.** Reframed
  `/about/` (the §4.6 investor reframe) into two clearly separated parts. **Part 01
  "What this is today"** — the true description + the four principles + live coverage
  stats, kept as the factual spine; the 238 records are labelled **sourced**, not
  "verified" (only the live-computed **27** that carry a `verified` status are called
  verified — hard rule #1). **Part 02 "Where it's going"** — the investor-framed
  two-sided vision: demand-side offer-screening (→`/offers`), supply-side listing +
  price gauge (→`/sell`,`/tools/price-gauge`), and the alerts layer (Telegram now,
  email next →`/alerts`). A candid **staged roadmap** table maps each capability to
  **Now / In progress / Planned**, explicitly labels the two stubs (offer-screening
  backend, email notifications), and links every row to its live entry point; a
  truthful **why now / why this** note names the defensible asset (the only
  source-cited English-language MOFCOM tracker + a provenance-first dataset) with no
  fabricated traction/revenue/partnerships. Full metadata + OpenGraph + Organization
  & BreadcrumbList JSON-LD. **`/vision` 301→`/about/`** (next.config.mjs; recorded in
  MIGRATION §3.1). Composed from `components/ui/*` (local `PartHeader` + roadmap data
  only); single file touched is `app/about/page.tsx`. `npm run build` green (56
  routes); `npm run lint` clean.
- [x] **16 — Trust signals: provenance, methodology, contributor pipeline, live
  bot.** Made credibility legible site-wide via a reusable, server-first
  `components/trust/*` set (composing the P11 primitives; barrel `index.ts`).
  **`ProvenanceBadge`** — per-record source type + verification status + a
  **monochrome** confidence meter (band from the methodology thresholds; colour
  deliberately kept off the data axis per the design system) — dropped onto both
  headline `ReferencePriceCard`s so verification & confidence travel with every
  price (the full per-record `ProvenanceTable` already lists all 238).
  **`SourceBreakdownPanel`** — the `source_breakdown.yml` intake mix as a compact
  bar-in-panel that shows the 0-count paths too (community/supplier/invoice),
  reused on home, dashboard, and `/contribute`. **`MethodologyCallout`**
  (`panel`/`inline`) — the "how we verify" signpost deep-linking
  `#display-price`, `#verification-and-confidence`, `#provenance-chain` — under
  the element price cards and on home/dashboard. **`TelegramBadge`**
  (`inline`/`panel`) — marks the MOFCOM monitor's Telegram alerting **LIVE** on
  home/regulatory/alerts, reading `NEXT_PUBLIC_TELEGRAM_BOT_URL` (placeholder +
  `TODO(owner)` in `.env.example`) and routing to `/alerts/` rather than shipping
  a guessed bot link (**0** `t.me` links in built output, verified). New
  **`/contribute`** page + **`ContributePanel`** — the double-human-review intake
  (issue → `approved` label → manual-dispatch PR → merge) framed as a credibility
  feature, linking the live issue templates + CONTRIBUTING. `ComingSoon` gains an
  `extra` slot so the dashboard/alerts placeholders carry genuinely-live trust
  panels. Footer adds a direct open-data/CC BY 4.0 route to `/data`; nav adds
  `/contribute` (About) and relabels the repo link "GitHub Repository". Every
  claim is checkable; no audits/certifications/partnerships implied. New:
  `components/trust/*`, `app/contribute/page.tsx`. `npm run build` green (57
  routes); `npm run lint` clean.
- [x] **17 — Clean market overview dashboard.** Rebuilt `/dashboard/` from the
  Prompt 14 `ComingSoon` placeholder into a dense, terminal-grade market overview,
  porting only the credible panels from `legacy/pages/dashboard.html` and
  **dropping the "30-day movers" board** (its 2-distinct-day windows produce
  oxide→metal artefacts, not real moves — docs/VISUALIZATION-AUDIT.md §2; a footer
  note routes "biggest moves" to the factual `/movements` feed instead). Three
  panels, each derived live from `lib/data` and stating its own sample size: a
  **regulatory snapshot** (`components/dashboard/RegulatorySnapshot` — element
  counts by export-control posture restricted/monitored/unrestricted and
  regulatory state active/suspended/clear, every tile linking into the crown-jewel
  `/regulatory` tracker, colour reusing the semantic risk scale via `Badge`); the
  sortable **retail-premium leaderboard** (`PremiumLeaderboard`, reused from
  `/data`, with a new opt-in `flagInverse` marking <1× cases where retail undercuts
  bulk; states "N of 31 priced in both tiers"); and the **data-coverage map**
  (`CoverageGrid`, reused). The header carries a "data as of" stamp from
  `fluctuations.json` `generated_at` (new `getDataGeneratedAt()`), a Methodology
  link, and the honest "every figure is derived from the data" framing; a
  `StoryLink` + the per-section deep-links wire the page into `/regulatory`,
  `/movements`, `/elements`, and `/data`. New data accessors `getRegulatorySnapshot()`
  + `getDataGeneratedAt()` (+ `RegulatorySnapshot` type). **SSG, not ISR** — the
  data layer memoises `_data/` per process (`lib/data/load.ts`), so the page
  refreshes on the pipeline-triggered rebuild like every other reference surface;
  an ISR `revalidate` would only re-render against the same cached snapshot, so it
  is deliberately omitted. Full metadata + OpenGraph + BreadcrumbList JSON-LD;
  `noindex` dropped now it is a real page; the dashboard nav item un-flagged
  `soon`. New: `app/dashboard/page.tsx`, `components/dashboard/RegulatorySnapshot.tsx`.
  `npm run build` green.
- [ ] **18–22 — Polish & rebuilds** (MIGRATION §4): content/positioning
  (remaining §4.5–§4.6 surfaces) and remaining page polish. (The §4.8 PWA/manifest
  fix — `/periodicpricing/…` → `/assets/images/…` + brand colors — was completed in
  **Prompt 24** alongside moving the favicons/manifest into `public/`.)
- [x] **23 — Production-grade performance, accessibility & mobile.** Full audit +
  evidence in **`docs/QA.md`** (rigorous manual review + computed WCAG contrast
  ratios + built-output inspection; **no** Lighthouse/axe score fabricated —
  neither is installed in this repo). **Performance:** fonts self-hosted via
  `next/font/google` (subset `latin`, `display:swap`, auto size-adjusted fallback
  metrics ⇒ no CLS) — the render-blocking Google `<link>` + two `preconnect`s +
  the runtime third-party request are gone (**0** `googleapis`/`gstatic` refs in
  built HTML; 27 subsetted woff2 self-served + preloaded same-origin); the two
  *rendered* news images (card thumb + article hero) moved to `next/image`
  (`width`/`height`/`sizes`, lazy by default, hero `priority` as the LCP) ⇒
  responsive `srcset`, no layout shift (`og-default` refs are OG meta and the
  header "logo" is a CSS square — neither is a rendered `<img>`). Client JS already
  minimal (87.3 kB shared, reference pages ~101 kB, server-first) and SSG/ISR
  confirmed static; no dead chart code (every chart imported; P10 gate holds —
  0 `<polyline>`); removed the `:root` font vars. **Accessibility (WCAG AA):** the
  **sortable table header was mouse-only** — rebuilt as a nested `<button>`
  (Enter/Space + focus ring; `aria-sort` stays on `<th>`), the key 2.1.1 fix;
  contrast brought to AA — `fg-dim` `#6b7178→#828993` (every `<TH>`/eyebrow/caption
  was 3.4–4.0:1, now 4.8–5.5:1) and a new `border-field` `#606b7b` (≥3:1, WCAG
  1.4.11) on all form controls (was 1.7:1); `prefers-reduced-motion` honoured
  globally; skip-link target made focusable (`tabIndex=-1`); verified **1 `<main>`
  + 1 `<h1>` per page**, logical heading order (`PageHeader`→h1,
  `SectionHeading`→h2/h3), and no colour-only meaning
  (badge labels / movement sign / coverage counts / confidence label all carry
  text). **Mobile:** every breakpoint re-verified — tables scroll in
  `overflow-x-auto`, forms + CTAs stack and clear the 24px AA target minimum,
  dashboard panels reflow to one column (the dense element grid stays 2-up by
  design — verified no overflow at 320px). New `docs/QA.md`; touched
  `tailwind.config.ts`, `app/{layout.tsx,globals.css}`, `components/ui/Table.tsx`,
  the two news image components, and the three form islands. `npm run build` green
  (57 routes); `npm run lint` clean.
- [x] **24 — SEO, structured data & URL preservation.** Full parity-plus sweep
  (evidence in `docs/SEO.md`). **Metadata:** new `lib/seo.ts` `buildMetadata()`
  centralises the legacy `head.html` contract — every route now ships complete,
  self-referential title/description/keywords/canonical + Open Graph + Twitter +
  Atom feed alternates (verified in built HTML: a page's og:title/og:url/canonical
  reflect the page, not a layout default — which is why every route builds its own
  OG rather than inheriting one). Root `layout.tsx` gained `icons`, `manifest`,
  `robots` directives (`max-image-preview:large` …), `authors`→`/humans.txt`,
  baseline OG/Twitter, and `viewport.themeColor` (`#1A5C6B`). **Structured data** as
  `components/seo/*` (server-first, one escaped `<script>` renderer) — the four
  legacy includes: `SiteJsonLd` (WebSite+Organization, site-wide) · `FaqJsonLd`
  (home, ported verbatim with live counts) · `BreadcrumbJsonLd` (every
  section/detail page) · `ArticleJsonLd` (`/news/[slug]`) · `ElementJsonLd`
  (Product+Offer[] on `/elements/[symbol]`) — plus a new `DatasetJsonLd` (`/data`
  with JSON/CSV/fluctuations `DataDownload`; `/regulatory`; `/offers`) and
  `WebApplicationJsonLd` (`/tools/price-gauge`, `/sell`, `/alerts`); the per-page
  inline `<script>` blocks were refactored onto these (de-duping the now-site-wide
  Organization). **URL preservation:** every AUDIT §2 permalink resolves or 301s —
  the one structural gap, the **unbuilt `/framework/` route**, was ported verbatim
  (markdown relocated to `app/framework/framework.md`, Liquid resolved, `#pricing`
  + `#us-side-tariff-stack-may-14-2026` anchors preserved, re-linked in the
  Intelligence nav after Regulatory); and `/humans.txt` +
  `/assets/images/site.webmanifest` + the favicons were moved into `public/` (the
  manifest §4.8-fixed: `/periodicpricing/…`→`/assets/images/…`, brand colors).
  **Sitemap/robots/feeds:** `app/sitemap.ts` (52 URLs incl. all 31 elements + 5
  articles, real `lastmod`), `app/robots.ts` (Allow `/`, Disallow `/api/`,
  sitemap+host), and a populated **`app/feed.xml`** news Atom feed (the legacy
  jekyll-feed shipped empty — no `_posts`; now sourced from the 5 `_articles`).
  `CNAME` intact. Default + per-article OG images resolve; dynamic per-route OG
  considered and deferred (offline-build risk, optional). New: `lib/seo.ts`,
  `components/seo/*`, `app/{sitemap.ts,robots.ts,feed.xml/route.ts}`,
  `app/framework/*`, `docs/SEO.md`, `public/{humans.txt,assets/images/*}`.
  `npm run build` green (61 routes); `npm run lint` clean.
- [x] **25 — Parity & cleanup.** Final investor-readiness sweep. **Route parity
  verified against AUDIT §2 / MIGRATION §3 from the built output** before any
  deletion: all 31 case-sensitive `/elements/<Sym>/`, all 5 `/news/<slug>/`, every
  top-level page, the `/sitemap.xml` · `/feed.xml` · `/movements.xml` ·
  `/robots.txt` handlers, the `public/` statics (`humans.txt`,
  `assets/data/fluctuations.json`, `assets/images/site.webmanifest`, favicons +
  `og-default.png`), and the three 301s (`/prices`→`/elements/`,
  `/vision`→`/about/`, `/assets/data/elements.json`→`/api/export/json/`); the four
  preserved `/methodology` anchors + the two `/framework` anchors confirmed in the
  built HTML; an internal-link check over built HTML returned **0 dangling links**.
  Only then: **`legacy/` removed** (the whole quarantined Jekyll tree, incl. the
  old `assets/css/main.scss` + `assets/js/*` charts), plus the two dead
  Jekyll-Liquid root sources superseded by Next equivalents — `humans.txt`
  (→ `public/humans.txt`) and `movements.xml` (→ `app/movements.xml/route.ts`).
  Root `robots.txt` **retained** per the do-not-remove constraint (vestigial Liquid
  source, not served; `/robots.txt` comes from `app/robots.ts`) — recorded in
  `docs/QA.md` §6. Scratch dumps (`chat.md`, `combined*.txt`) + stale Jekyll output
  (`_site/`, `.jekyll-cache/`) cleared from the working tree; `.gitignore` already
  excludes them and `node_modules`/`.next`/`*.db`/`.env`/`prompts`/`logs`/
  `run-all.sh`; **no secrets tracked**. **README** repositioned as a venture product
  (what/who/why-now, stack + hybrid-data architecture, dev setup, data model +
  open-data export, deployment incl. SQLite→Postgres + env vars, a live-vs-stubbed
  table, CC BY 4.0 / MIT). New **`docs/INVESTOR-WALKTHROUGH.md`** — the Regulatory →
  Elements/provenance → Dashboard → Price Gauge → Sell → Offers → Alerts
  click-through, the defensible-asset framing, and a candid stage/roadmap. Tidy:
  stale `.edu` contact → `hello@lanthanides.io` in `CONTRIBUTING.md`; dropped the
  now-dead `legacy/` entry from the ESLint ignore list. `npm run build` green
  (61 routes); `npm run lint` clean. **Migration complete.**
