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
├── app/                              # Next.js App Router — routes + route handlers (flat; segment === URL)
│   ├── layout.tsx                    # root shell: <head>/SEO, nav, footer, site-wide JSON-LD (WebSite+Organization)
│   ├── page.tsx                      # /                     (home — crown-jewel-forward hero)
│   ├── not-found.tsx                 # 404                   (replaces Jekyll 404.html)
│   ├── elements/page.tsx             # /elements             (merged directory + ledger; /prices 301→here)
│   ├── elements/[symbol]/page.tsx    # /elements/[symbol]    (31, case-sensitive; generateStaticParams)
│   ├── regulatory/page.tsx           # /regulatory           (crown jewel)
│   ├── framework/page.tsx            # /framework            (crown-jewel companion — preserve verbatim) ★
│   ├── movements/page.tsx            # /movements
│   ├── dashboard/page.tsx            # /dashboard
│   ├── methodology/page.tsx          # /methodology          (preserve #-anchors)
│   ├── sources/page.tsx              # /sources
│   ├── about/page.tsx                # /about                (reframed About/Vision; /vision 301→here)
│   ├── news/page.tsx                 # /news
│   ├── news/[slug]/page.tsx          # /news/[slug]          (5 articles; generateStaticParams)
│   ├── data/page.tsx                 # /data                 (open-data landing — NEW)
│   ├── tools/price-gauge/page.tsx    # /tools/price-gauge    STUB (supply side)
│   ├── sell/page.tsx                 # /sell                 STUB (supply side)
│   ├── offers/page.tsx               # /offers               STUB (demand side)
│   ├── alerts/page.tsx               # /alerts               STUB (alerts layer)
│   ├── api/                          # route handlers (server)
│   │   ├── price-gauge/route.ts      #   POST /api/price-gauge
│   │   ├── listings/route.ts         #   GET/POST /api/listings
│   │   ├── subscribe/route.ts        #   POST /api/subscribe
│   │   └── export/[format]/route.ts  #   GET /api/export/[format]   (json|csv)
│   ├── sitemap.ts                    # /sitemap.xml
│   ├── robots.ts                     # /robots.txt
│   ├── feed.xml/route.ts             # /feed.xml      (Atom — replaces jekyll-feed)
│   └── movements.xml/route.ts        # /movements.xml (custom Atom — port)
├── components/                       # React components (server-first); the set grows as each prompt lands its pages
│   ├── layout/                       # nav, footer, freshness badge, disclaimer, page header
│   ├── seo/                          # JSON-LD emitters (WebSite+FAQPage, Product+Offer[], Article, BreadcrumbList, Dataset)
│   ├── charts/                       # visualizations, rebuilt per AUDIT §3 (≤2 distinct days ⇒ no line / no %move)
│   ├── elements/                     # two-price cards, sortable provenance table, movement + price-history tables
│   ├── regulatory/                   # notice cards, announcement timeline, element filter, banner
│   ├── ui/                           # token-driven primitives (Table/SortableTable, Card, Badge, Stat, Button, …)
│   └── …                             # home/, news/, movements/, dashboard/, content/, tools/, sell/, offers/, alerts/, trust/ (each added by its prompt)
├── lib/
│   ├── data/                         # typed data-access layer over _data/ (build-time reads, process-memoised)
│   │   ├── types.ts                  #   the §3 data contracts (schema source of truth)
│   │   ├── load.ts                   #   raw file readers (yaml / json / gray-matter)
│   │   ├── index.ts                  #   typed accessors (getElements, getPriceRecords, getRegulatoryNotices, …)
│   │   └── verify.ts                 #   build-time validation: a malformed file (e.g. the La.yml placeholder, §4.4) fails the build
│   ├── types.ts                      # public re-export of lib/data/types.ts (the import surface for pages/components)
│   ├── price-gauge.ts                # port of price-selection.html (retail_ref / bulk_ref selection)
│   ├── seo.ts                        # metadata builder + JSON-LD helpers
│   └── db.ts                         # Prisma client singleton (commercial layer only)
├── prisma/
│   ├── schema.prisma                 # Listing, Subscription, ScreenedOffer, Discussion* (provider: postgres)
│   └── seed.ts                       # seeds ScreenedOffer from the public dataset (idempotent; origin:'seed')
├── _data/                            # UNCHANGED — versioned reference + provenance (MIGRATION §2.1)
├── _elements/                        # UNCHANGED — 31 element bodies (.md, read in place)
├── _articles/                        # UNCHANGED — 5 articles (.md, read in place)
├── scripts/                          # UNCHANGED — Python pipeline; regulatory monitor script is manual/paused
├── public/
│   └── assets/
│       ├── images/                   # favicons, og-default.png, logos, site.webmanifest (paths fixed, §4.8)
│       └── data/                     # fluctuations.json (open-data export — exact URL preserved; MIGRATION §3.4.1)
├── docs/                             # AUDIT.md, MIGRATION.md, ARCHITECTURE.md
├── legacy/                           # quarantined Jekyll build files (never imported by the Next build; deleted in prompt 25)
├── next.config.mjs                   # trailingSlash: true; redirects (/prices→/elements, /vision→/about, elements.json→export)
├── tailwind.config.ts                # brand tokens (IBM Plex Sans/Mono + Source Serif 4)
├── tsconfig.json
└── package.json
```

> **Routes are flat, not grouped.** Each `app/<segment>/page.tsx` maps 1:1 onto its URL — no `(group)` route groups —
> so the file tree reads as the URL contract (`MIGRATION.md` §3). The reference (SSG/ISR) vs commercial (dynamic/DB)
> split is a *rendering* distinction (per-route `dynamic`/`revalidate` exports + the route map below), not a directory one.

**`content/` vs in-place `_elements`/`_articles` — decision: keep in place.** The `_elements/*.md` and `_articles/*.md`
files carry Jekyll-era front matter consumed by `scripts/` (`generate_element_data.py`, validators) and by the
contributor PR flow. Their bodies are HTML-rich markdown (tables, `<div>` blocks, footnote refs, `&thinsp;` entities).
A new `content/` directory is **not** introduced — moving 36 files would inflate the diff and risk the pipeline for no
benefit. The data layer (`lib/data`) reads them in place with `gray-matter` for front matter and a markdown/HTML
renderer for the body.

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
| `/dashboard` | SSG | fluctuations, catalog (DB discussion panel is a client island over `/api/dashboard/discussion`, so the page stays SSG / DB-free) | P7 | `/dashboard/` |
| `/movements` | SSG | movements.yml | P7 | `/movements/` |
| `/data` | SSG | dataset metadata + export links | P7 | — (NEW) |
| `/tools/price-gauge` | Dynamic (client + API) | `lib/price-gauge.ts` over price_records | P8 | — (NEW) STUB |
| `/sell` | Dynamic | `Listing` (write) | P8 | — (NEW) STUB |
| `/offers` | ISR | `ScreenedOffer` (seeded) | P8 | — (NEW) STUB |
| `/alerts` | Dynamic | `Subscription` (write) | P8 | — (NEW) STUB |
| `/discussion` | Dynamic | `DiscussionThread` + visible reply count | post-P25 | — (NEW) |
| `/discussion/[id]` | Dynamic | `DiscussionThread` + visible `DiscussionReply` rows | post-P25 | — (NEW) |
| `/sitemap.xml` | Handler | all routes | P7 | `/sitemap.xml` |
| `/robots.txt` | Handler | — | P7 | `/robots.txt` |
| `/feed.xml` | Handler | articles | P7 | `/feed.xml` |
| `/movements.xml` | Handler | movements.yml | P7 | `/movements.xml` |
| `/api/price-gauge` | Handler (POST) | price_records via `lib/price-gauge.ts` | P8 | — (NEW) |
| `/api/listings` | Handler (GET/POST) | `Listing` | P8 | — (NEW) |
| `/api/subscribe` | Handler (POST) | `Subscription` | P8 | — (NEW) |
| `/api/discussion/threads` | Handler (POST) | `DiscussionThread` | post-P25 | — (NEW) |
| `/api/discussion/threads/[id]/replies` | Handler (POST) | `DiscussionReply` | post-P25 | — (NEW) |
| `/api/export/[format]` | Handler (GET) | canonical dataset → json/csv | P8 | — (open-data export; `/assets/data/*.json` preserved separately) |

> ★ `/framework` is included per `AUDIT.md` §2/§5/§6 even though the prompt's enumerated list omitted it — see
> `MIGRATION.md` §3.1 note. Preserve its anchors (`#pricing`, `#us-side-tariff-stack-may-14-2026`).
> The two legacy open-data URLs are handled per `MIGRATION.md` §3.4.1: `/assets/data/fluctuations.json` keeps its exact
> URL as a static file in `public/`, while `/assets/data/elements.json` **301s → `/api/export/json/`** (the canonical,
> always-fresh export; the legacy file was a Jekyll template feeding the retired ledger JS, not a committed static file).

---

## 3. TypeScript data contracts

These live in `lib/data/types.ts` (re-exported from `lib/types.ts`) and are the single source of schema truth. **Field
names match the actual data files verbatim** (snake_case as authored). The data-access layer (`lib/data/*`) returns
these types; validation runs at the data-layer boundary so a malformed file fails the build loudly (e.g. the `La.yml`
placeholder, `AUDIT.md` §4.4).

> **Two distinct tier vocabularies — do not conflate them.** `price_records.json.market_tier` is
> `retail | bulk | wholesale` (no `lab`); the time-series/aggregation axis (`price_history.tier`,
> `fluctuations.tiers` keys, the `latest_*_price` blocks) is `retail | bulk | lab` (no `wholesale`). They are modelled
> as two separate types (`MarketTier` and `PriceTier`).

```ts
// ── Shared scalars ──────────────────────────────────────────────────────────
type ElementCategory =
  | 'rare_earth_light'
  | 'rare_earth_heavy'
  | 'strategic_metal'
  | 'semiconductor_metal';

type ExportControlStatus = 'restricted' | 'monitored' | 'normal';
type RegulatoryStatus    = 'active' | 'suspended' | 'none';
type MarketTier          = 'retail' | 'bulk' | 'wholesale'; // price_records.json `market_tier`
type PriceTier           = 'retail' | 'bulk' | 'lab';       // price_history `tier` + fluctuations `tiers` keys
type Confidence          = 'low' | 'medium' | 'high';
type Direction           = 'up' | 'down' | 'flat';
type WindowKey           = '7d' | '30d' | '90d' | '1y' | 'all_time';
type ISODate             = string; // 'YYYY-MM-DD'
type ISODateTime         = string; // RFC3339, e.g. '2026-03-26T00:00:00Z'

// ── Element  (from _data/element_catalog.yml — a flat list of 31) ────────────
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
  purity_range?: string;                // optional — '99.9%–99.99%' (present on 11 of 31 entries)
}

// ── PriceRecord  (from _data/price_records.json — 238 records, a flat array) ──
// Always present & non-null: id, element_symbol, element_name, normalized_usd_per_kg, form,
// market_tier, quoted_quantity_kg, source_type, seller_name, verification_status,
// confidence_score, quote_date. Everything below the divider is nullable in the current corpus.
interface PriceRecord {
  id: string;                           // 'R-0001'
  element_symbol: string;               // 'La'  (FK → Element.symbol)
  element_name: string;                 // 'Lanthanum'
  normalized_usd_per_kg: number;        // the canonical display price (the single price the site renders)
  form: string;                         // 'oxide' | 'metal' | 'powder' | 'alloy' | 'compound'
  market_tier: MarketTier;              // 'retail' | 'bulk' | 'wholesale'  (NB: never 'lab')
  quoted_quantity_kg: number;           // quantity the quote is for
  source_type: string;                  // 13 values, e.g. 'distributor_offer' | 'marketplace_listing' | 'benchmark' | 'lab_supplier' | 'market_index'
  seller_name: string;                  // 'Stanford Advanced Materials'
  verification_status: string;          // 10 values, e.g. 'verified' | 'corroborated' | 'cross_referenced' | 'single_source_offer' | 'benchmark_linked'
  confidence_score: number;             // 0..1
  quote_date: ISODate;                  // newest drives the footer freshness badge
  // ── nullable in the current corpus ──
  invoice_ref: string | null;           // null on every current record
  original_price_per_unit: number | null;
  original_currency: string | null;     // 'USD'
  original_unit: string | null;         // 'kg'
  exchange_rate_used: number | null;    // 1.0
  exchange_rate_date: ISODate | null;
  purity: string | null;                // '99.9% (3N)'
  moq_kg: number | null;
  incoterm: string | null;              // 'DDP' | 'FOB' | 'CIF' | 'CIP' | 'EXW' | 'Domestic' | ...
  taxes_included: boolean | null;
  shipping_included: boolean | null;
  source_id: string | null;             // FK → Source.id when the seller is a registry source, else null
  source_url: string | null;            // null on every current record
  seller_country: string | null;        // ISO-2
  notes: string | null;
  ingestion_timestamp: ISODateTime | null;
}

// ── PriceHistory  (from _data/price_history/<Symbol>.yml — 31 files / 285 observations) ──
interface PriceObservation {
  date: ISODate;
  tier: PriceTier;                      // 'retail' | 'bulk' | 'lab'
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
  data_quality: 'sparse' | 'moderate' | 'rich';   // current corpus carries only 'sparse'/'moderate' (the 2-day corpus, AUDIT §3)
  data_since: ISODate;
  data_until: ISODate;
  distinct_days: number;
  latest_retail_price: LatestPrice | null;
  latest_bulk_price: LatestPrice | null;
  latest_lab_price: LatestPrice | null;
  observation_count: number;
  tiers: Record<PriceTier, TierFluctuation>;        // keys: 'retail' | 'bulk' | 'lab'
}
interface FluctuationsFile {
  elements: Record<string, Fluctuation>;            // keyed by element symbol (31)
  windows: WindowKey[];                             // ['7d','30d','90d','1y','all_time']
  flat_threshold_pct: number;                       // 1.0 — |pct_change| below this reads as 'flat'
  generated_at: ISODateTime;                        // pipeline stamp; drives the dashboard "data as of"
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
  measure_type: string;                 // 'export_licence_required' | 'presumptive_denial' | 'export_licence_suspension_and_escalation' | 'country_prohibition_and_entity_sanctions'
  description: string;
  compliance_requirements: {
    end_user_certificate?: ComplianceRequirement;
    review_period?: ComplianceRequirement;
  };
  notes: string[];
  // optional / variant fields (present only on some notices):
  suspension?: NoticeSuspension;        // mofcom_55_62_2025
  newly_controlled_elements?: string[]; // mofcom_55_62_2025: [Ho, Er, Tm, Eu, Yb]
  individual_announcements?: IndividualAnnouncement[]; // mofcom_55_62_2025, mofcom_1_17_2026
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
  trust_tier: number;                   // 1 (highest)..5 scale (site_settings); current registry uses tiers 2–3
  country: string;                      // ISO-2
  supported_elements: string[];         // element symbols this source quotes
  parse_status: string;                 // 'active'
  review_status: string;                // 'reviewed'
}
```

> Supporting (non-required) contracts the data layer also exposes: `Movement` (from `movements.yml` events, incl. the
> `sparkline` geometry block), `SourceBreakdown` (from `source_breakdown.yml`: `generated_on`, `total_observations`
> (285), and `by_source_type[]` of `{ source_type, label, description, count, percent }`), `SiteSettings` (from
> `site_settings.yml`: thresholds + the `verification_labels` / `source_trust_tiers` (1–5) / `category_labels` /
> `export_control_labels` maps), and `Article` (front matter of `_articles/*.md`: `title`, `subtitle?`, `description`,
> `keywords`, `date`, `status`, `elements: string[]`). These follow the same verbatim-field-name rule.

---

## 4. Feature module map (the two-sided commercial direction)

Where the commercial vision lives, and the hard line between what is **real** tonight and what is **STUB**. These
app surfaces are backed by Prisma models (`MIGRATION.md` §2.2); the reference data is never touched by them.

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

- **Real tonight:** `/alerts` + `/api/subscribe` write a `Subscription` row (channel + destination). The Telegram
  endpoint can be configured, but automated dispatch is paused after removing the scheduled regulatory-monitor
  GitHub Action.
- **STUB boundary:** **email next** — email delivery, double-opt-in, and per-element alert routing (wiring the
  `Subscription` table into the monitor's notify step) are not built tonight. The subscribe form captures and stores
  intent; delivery wiring is a later prompt.

### 4.4 Discussion board → `/discussion`

- **Real tonight:** `/discussion` and `/discussion/[id]` read and write `DiscussionThread` / `DiscussionReply` rows
  through POST routes. Threads and replies publish immediately by default unless held or hidden by a maintainer;
  locked threads reject replies.
- **Moderation:** post-moderation by default (immediate publish, reactive hide/lock). The status vocabulary adds a
  non-public `pending` (held for review) alongside `hidden`. Two opt-in, off-by-default primitives: pre-moderation
  (`DISCUSSION_REQUIRE_APPROVAL` creates new posts as `pending`) and a secret-gated maintainer endpoint
  (`/api/discussion/moderation`, disabled with a `404` unless `DISCUSSION_MODERATION_SECRET` is set — there is no public
  mutation path and no user auth). Full model in `docs/DISCUSSION-MODERATION.md`.
- **Boundary:** discussion is coordination and source review, not publication into `_data/`. Factual price claims,
  corrections, and source tips still require the reviewed contribution pipeline before changing the open dataset.

### 4.5 Prisma models

| Model | Key fields (indicative) | Notes |
|:--|:--|:--|
| `Listing` | `id`, `element_symbol`, `form`, `purity`, `price_per_kg`, `currency`, `quantity_kg`, `incoterm`, `seller_contact`, `status` (pending/screened/published), `created_at` | supply side; never auto-enters `_data/` |
| `Subscription` | `id`, `channel` (telegram/email), `destination`, `elements` (csv/relation), `events` (regulatory/price), `verified`, `created_at` | alerts layer; private, never published |
| `ScreenedOffer` | `id`, `element_symbol`, `side` (buy/sell), `price_per_kg`, `currency`, `quantity_kg`, `source`, `screened_score`, `status`, `created_at` | demand side; **seeded** tonight |
| `DiscussionThread` | `id`, `title`, `category`, `author_name`, `organization`, `body`, `status`, `created_at`, `updated_at` | discussion board; public, user-generated, never auto-enters `_data/` |
| `DiscussionReply` | `id`, `thread_id`, `author_name`, `body`, `status`, `created_at` | replies; hidden replies are excluded from public pages |

> `provider` in `schema.prisma` is `postgresql`. Local development and production both point at Postgres through
> `DATABASE_URL`/`DIRECT_URL`; no runtime row is mirrored into `_data/`.

---

## 5. Database: Postgres everywhere

The Prisma models (§4.5) are the only place dynamic, user-generated rows live. Local/dev and production run on Postgres.
The schema is written to be portable and avoids provider-specific constructs where the app does not need them.

**Same Prisma Client, one engine.** Every query path, including route handlers, `lib/db.ts`, and `prisma/seed.ts`, uses
the same Postgres-backed Prisma Client. The environment-specific surface is the connection string, not application code:

| | `provider` (in `schema.prisma`) | `DATABASE_URL` |
|:--|:--|:--|
| local / dev | `postgresql` | local/Docker Postgres in `.env` (gitignored) |
| production | `postgresql` | hosted Postgres secret in the platform store; never committed |

**Portable by construction.** The schema deliberately avoids engine-specific constructs so the switch is clean:

- no native `enum` — `Listing.status`, `Subscription.channel`/`status`, `ScreenedOffer.origin`,
  `DiscussionThread.status`, and `DiscussionReply.status` are documented enum-like `String`s;
- no scalar lists — `Subscription.topics` is a CSV `String` (a Postgres `text[]` has no SQLite equivalent);
- `@default(cuid())` ids — generated by the client, so Postgres needs no `pgcrypto`/`uuid-ossp` extension.

**Migrations are committed; runtime data is not.**

- **Committed:** `prisma/schema.prisma`, the `prisma/migrations/**` SQL + `migration_lock.toml`, and `prisma/seed.ts`.
- **Never committed:** `.env`, connection strings, and any runtime/user rows. No seeded or runtime row ever enters git.
  The demand-side feed is reproducible from the public `_data/` dataset via `npx prisma db seed` (idempotent: it
  clear-then-inserts only `origin: 'seed'` rows).

---

*End of architecture. Read with `docs/AUDIT.md` (what exists) and `docs/MIGRATION.md` (why this stack, the URL contract,
the build-green sequencing). §2 is the route map every page prompt follows; §3 is the schema every data-layer prompt
implements; §4 is the boundary every app-surface prompt must respect; §5 is the Postgres runtime contract.*
