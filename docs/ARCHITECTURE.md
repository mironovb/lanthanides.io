# lanthanides.io — Target Architecture

> Companion to `docs/AUDIT.md` (inventory) and `docs/MIGRATION.md` (stack decision, data strategy, URL contract).
> This document fixes the **directory layout**, the **route map** (with the prompt that builds each route), the
> **TypeScript data contracts** (using the actual field names found in `_data/`), and the **feature module map** for
> the two-sided commercial direction. Later unattended sessions depend on these being concrete and consistent.

---

## 1. Directory layout

The Next.js app is added at the repo root. Reference data, element/article bodies, and the Python pipeline **stay in
place, unchanged** (`MIGRATION.md` §2). Jekyll's templating/build files migrate into `legacy/` as routes reach parity
and are deleted in prompt 25.

```
lanthanides.io/
├── app/                              # Next.js App Router — routes + route handlers
│   ├── layout.tsx                    # root shell: <head>/SEO, nav, footer, JSON-LD WebSite
│   ├── page.tsx                      # /  (home — crown-jewel-forward hero)
│   ├── not-found.tsx                 # 404
│   ├── (reference)/                  # route group — SSG/ISR open-data reference (no URL segment)
│   │   ├── elements/page.tsx         #   /elements           (merged directory + ledger)
│   │   ├── elements/[symbol]/page.tsx#   /elements/[symbol]   (31, case-sensitive)
│   │   ├── regulatory/page.tsx       #   /regulatory          (crown jewel)
│   │   ├── framework/page.tsx        #   /framework           (crown-jewel companion — preserve verbatim)
│   │   ├── movements/page.tsx        #   /movements
│   │   ├── dashboard/page.tsx        #   /dashboard
│   │   ├── methodology/page.tsx      #   /methodology
│   │   ├── sources/page.tsx          #   /sources
│   │   ├── about/page.tsx            #   /about
│   │   ├── news/page.tsx             #   /news
│   │   ├── news/[slug]/page.tsx      #   /news/[slug]         (5 articles)
│   │   └── data/page.tsx             #   /data                (open-data landing — NEW)
│   ├── (commercial)/                 # route group — dynamic / DB-backed (no URL segment)
│   │   ├── tools/price-gauge/page.tsx#   /tools/price-gauge   STUB
│   │   ├── sell/page.tsx             #   /sell                STUB (supply side)
│   │   ├── offers/page.tsx           #   /offers              STUB (demand side)
│   │   └── alerts/page.tsx           #   /alerts              STUB (alerts layer)
│   ├── api/                          # route handlers (server)
│   │   ├── price-gauge/route.ts      #   POST /api/price-gauge
│   │   ├── listings/route.ts         #   GET/POST /api/listings
│   │   ├── subscribe/route.ts        #   POST /api/subscribe
│   │   └── export/[format]/route.ts  #   GET /api/export/[format]  (json|csv)
│   ├── sitemap.ts                    # /sitemap.xml
│   ├── robots.ts                     # /robots.txt
│   ├── feed.xml/route.ts             # /feed.xml      (Atom — replaces jekyll-feed)
│   └── movements.xml/route.ts        # /movements.xml (custom Atom — port)
├── components/                       # React components (server-first)
│   ├── structured-data/              # JSON-LD emitters (WebSite+FAQPage, Product+Offer, Article, Breadcrumb)
│   ├── charts/                       # visualizations, rebuilt per AUDIT §3 (≤2-days ⇒ no line/no %move)
│   ├── price/                        # two-price cards, ledger table, movement panel, provenance table
│   ├── regulatory/                   # notice cards, announcement timeline, banner
│   ├── layout/                       # nav, footer, freshness badge, disclaimer
│   └── ui/                           # token-driven primitives
├── lib/
│   ├── data/                         # typed data-access layer over _data/ (build-time reads)
│   │   ├── elements.ts               #   element_catalog.yml + _elements/*.md bodies
│   │   ├── prices.ts                 #   price_records.json (canonical price store)
│   │   ├── price-history.ts          #   price_history/*.yml
│   │   ├── fluctuations.ts           #   fluctuations.json
│   │   ├── movements.ts              #   movements.yml
│   │   ├── regulatory.ts             #   regulatory/*.yml + policy_events.yml
│   │   ├── sources.ts                #   source_registry.yml + source_breakdown.yml
│   │   ├── articles.ts               #   _articles/*.md
│   │   ├── settings.ts               #   site_settings.yml
│   │   └── index.ts
│   ├── price-gauge.ts                # port of price-selection.html (retail_ref / bulk_ref selection)
│   ├── types.ts                      # the §3 data contracts (single source of schema truth)
│   ├── seo.ts                        # metadata + JSON-LD helpers
│   └── db.ts                         # Prisma client singleton
├── prisma/
│   ├── schema.prisma                 # Listing, Subscription, ScreenedOffer (provider: sqlite dev / postgres prod)
│   └── seed.ts                       # seeds ScreenedOffer (and demo Listings/Subscriptions)
├── _data/                            # UNCHANGED — versioned reference + provenance (MIGRATION §2.1)
├── _elements/                        # UNCHANGED — 31 element bodies (.md, read in place)
├── _articles/                        # UNCHANGED — 5 articles (.md, read in place)
├── scripts/                          # UNCHANGED — Python pipeline + regulatory-monitor
├── public/
│   └── assets/
│       ├── images/                   # favicons, og-default.png, logos, site.webmanifest (paths fixed)
│       └── data/                     # elements.json, fluctuations.json (open-data; generated at build)
├── docs/                             # AUDIT.md, MIGRATION.md, ARCHITECTURE.md
├── legacy/                           # quarantined Jekyll build files (deleted in prompt 25)
├── next.config.ts                    # trailingSlash: true; redirects (/prices → /elements); rewrites
├── tailwind.config.ts                # brand tokens (IBM Plex Sans/Mono + Source Serif 4)
├── tsconfig.json
└── package.json
```

**`content/` vs in-place `_elements`/`_articles` — decision: keep in place.** The `_elements/*.md` and `_articles/*.md`
files carry Jekyll-era front matter consumed by `scripts/` (`generate_element_data.py`, validators) and by the
contributor PR flow. Their bodies are HTML-rich markdown (tables, `<div>` blocks, footnote refs, `&thinsp;` entities).
A new `content/` directory is **not** introduced — moving 36 files would inflate the diff and risk the pipeline for no
benefit. The data layer (`lib/data/elements.ts`, `articles.ts`) reads them in place with `gray-matter` for front matter
and a markdown/HTML renderer for the body.

---

## 2. Route map

Rendering: **SSG** = statically generated from build-time `_data/` files; **ISR** = SSG + `revalidate` (refreshes when
file data or DB-backed enrichment changes without a full redeploy); **Dynamic** = server-rendered per request (DB);
**Handler** = route handler emitting XML/JSON/text. Prompt numbers follow `MIGRATION.md` §4 (the migration plan's
sequencing; forward-looking).

| Route | Rendering | Primary data | Built by | Old URL |
|:--|:--|:--|:--|:--|
| `/` | SSG | catalog, prices, regulatory, movements, articles | P6 | `/` |
| `/elements` | SSG | catalog + price_records | P6 | `/elements/` (+ `/prices/` 301→here) |
| `/elements/[symbol]` | SSG (`generateStaticParams`) | catalog, prices, price_history, fluctuations, regulatory, `_elements/*.md` | P6 | `/elements/<Symbol>/` |
| `/regulatory` | SSG | regulatory/*.yml, policy_events | P6 | `/regulatory/` |
| `/framework` ★ | SSG | static prose (`pages/framework.md` body) reconciled vs regulatory/*.yml | P6 | `/framework/` |
| `/methodology` | SSG | source_breakdown, site_settings | P6 | `/methodology/` |
| `/sources` | SSG | source_registry, site_settings | P6 | `/sources/` |
| `/about` | SSG | catalog, prices, sources, policy_events | P6 | `/about/` |
| `/news` | SSG | `_articles/*.md` | P6 | `/news/` |
| `/news/[slug]` | SSG (`generateStaticParams`) | `_articles/*.md` | P6 | `/news/<slug>/` |
| `/dashboard` | ISR | fluctuations, catalog (+ DB listing counts later) | P7 | `/dashboard/` |
| `/movements` | SSG | movements.yml | P7 | `/movements/` |
| `/data` | SSG | dataset metadata + export links | P7 | — (NEW) |
| `/tools/price-gauge` | Dynamic (client + API) | `lib/price-gauge.ts` over price_records | P8 | — (NEW) STUB |
| `/sell` | Dynamic | `Listing` (write) | P8 | — (NEW) STUB |
| `/offers` | ISR | `ScreenedOffer` (seeded) | P8 | — (NEW) STUB |
| `/alerts` | Dynamic | `Subscription` (write) | P8 | — (NEW) STUB |
| `/sitemap.xml` | Handler | all routes | P7 | `/sitemap.xml` |
| `/robots.txt` | Handler | — | P7 | `/robots.txt` |
| `/feed.xml` | Handler | articles | P7 | `/feed.xml` |
| `/movements.xml` | Handler | movements.yml | P7 | `/movements.xml` |
| `/api/price-gauge` | Handler (POST) | price_records via `lib/price-gauge.ts` | P8 | — (NEW) |
| `/api/listings` | Handler (GET/POST) | `Listing` | P8 | — (NEW) |
| `/api/subscribe` | Handler (POST) | `Subscription` | P8 | — (NEW) |
| `/api/export/[format]` | Handler (GET) | canonical dataset → json/csv | P8 | — (open-data export; `/assets/data/*.json` preserved separately) |

> ★ `/framework` is included per `AUDIT.md` §2/§5/§6 even though the prompt's enumerated list omitted it — see
> `MIGRATION.md` §3.1 note. Preserve its anchors (`#pricing`, `#us-side-tariff-stack-may-14-2026`).
> `/assets/data/elements.json` and `/assets/data/fluctuations.json` keep their exact URLs as build-generated static
> files in `public/` (`MIGRATION.md` §3.4); `/api/export/[format]` is the on-demand companion.

---

## 3. TypeScript data contracts

These live in `lib/types.ts` and are the single source of schema truth. **Field names match the actual data files
verbatim** (snake_case as authored). The data-access layer (`lib/data/*`) returns these types; validation runs at the
data-layer boundary so a malformed file fails the build loudly (e.g. the `La.yml` placeholder, `AUDIT.md` §4.4).

```ts
// ── Shared scalars ──────────────────────────────────────────────────────────
type ElementCategory =
  | 'rare_earth_light'
  | 'rare_earth_heavy'
  | 'strategic_metal'
  | 'semiconductor_metal';

type ExportControlStatus = 'restricted' | 'monitored' | 'normal';
type RegulatoryStatus    = 'active' | 'suspended' | 'none';
type MarketTier          = 'retail' | 'bulk' | 'lab';
type Confidence          = 'low' | 'medium' | 'high';
type Direction           = 'up' | 'down' | 'flat';
type WindowKey           = '7d' | '30d' | '90d' | '1y' | 'all_time';
type ISODate             = string; // 'YYYY-MM-DD'
type ISODateTime         = string; // RFC3339, e.g. '2026-03-26T00:00:00Z'

// ── Element  (from _data/element_catalog.yml) ────────────────────────────────
interface Element {
  symbol: string;                       // 'Dy' — case-sensitive; used in the URL
  name: string;                         // 'Dysprosium'
  atomic_number: number;                // 66
  category: ElementCategory;            // 'rare_earth_heavy'
  family: string;                       // 'Lanthanide', 'Transition metal', 'Metalloid', ...
  default_forms: string[];              // ['oxide','metal'] | ['metal','compound'] ...
  export_control_status: ExportControlStatus;
  regulatory_status: RegulatoryStatus;
  dominant_source_country: string;      // ISO-2, e.g. 'CN'
  origin_countries: string[];           // ['CN','US','AU']
  trade_form: string;                   // 'Oxide (Dy₂O₃)'
  notes: string;
  price_tier: number;                   // 1–4
  high_demand: boolean;
  cn_export_control: boolean;
  purity_range?: string;                // optional — '99.9%–99.99%' (present on some entries)
}

// ── PriceRecord  (from _data/price_records.json — 238 records) ───────────────
interface PriceRecord {
  id: string;                           // 'R-0001'
  element_symbol: string;               // 'La'  (FK → Element.symbol)
  element_name: string;                 // 'Lanthanum'
  invoice_ref: string | null;
  original_price_per_unit: number;
  original_currency: string;            // 'USD'
  original_unit: string;                // 'kg'
  normalized_usd_per_kg: number;
  exchange_rate_used: number;           // 1.0
  exchange_rate_date: ISODate;
  form: string;                         // 'oxide' | 'metal' | 'compound' | ...
  purity: string;                       // '99.9% (3N)'
  market_tier: MarketTier;
  moq_kg: number | null;
  quoted_quantity_kg: number | null;
  incoterm: string | null;              // 'DDP' | 'FOB' | ...
  taxes_included: boolean;
  shipping_included: boolean;
  source_type: string;                  // 'distributor_offer' | 'public_listing' | 'benchmark' | ...
  source_id: string;                    // FK → Source.id, OR free-text seller for non-registry sources
  source_url: string | null;
  seller_name: string;
  seller_country: string;               // ISO-2
  verification_status: string;          // 'single_source_offer' | 'corroborated' | 'verified_invoice' | ...
  confidence_score: number;             // 0..1
  notes: string | null;
  quote_date: ISODate;                  // newest drives the footer freshness badge
  ingestion_timestamp: ISODateTime;
}

// ── PriceHistory  (from _data/price_history/<Symbol>.yml — 285 observations) ──
interface PriceObservation {
  date: ISODate;
  tier: MarketTier;
  price_per_kg: number;
  currency: string;                     // 'USD'
  source: string;                       // Source.id | free-text seller | 'median_aggregate'
  source_type: string;                  // 'public_listing' | 'aggregate' | 'benchmark' | ...
  record_id?: string;                   // 'R-0036' — absent on aggregate rows
  form?: string;                        // 'oxide' | 'metal' | 'metal, oxide'
  purity?: string;
  seller?: string;                      // present on registry-source rows
  notes?: string;                       // present on median_aggregate rows
}
interface PriceHistory {
  symbol: string;
  observations: PriceObservation[];
}

// ── Fluctuation  (from _data/fluctuations.json — keyed by symbol) ────────────
interface LatestPrice {
  contributing_observations: number;
  currency: string;
  date: ISODate;
  form_summary: string;                 // 'metal' | 'metal, oxide'
  notes: string;
  price_per_kg: number;
  source_type: string;                  // e.g. 'median_aggregate'
  sources: string[];
}
interface FluctuationWindow {
  abs_change: number;
  actual_span_days: number;
  confidence: Confidence;
  confidence_note: string;
  direction: Direction;
  distinct_days_in_window: number;      // < 3 ⇒ render rule: no line / no %move (AUDIT §3)
  end_date: ISODate;
  end_price: number;
  observations_in_window: number;
  pct_change: number;
  start_date: ISODate;
  start_price: number;
  window_days: number | null;           // null for 'all_time'
}
interface TierFluctuation {
  distinct_days: number;
  observation_count: number;
  windows: Record<WindowKey, FluctuationWindow | null>;  // null when the window has no data
}
interface Fluctuation {                  // one per element (the per-symbol value in `elements`)
  data_quality: 'sparse' | 'moderate' | 'rich';   // the three values present in the data; mostly low given the 2-day corpus
  data_since: ISODate;
  data_until: ISODate;
  distinct_days: number;
  latest_bulk_price: LatestPrice | null;
  latest_lab_price: LatestPrice | null;
  latest_retail_price: LatestPrice | null;
  observation_count: number;
  tiers: Record<MarketTier, TierFluctuation>;       // keys: 'retail' | 'bulk' | 'lab'
}
interface FluctuationsFile {
  elements: Record<string, Fluctuation>;            // keyed by element symbol
}

// ── RegulatoryNotice  (from _data/regulatory/*.yml — 5 notices) ──────────────
// The shape is the union across the 5 notices; optional fields appear only where relevant.
interface ComplianceRequirement {
  required?: boolean;                   // on end_user_certificate
  duration_working_days?: number;       // on review_period (always 45 in current data)
  legal_basis: string;
  description: string;
}
interface NoticeSuspension {            // present on suspended notices (e.g. Nos. 55–62)
  suspended_by: string;
  suspension_ref: string;
  suspension_effective: ISODate;
  suspension_expires: ISODate;          // e.g. '2026-11-28'
  notes: string;
}
interface IndividualAnnouncement {      // heterogeneous: number is int (55) or string ('1/2026')
  number: number | string;
  scope: string;
  date_effective?: ISODate;             // present on Nos. 1/17 2026
  status?: string;                      // 'active' | 'suspended'
}
interface NoticeArticle {               // present on gac_46_2024 (Art. 1 / Art. 2)
  article: number;
  scope: string;
  status: string;
  description: string;
  suspended: boolean;
  suspension_notice?: string;
  suspension_expires?: ISODate;
}
interface SanctionedEntities {          // present on mofcom_1_17_2026
  count: number;
  designation: string;
  effect: string;
  note: string;
}
interface RegulatoryNotice {
  notice_id: string;                    // 'MOFCOM/GAC No. 18/2025'
  chinese_ref: string;                  // '商务部 海关总署公告2025年第18号'
  issuing_authority: string;            // 'MOFCOM/GAC' | 'MOFCOM'
  date_issued: ISODate;
  date_effective: ISODate;
  status: 'active' | 'suspended';
  affected_elements: string[];          // element symbols
  controlled_forms: string[];           // ['metal','alloy','oxide','compound', ...]
  measure_type: string;                 // 'export_licence_required' | 'presumptive_denial' | ...
  description: string;
  compliance_requirements: {
    end_user_certificate?: ComplianceRequirement;
    review_period?: ComplianceRequirement;
  };
  notes: string[];
  // optional / variant fields (present only on some notices):
  suspension?: NoticeSuspension;
  newly_controlled_elements?: string[]; // Nos. 55–62: [Ho, Er, Tm, Eu, Yb]
  individual_announcements?: IndividualAnnouncement[];
  articles?: NoticeArticle[];           // gac_46_2024
  related_notices?: string[];           // gac_46_2024
  target_country?: string;              // mofcom_1_17_2026: 'JP'
  sanctioned_entities?: SanctionedEntities; // mofcom_1_17_2026
}

// ── PolicyEvent  (from _data/policy_events.yml — 11 events) ──────────────────
type PolicyEventType =
  | 'export_control' | 'export_ban' | 'sanction' | 'suspension' | 'regulation';
interface PolicyEvent {
  id: string;                           // 'pe-2025-04-04'
  date: ISODate;
  title: string;
  description: string;
  affected_elements: string[];          // may be [] (e.g. EU CRMA, sanctions)
  affected_forms: string[];             // may be []
  event_type: PolicyEventType;
  source_country: string;               // 'CN' | 'EU'
  source_name: string;                  // 'MOFCOM/GAC Announcement No. 18 of 2025'
  source_url: string | null;
  notes: string;                        // includes the Chinese reference string
}

// ── Source  (from _data/source_registry.yml — 5 sources) ─────────────────────
type SourceType = 'distributor' | 'marketplace';
interface Source {
  id: string;                           // 'stanford-advanced-materials-01'
  name: string;                         // 'Stanford Advanced Materials'
  type: SourceType;
  trust_tier: number;                   // 1 (highest) .. 5
  country: string;                      // ISO-2
  supported_elements: string[];         // element symbols this source quotes
  parse_status: string;                 // 'active'
  review_status: string;                // 'reviewed'
}
```

> Supporting (non-required) contracts the data layer also exposes: `Movement` (from `movements.yml` events, incl. the
> `sparkline` geometry block), `SourceBreakdown` (from `source_breakdown.yml`), `SiteSettings` (from `site_settings.yml`),
> and `Article` (front matter of `_articles/*.md`: `title`, `subtitle?`, `description`, `keywords`, `date`, `status`,
> `elements: string[]`). These follow the same verbatim-field-name rule.

---

## 4. Feature module map (the two-sided commercial direction)

Where the commercial vision lives, and the hard line between what is **real** tonight and what is **STUB**. All three
modules are backed by the three Prisma models (`MIGRATION.md` §2.2); the reference data is never touched by them.

### 4.1 Demand side — offer-screening feed → `/offers`

- **Real tonight:** a seeded `ScreenedOffer` table (`prisma/seed.ts`) rendered as a feed at `/offers` (ISR). Reuses the
  regulatory/price data layer to annotate each offer (element, control status).
- **STUB boundary:** the *screening* and *ingestion* of real buy/sell offers (parsing, scoring, dedup) is not built —
  the table is seeded, not populated from live sources. The feed renders; the intake pipeline behind it is a later prompt.

### 4.2 Supply side — seller listing + price gauge → `/sell`, `/tools/price-gauge`

- **Real tonight:**
  - `lib/price-gauge.ts` — a typed port of the Jekyll `price-selection.html` logic (`retail_ref`: metal-preferred,
    5 g–1 kg, confidence ≥ 0.5, lowest; `bulk_ref`: most recent bulk/industrial, confidence ≥ 0.6) running over
    `price_records.json`. `/api/price-gauge` (POST) returns where a seller's quoted price sits vs the retail/bulk
    references for that element.
  - `/sell` captures a listing and writes a `Listing` row (via `/api/listings`).
- **STUB boundary:** moderation/approval, payments, contact reveal, and public display polish are not built. A listing
  is captured, stored, and acknowledged; it is **not** auto-published into the open dataset (that stays the reviewed
  git-PR flow).

### 4.3 Alerts layer — subscriptions → `/alerts`

- **Real tonight:** `/alerts` + `/api/subscribe` write a `Subscription` row (channel + destination). **Telegram now** —
  the regulatory-monitor already ships `scripts/notify/telegram.py` and fires on critical announcements (`AUDIT.md` §1.9),
  so the channel exists end-to-end.
- **STUB boundary:** **email next** — email delivery, double-opt-in, and per-element alert routing (wiring the
  `Subscription` table into the monitor's notify step) are not built tonight. The subscribe form captures and stores
  intent; delivery wiring is a later prompt.

### 4.4 Prisma models (sketch — finalized in prompt 8)

| Model | Key fields (indicative) | Notes |
|:--|:--|:--|
| `Listing` | `id`, `element_symbol`, `form`, `purity`, `price_per_kg`, `currency`, `quantity_kg`, `incoterm`, `seller_contact`, `status` (pending/screened/published), `created_at` | supply side; never auto-enters `_data/` |
| `Subscription` | `id`, `channel` (telegram/email), `destination`, `elements` (csv/relation), `events` (regulatory/price), `verified`, `created_at` | alerts layer; private, never published |
| `ScreenedOffer` | `id`, `element_symbol`, `side` (buy/sell), `price_per_kg`, `currency`, `quantity_kg`, `source`, `screened_score`, `status`, `created_at` | demand side; **seeded** tonight |

> `provider` in `schema.prisma` is `sqlite` for local/dev and `postgresql` for production — switched by environment, not
> by code (`MIGRATION.md` §1). The reference dataset stays in `_data/` files and is **never** mirrored into these tables.

---

## 5. Database: local SQLite → production Postgres

The three Prisma models (§4.4) are the only place dynamic, user-generated rows live. Local/dev runs on a SQLite file;
production runs on Postgres. The move is config-only — the schema is written to be portable so application code never
changes between engines.

**Same Prisma Client, two engines.** Every query path — route handlers, `lib/db.ts`, `prisma/seed.ts` — is
engine-agnostic and never branches on the database. The only environment-specific surface is the `datasource` block in
`schema.prisma` and the `DATABASE_URL` env var:

| | `provider` (in `schema.prisma`) | `DATABASE_URL` |
|:--|:--|:--|
| local / dev | `sqlite` | `file:./dev.db` (in `.env`, gitignored) |
| production | `postgresql` | `postgresql://…` (host secret store; never committed) |

Prisma requires `provider` to be a static literal — only `url` may use `env()`. So production flips the datasource
`provider` to `postgresql`; this is a **datasource-config** change, not an **application-code** change (models, queries,
and the seed are untouched). That is the precise meaning of `MIGRATION.md` §1's "switch by connection string, not by
code": no app/query code moves — only the datasource config and the secret.

**Portable by construction.** The schema deliberately avoids engine-specific constructs so the switch is clean:

- no native `enum` — `Listing.status`, `Subscription.channel`/`status`, `ScreenedOffer.origin` are documented enum-like
  `String`s;
- no scalar lists — `Subscription.topics` is a CSV `String` (a Postgres `text[]` has no SQLite equivalent);
- `@default(cuid())` ids — generated by the client, so Postgres needs no `pgcrypto`/`uuid-ossp` extension.

**Migrations are provider-specific; no data is committed.**

- **Committed:** `prisma/schema.prisma`, the `prisma/migrations/**` SQL + `migration_lock.toml`, and `prisma/seed.ts`.
- **Never committed:** the SQLite `*.db` file and any `.env` (both gitignored). No seeded or runtime row ever enters git —
  the demand-side feed is reproducible from the public `_data/` dataset via `npx prisma db seed` (idempotent: it
  clear-then-inserts only `origin: 'seed'` rows).
- The generated SQL is engine-specific and `migration_lock.toml` pins `provider = "sqlite"`. Production therefore
  regenerates its own Postgres baseline (point `DATABASE_URL` at a Postgres dev DB and run `npx prisma migrate dev`, or
  use `prisma migrate diff`) rather than replaying SQLite SQL against Postgres. The schema is the source of truth; the
  SQL is derived. `npx prisma db seed` then (re)builds the feed on Postgres with zero code changes.

---

*End of architecture. Read with `docs/AUDIT.md` (what exists) and `docs/MIGRATION.md` (why this stack, the URL contract,
the build-green sequencing). §2 is the route map every page prompt follows; §3 is the schema every data-layer prompt
implements; §4 is the boundary every commercial-stub prompt must respect; §5 is the SQLite→Postgres switch every
deployment follows.*
