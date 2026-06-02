# OLD-DESIGN.md

## What this is

This is a reference record of the last deployed static Jekyll site, so the
current Next.js app can be brought back toward it. It captures structure,
layout, block order, data sources, and behavior, page by page. The goal is
parity of those things. Colors already align: `tailwind.config.ts` was ported
from the old `_sass/_variables.scss`, so this doc does not re-litigate the
palette.

Source commit: `56e980f`. Every old file quoted here was read with
`git show 56e980f:<path>` from the repo root. The old site is Jekyll, so pages
are HTML or Markdown with Liquid, layouts live in `_layouts/`, shared fragments
in `_includes/`, styles in `_sass/`, and small scripts in `assets/js/`.

At the old commit the pages were:

- `index.html` (home, layout `home`)
- `pages/prices.html` (permalink `/prices/`)
- `pages/elements.html` (permalink `/elements/`)
- `_elements/*.md` (31 element detail pages, layout `element-detail`)
- `pages/regulatory.html` (permalink `/regulatory/`)
- `pages/movements.html` (permalink `/movements/`)
- `pages/news.html` (permalink `/news/`)
- `_articles/*.md` (5 articles, layout `article`)
- `pages/dashboard.html` (permalink `/dashboard/`)
- `pages/methodology.md` (permalink `/methodology/`)
- `pages/sources.html` (permalink `/sources/`)
- `pages/about.html` (permalink `/about/`)

There was no `/framework/` page and no `/data/` page at `56e980f`. Both are new
in the Next.js app. They are noted in their own sections below for completeness.

The exact files in `_data/` at `56e980f`:
`element_catalog.yml`, `price_records.json`, `fluctuations.json`,
`movements.yml`, `policy_events.yml`, `news.yml`, `key_developments.yml`,
`source_registry.yml`, `source_breakdown.yml`, `site_settings.yml`, plus the
folders `elements/`, `price_history/`, `regulatory/`, `snapshots/`, `demo/`.

---

## Nav: old vs new

### Old nav (`_includes/nav.html`)

A flat row of plain links, left to right, with a brand mark on the left and a
two-bar mobile toggle on the right. The links, in order:

1. Dashboard (`/dashboard/`)
2. Prices (`/prices/`)
3. Regulatory (`/regulatory/`)
4. Movements (`/movements/`)
5. News (`/news/`)
6. Methodology (`/methodology/`)
7. About (`/about/`)
8. Contribute (off-site, the GitHub CONTRIBUTING.md, opens in a new tab)

The active link got a `nav-active` class. The brand was a 24px logo image plus
the text "lanthanides.io". On mobile, `assets/js/main.js` flipped `aria-expanded`
on the toggle and added a `nav-open` class to the nav to show the stacked list.
Note: "Prices" is the label the old site used for the master price table at
`/prices/`. The separate `/elements/` directory page was not in the top nav.

### Old footer nav (`_includes/footer.html`)

A centered link row: Prices, Regulatory, Movements, News, Methodology, About,
Sources, Contribute. Same set as the header minus Dashboard, plus Sources. Below
it: a live stats line (element count, price record count, latest data date with a
Fresh / Recent / Stale badge), a one-line methodology note about retail reference
prices linking to `/methodology/#display-price`, and a license line (CC BY 4.0,
MIT, copyright year, last-built timestamp).

### Current nav (`components/layout/SiteNav.tsx`, `components/layout/nav.ts`)

The current app already matches the old flat row. `nav.ts` defines `NAV_LINKS` as
the same eight links in the same order, with "Prices" pointing at `/elements/`
(the old `/prices/` URL 301-redirects there now). `SiteNav.tsx` renders them as
one inline row on desktop and a single toggle plus stacked list on mobile, with
`aria-current="page"` on the active link. The footer (`SiteFooter.tsx`) mirrors
the old footer row (Prices, Regulatory, Movements, News, Methodology, About,
Sources, Contribute), the live stats line, the methodology note, and the license
line. It adds a small secondary row for the tools, alerts, and open-data export
links that the old site did not have.

Target: keep the flat row. The nav is already in parity, so it needs no change.

---

## Design tokens

From `_sass/_variables.scss`. These already match `tailwind.config.ts`, which
documents itself as the light-mode port of this file. Listed here for reference.

Brand and surfaces:

- Brand primary (deep teal): `#1A5C6B`
- Brand secondary (amber/gold, used only for regulatory warnings): `#D4A847`
- Page background: white `#FFFFFF`; text near-black `#1A1A1A`
- Secondary background `#F8F9FA`, tertiary `#E9ECEF`
- Borders: `#DEE2E6`, `#CED4DA`, `#ADB5BD`
- Text: secondary `#3D3D3D`, muted `#6C757D`, dim `#999999`

Category colors:

- Light rare earth: azure `#2563EB`
- Heavy rare earth: violet `#7C3AED`
- Strategic metal: copper `#B45309`
- Semiconductor metal: emerald `#047857`

Export control and regulatory:

- Restricted red `#B83A2E`, monitored gold `#D4A847`, normal green `#3A8A5C`
- Regulatory badges: none green, export amber, presumptive denial red `#B5342B`,
  suspended gray `#888888`, Japan-targeted blue `#5B6ABF`

Type:

- Sans: Inter; serif: also Inter; mono: JetBrains Mono. (The old site used Inter
  for both body and headings, with JetBrains Mono for numerics.)
- Type scale runs from `0.6875rem` (badges) up to `3rem` (display); body is
  `1rem`. Weights 400 to 700. Headings use a slight negative letter-spacing.

Spacing, layout, radii:

- Spacing steps from `0.25rem` to `4rem`.
- Max width `1440px`, content width `1200px`, header height `48px`.
- Radii are small and sharp: `2px`, `3px`, `4px`, `6px`.
- Transitions: fast `120ms`, base `200ms`.
- Breakpoints: `480px`, `768px`, `1024px`, `1280px`.

A note on the tailwind config: a few values were darkened from these old values
to meet WCAG AA (dim text, the form-field border, and the regulatory and category
hues on tinted badges). The hues stay in-family.

---

## Home

URL: `/`

Layout: `_layouts/home.html`. The page file `index.html` has only front matter
(title, description, keywords) and no body, so the whole page is the home layout.

Blocks, top to bottom:

1. Hero. An eyebrow "Strategic Materials Ledger", a headline ("Rare earth and
   critical metal prices, with provenance."), a lede paragraph, and a four-item
   stat ribbon: element count, price record count, CN-controlled count, data
   source count. Data: `element_catalog.yml` (counts and the controlled tally),
   `price_records.json` (record count), `source_registry.yml` (source count).
2. Grid legend. A row of the four category swatches with per-category counts,
   plus an indicator legend for the China-export-control mark and the high-demand
   mark. Data: `element_catalog.yml` (category counts).
3. Element grid. All elements as compact tiles via `_includes/element-grid.html`,
   ordered by category then atomic number. Each tile shows category, atomic
   number, the control and high-demand markers, symbol, name, and the retail and
   bulk reference prices. Data: `element_catalog.yml` plus `price_records.json`
   (each tile runs `_includes/price-selection.html`).
4. Active controls banner. `_includes/regulatory-banner.html`. A strip listing
   the elements currently under active Chinese export licence, each a chip
   linking to its element page, with a "Details" link to `/regulatory/`. Data:
   `element_catalog.yml` (elements with `regulatory_status: active`).
5. Recent articles. Up to three of the newest `_articles/*.md`, as cards with an
   optional thumbnail, date, title, and a truncated description. Data: the
   `_articles` collection.
6. Recent movements. The five newest events from `movements.yml`, as compact rows
   via `_includes/movement-row.html` (compact variant), with an "All movements"
   link to `/movements/`. Data: `movements.yml`.

Interactive behavior: none specific to the home page beyond the shared mobile nav
toggle. The element tiles are plain links.

Current app (`app/page.tsx`): the block order already matches: Hero, category
legend, element grid (one grid, all elements, category then atomic number),
regulatory banner, recent articles (3), recent movements. No gaps in block order.
The home grid uses the same `ElementCard` tile component as the rest of the app.

---

## Prices (the Ledger)

URL: `/prices/`

Layout: `_layouts/default.html`. Page file `pages/prices.html`. This is a
distinct page from `/elements/`.

Blocks, top to bottom:

1. Page title "The Ledger" and a description paragraph (current prices per kg for
   N elements, retail reference and bulk benchmark, normalised to USD/kg). Data:
   `element_catalog.yml` (the count).
2. Master price table via `_includes/price-table.html`. One section per category
   (Light Rare Earths, Heavy Rare Earths, Strategic Metals, Semiconductor Metals),
   each with a category heading, swatch, and count. Each table has columns: Z,
   Symbol, Name, Status (regulatory badge), Retail Ref, Bulk Bench, Premium,
   Form, Updated, Origin. Symbol and Name link to the element page. Data:
   `element_catalog.yml` plus `price_records.json` (per element via
   `_includes/price-selection.html`); the Premium column is computed as retail
   divided by bulk.
3. Regulatory status legend (None / Export Licence / Suspended badges with text).
4. Disclaimer bar via `_includes/disclaimer.html`, linking to `/methodology/`.

Interactive behavior:

- The `price-table.html` headers marked `data-sortable` (Z, Retail Ref, Bulk
  Bench, Premium, Updated) are click-to-sort via `assets/js/sort.js`.
- This page also carried a `prices-page` container that `assets/js/ledger.js`
  hooked into. With JS, `ledger.js` fetched `/assets/data/elements.json`, hid the
  server-rendered category tables, and replaced them with one interactive table
  that had category filter buttons (All, Lanthanides, Strategic Metals, Technology
  Metals), a free-text search box, sortable columns, and clickable rows that
  navigate to the element page. Without JS, the server-rendered sortable tables
  were the fallback.

Current app: there is no separate "Ledger" page. The old `/prices/` URL
301-redirects to `/elements/`. So the current app does not reproduce: the "The
Ledger" title and copy; the dense per-category sortable price table with the
Premium / Form / Updated / Origin columns; the JS-driven interactive ledger with
category-filter buttons, search box, and clickable rows; or the regulatory-status
legend block in that table's footer. The `/elements/` page (next section) uses a
tile grid instead of this table.

---

## Elements directory

URL: `/elements/`

Layout: `_layouts/default.html`. Page file `pages/elements.html`.

Blocks, top to bottom:

1. Page title "All Rare Earth and Strategic Metal Prices" and a description
   paragraph. Data: `element_catalog.yml` (the count).
2. One section per category, each a dense table. Category headings:
   Light Rare Earths, Heavy Rare Earths, Strategic and Rare Metals, Semiconductor
   Metals, each with a swatch and count. Table columns: Z, Symbol, Name (with
   inline control and high-demand markers), Family, Trade form, Export ctl. (a
   Restricted / Monitored / Normal tag), Retail ref., Bulk ref., Source. Symbol
   and Name link to the element page. Data: `element_catalog.yml` plus
   `price_records.json` (retail and bulk selected inline with the same
   confidence and quantity rules as `price-selection.html`).
3. A page legend explaining the two icon markers and the three export-control
   tags.

Interactive behavior: none. This page used plain `elements-table` tables, not the
sortable `data-table`, so the headers were not click-to-sort.

Current app (`app/elements/page.tsx`): renders the four category sections, but as
a grid of `ElementCard` tiles, not the dense table. Gaps against the old block
list: the per-category table with its Z / Family / Trade form / Export ctl. /
Source columns is replaced by tiles, so the Family column, the Trade form column,
and the dominant-source-country column are not shown in a row layout here. The
page legend (icons plus the three export-control tags) is present. The page adds a
breadcrumb, an eyebrow, and a cross-link block that the old page did not have.

---

## Element detail

URL: `/elements/<Symbol>/` (case-sensitive, for example `/elements/Dy/`)

Layout: `_layouts/element-detail.html`. Page files `_elements/*.md`, 31 of them.
Each markdown file has front matter (symbol, name, atomic number, category,
title, description, keywords, permalink) and an HTML-rich body. Some bodies embed
`{% include provenance-table.html %}`.

Blocks, top to bottom:

1. Breadcrumb (Home / "Sym to Name").
2. Header. A colored symbol block (atomic number and large symbol), the name plus
   "Price" as the H1, category badge, a regulatory badge if controlled (linking to
   `/regulatory/`), an optional notes line, and a meta grid (main trade forms,
   available-from countries, purity range). On the right: last-update date and
   record count. Data: `element_catalog.yml`, `price_records.json`.
3. Two reference-price cards: Retail Reference and Bulk Benchmark. Each shows the
   price per kg, the form and purity, the quantity, the seller, country or
   incoterm, and the quote date. The retail card also shows the Retail Premium
   multiple when both prices exist. Data: `price_records.json` via
   `_includes/price-selection.html`.
4. Price Movement panel via `_includes/price-movement-panel.html`. A small table
   of rolling-window percent changes (7d, 30d, 90d, 1y) for the retail and bulk
   tiers, with up / down / flat arrows, a data-quality badge, and a footnote with
   the observation count and date range. Missing windows show a dash, never a
   fabricated zero. Data: `fluctuations.json` (the per-element entry).
5. Price history chart via `_includes/price-chart.html`. A container plus an
   inline JSON data block of the retail and bulk observations. With JS,
   `assets/js/charts.js` drew an inline SVG line chart (per-day medians per tier;
   1 or 2 points render as dots, no connecting line). Without JS, only the heading
   and a short note showed. Data: `price_history/<symbol>.yml`.
6. Inline regulatory notice (only for controlled or suspended elements). A strip
   with a badge, a sentence, and a link to `/regulatory/`. Data:
   `element_catalog.yml`.
7. The markdown body. Applications tables, descriptive sections, and so on, with
   the embedded provenance table where present.
8. All Offers. When the body did not embed the provenance table, the layout
   appended an "All Offers" section with `_includes/provenance-table.html`. That
   table has columns Date, Form, Purity, USD/kg, Seller, Country, and the Date,
   Form, and USD/kg headers are sortable. Data: `price_records.json` (all records
   for the element).
9. Related elements. Up to four nearest in the same category by atomic number.
10. Previous / Next links across the full category-ordered list.
11. A full-width row of element navigation chips for all elements, colored by
    category, with the current one marked.

Interactive behavior:

- The provenance table is click-to-sort via `assets/js/sort.js`.
- The price-history chart is the progressive-enhancement SVG from `charts.js`.

Current app (`app/elements/[symbol]/page.tsx`): block order matches closely:
breadcrumb, header with badges and meta grid, two reference cards, Price Movement
table, a gated price-trend line, a Price History observations table, inline
regulatory notice, the markdown body with embedded provenance, an All Offers
provenance table fallback, related elements, prev/next, and the chip row. The
redesign pass removed the methodology callout an earlier migration prompt had
added under the two cards, and simplified the reference cards back to the old
layout (price, form, seller, date, and the retail premium, with per-record
verification and confidence kept in the provenance table below rather than on the
card). One intentional difference remains from the old layout: the current app
shows a Price History observations table, a sortable table of the raw
observations, where the old layout had only the SVG line chart. The chart was
dropped because the data is too thin (most tiers have 1 or 2 points, and the old
chart drew dots for those), so the gated price-trend line renders for zero
elements today and the observations table carries the data instead.

---

## Regulatory tracker

URL: `/regulatory/`

Layout: `_layouts/data-page.html`. Page file `pages/regulatory.html`.

Blocks, top to bottom:

1. Element filter strip. A "Filter by element" label and a row of chips: "All"
   plus one chip per regulated or suspended element. Data: `element_catalog.yml`
   (elements whose `regulatory_status` is not none).
2. Active Control Regimes. A section title, a short note, and a grid of notice
   cards, newest first by effective date. Each card classifies itself as Country
   Prohibition, Suspended, Presumptive Denial, or Export Licence Required, and
   shows the notice id, issuing authority, a status dot and label, the affected
   elements as chips, the effective date, an optional target country, and an
   optional suspension-until line. Data: `_data/regulatory/*.yml` (the per-notice
   files: `gac_46_2024.yml`, `mofcom_10_2025.yml`, `mofcom_18_2025.yml`,
   `mofcom_55_62_2025.yml`, `mofcom_1_17_2026.yml`).
3. Announcement Timeline. A section title, a short note, and a vertical timeline,
   newest first. Each entry has a date, an event-type tag, a title, a description,
   an optional source name, and the affected elements as chips. Data:
   `policy_events.yml`.
4. Key Legal References. An aside with three definition entries (end-user
   certificate requirement, review period, presumptive denial). Static text in
   the page.
5. Disclaimer bar via `_includes/disclaimer.html`.

Interactive behavior: the filter chips are driven by
`assets/js/regulatory-timeline.js`. Clicking a chip filters both the notice cards
and the timeline entries to that element (matching on each card's and entry's
`data-elements` attribute), toggles the active chip, and re-clips the timeline
line to the first and last visible entries. Clicking the active chip again, or
"All", clears the filter. The page is fully readable without JS.

Current app (`app/regulatory/page.tsx`): block order matches: filter strip,
active control regime cards, announcement timeline, key legal references aside.
The filter is a client island (`RegulatoryView`) over server-rendered content,
same idea as the old JS. The disclaimer bar is not repeated on this page in the
current app (it appears on other pages). The current page adds a breadcrumb, an
eyebrow, and a cross-link block.

---

## Market movements

URL: `/movements/`

Layout: `_layouts/default.html`. Page file `pages/movements.html`.

Blocks, top to bottom:

1. Header. Title "Market Movements", a subtitle explaining the page is
   auto-generated factual events (price movements over a threshold and regulatory
   state changes, no editorial interpretation), an event count, and an Atom feed
   link to `/movements.xml`. Data: `movements.yml` (the `config` block for the
   threshold and window, and the event total).
2. Event list. All events from `movements.yml`, newest first, each rendered by
   `_includes/movement-row.html` (full variant). A row has a date, a type chip
   (Spike, Drop, Regulatory, New data), optional tier and window labels, a
   confidence label, an element link, a permalink anchor, a description, an
   optional sparkline SVG, and a metadata definition list whose fields depend on
   the event type (price events show window, change percent, from, to,
   observations; regulatory events show from and to signatures; new-data events
   show observation and distinct-day counts). Data: `movements.yml`.
3. Footer note. The detection threshold and window, the last detector run time,
   and a link to `/methodology/`. Data: `movements.yml` (`config` and `state`).
   An empty state shows a "no movements detected yet" message instead of the list.

Interactive behavior: none. The sparklines are static inline SVG.

Current app (`app/movements/page.tsx`): block order matches: header with count
and Atom feed link, the event list via `MovementRow`, and the threshold and
last-run footer. The current app adds a breadcrumb, an eyebrow, and a cross-link
block. The sparkline in the current app is gated to 3 or more points (most old
sparklines were 2-point).

---

## News index

URL: `/news/`

Layout: `_layouts/default.html`. Page file `pages/news.html`.

Blocks, top to bottom:

1. Header. Title "News and Analysis", a subtitle, and an article count. Data: the
   `_articles` collection (count).
2. Article grid. All `_articles/*.md`, newest first, each a tile with an image or
   a placeholder graphic, a date, a headline linking to the article, a truncated
   excerpt, and up to six element-symbol tags. Data: the `_articles` collection.

Interactive behavior: none.

Note: the old news page showed only the `_articles` collection. It did not render
`_data/news.yml` (the "Regulatory and Trade Developments" timeline) or
`_data/key_developments.yml`. Those data files existed but were not surfaced on
this page at `56e980f`.

Current app (`app/news/page.tsx`): the article grid matches. The current app
adds a second section, "Regulatory and Trade Developments", a dated timeline
built from `news.yml`, which the old news page did not have. It also adds a
breadcrumb, an eyebrow, and a cross-link block.

---

## Article

URL: `/news/<slug>/`

Layout: `_layouts/article.html`. Page files `_articles/*.md`, 5 of them. Front
matter includes title, subtitle, date, status, elements, image, image_alt,
description.

Blocks, top to bottom:

1. Header. A meta row (date, and a status badge "In Force" or "Suspended" when
   set), the title, an optional subtitle, and the affected elements as tags
   linking to element pages.
2. Hero image, when `image` is set.
3. The markdown body.
4. Footer. A back link to `/news/` ("All developments").

Interactive behavior: none.

Current app (`app/news/[slug]/page.tsx`): present as a static route over the 5
articles. The block structure (header meta, title, elements, hero image, body,
back link) is the standard article rendering.

---

## Dashboard

URL: `/dashboard/`

Layout: `_layouts/default.html`. Page file `pages/dashboard.html`.

Blocks, top to bottom:

1. Header. Title "Market Dashboard", a subtitle, a "data as of" stamp, and a
   Methodology link. Data: `fluctuations.json` (`generated_at`).
2. 30-day movers. Two columns, Biggest gainers and Biggest decliners, each up to
   six rows via `_includes/dashboard-mover-row.html`. For each element it picks
   the higher-confidence 30-day window (retail or bulk), shows the percent change,
   current price, and a confidence chip with observation and distinct-day counts.
   A footer note states how many elements were excluded for lack of 30-day data
   and links to `/movements/`. Data: `fluctuations.json`.
3. Regulatory snapshot. A row of six stat cards, each linking to `/regulatory/`:
   Restricted, Monitored, Unrestricted, Active, Suspended, Clear, counted from
   the catalog's `export_control_status` and `regulatory_status`. Data:
   `element_catalog.yml`.
4. Retail premium leaderboard. A table of elements where both retail and bulk
   prices exist, ranked by the retail-to-bulk ratio, with rank, element, retail,
   bulk, and premium columns. Ratios below 1 are highlighted. A footer note states
   how many elements qualify. Data: `fluctuations.json` (latest retail and bulk
   prices per element).
5. Data coverage map. A legend (Rich, Moderate, Sparse, and None when present
   with counts) and a tile per element colored by coverage, each showing the
   symbol and observation count, linking to the element page. Data:
   `fluctuations.json` (`data_quality`, `observation_count`, `distinct_days`).

Interactive behavior: none. The movers and premium lists are built in Liquid.

Current app (`app/dashboard/page.tsx`): renders three of the five blocks, the
regulatory snapshot, the retail premium leaderboard, and the data coverage map,
plus the header with the "data as of" stamp and Methodology link. Gap against the
old block list: the "30-day movers" two-column board (gainers and decliners) is
deliberately not present. The current page replaces it with a note pointing to the
`/movements/` feed, on the grounds that most 30-day windows span only two days and
would surface oxide-to-metal artefacts. The current premium leaderboard is a
sortable table; the old one was a static ranked table. The current page adds a
breadcrumb, an eyebrow, and a cross-link block.

---

## Methodology

URL: `/methodology/`

Layout: `_layouts/data-page.html`. Page file `pages/methodology.md` (Markdown
with Liquid).

Blocks, top to bottom (long prose page):

1. Purpose.
2. Display Prices (anchor `#display-price`): Retail Reference, Bulk Benchmark,
   Retail Premium, and "Why not an average".
3. Price Tiers (Retail, Bulk / Industrial, Lab-grade).
4. Normalisation.
5. Oxide-to-Metal Conversion (anchor `#oxide-to-metal`), with a stoichiometry
   table.
6. Material Forms and Purity.
7. Verification and Confidence, with status and confidence-score tables.
8. Source Categories.
9. Provenance Chain (anchor `#provenance-chain`): public listings, community
   submissions, supplier quotes, and shared guarantees.
10. Data sources breakdown (anchor `#data-sources-breakdown`): a live table of
    the observation mix by intake path. Data: `source_breakdown.yml`.
11. Source Trust Tiers, Data Freshness, Update Frequency, MOQ, "Why Some Pages
    Show Sparse Data", and "How to Contribute Data".

Interactive behavior: none. Most of the page is static prose; only the data
sources breakdown table is data-driven.

Current app (`app/methodology/page.tsx` plus `app/methodology/methodology.md`):
the prose was relocated into a Markdown file the build owns, so it does not read
from the old Jekyll tree. The deep-link anchors (`#display-price` and others) are
preserved, and the data sources breakdown table is rendered live from
`source_breakdown.yml`. Content is in parity.

---

## Sources

URL: `/sources/`

Layout: `_layouts/data-page.html`. Page file `pages/sources.html`.

Blocks, top to bottom:

1. Trust Tiers. A table of the five tiers with a description and a reliability
   badge. Data: `site_settings.yml` (`source_trust_tiers`).
2. Registered Sources. A table with columns Source (name plus an optional URL),
   Type, Trust Tier, Country, Ingestion (method), Status (a parse-status badge),
   Last Fetch, and Review. Data: `source_registry.yml`.
3. Adding a New Source. A card with a YAML snippet of the source schema. Static
   text.
4. Disclaimer bar via `_includes/disclaimer.html`.

Interactive behavior: the tables used the `data-table` class but no headers were
marked sortable here, so no click-to-sort.

Current app (`app/sources/page.tsx`): the Trust Tiers table and the Registered
Sources table are present. The registered-sources columns differ: the current
table shows Source, Type, Trust Tier, Country, Supported Elements, Status, Review,
and drops the Ingestion-method, URL, and Last Fetch columns (the note says they
are dropped rather than fabricated where the registry lacks the data). Gap against
the old block list: the "Adding a New Source" card with the YAML schema snippet is
not present. The current page keeps a disclaimer callout, adds a breadcrumb, an
eyebrow, and a cross-link block.

---

## About

URL: `/about/`

Layout: `_layouts/default.html`. Page file `pages/about.html`.

Blocks, top to bottom:

1. Page title "About".
2. What This Is. Two paragraphs. Data: `element_catalog.yml` (element count).
3. Motivation. Two paragraphs.
4. Principles. A definition list (no fabricated data, two-tier pricing, source
   provenance, open access).
5. Data Coverage. Four stat cards: elements tracked, price records, data sources,
   policy events. Data: `element_catalog.yml`, `price_records.json`,
   `source_registry.yml`, `policy_events.yml`.
6. Community Contributions. A paragraph and a list of GitHub-issue contribution
   links.
7. Contact. A contact line (the old page used a `.edu` address) plus links to the
   contribution guide, Sources, and Methodology.

Interactive behavior: none.

Current app (`app/about/page.tsx`): block structure matches: What this is, Why it
exists (was "Motivation"), Principles, Data coverage (four stats), Community
contributions, Contact. The contact address is now `hello@lanthanides.io` rather
than the old `.edu` address. The current page is a plain reference page; an
investor "vision" split that an earlier migration prompt added was removed in the
redesign pass. The current page adds a breadcrumb, an eyebrow, and a cross-link
block.

---

## Framework

URL: `/framework/`

There was no framework page at `56e980f`. No `pages/framework.html` and no
framework Markdown existed at that commit. The current app has
`app/framework/page.tsx` plus `app/framework/framework.md`, added by a later
migration prompt, with preserved anchors `#pricing` and a tariff-stack anchor.
There is no old design to match for this page.

---

## Data (open-data landing)

URL: `/data/`

There was no `/data/` page at `56e980f`. The old site exposed open-data exports as
static files under `/assets/data/` (for example `fluctuations.json` and
`elements.json`, the latter fetched by `assets/js/ledger.js`), but it had no
`/data/` landing page. The current app has `app/data/page.tsx` as a new open-data
landing. There is no old design to match for this page.

---

## Summary of behavior and the small JS files

The old site shipped five small scripts, all loaded with `defer` from
`_layouts/default.html`:

- `assets/js/main.js`: bootstraps the others and runs the mobile nav toggle.
- `assets/js/sort.js`: click-to-sort for any `data-table` with `data-sortable`
  headers. Used by the prices ledger table and the element-page provenance table.
- `assets/js/ledger.js`: the interactive prices ledger (fetch
  `elements.json`, category filters, search, sortable, clickable rows) layered
  over the server-rendered `/prices/` tables.
- `assets/js/regulatory-timeline.js`: the element filter on `/regulatory/` over
  the notice cards and the timeline.
- `assets/js/charts.js`: the progressive-enhancement inline SVG price-history
  chart on element pages.

Every one of these was progressive enhancement: each page is readable and
navigable without JavaScript, and the scripts only add sorting, filtering, search,
or a chart on top of server-rendered content.

---

## What the redesign pass brought into parity

After the page-by-page rebuilds, these match the old site again:

- Nav: a flat row of plain links, brand logo plus wordmark on the left, a two-bar
  mobile toggle. No grouped dropdowns, no "Soon" tags.
- Footer: the centered link row, live stats line, methodology note, and license
  line.
- Home: hero with the four-stat ribbon, category legend, one element grid ordered
  by category then atomic number, the active-controls banner, three recent
  articles, and recent movements. No pillar cards, no investor split.
- Element detail: the methodology callout an earlier migration prompt had added is
  gone, and the reference cards are back to the old shape (price, form, seller,
  date, retail premium), with verification and confidence kept in the provenance
  table rather than on the card.
- Brand mark: the real `logo-48.png` in the header, not a colored square. The
  manifest name is back to the plain `lanthanides.io` and its background color is
  white to match the light theme.
- Tools (price gauge, sell, offers, alerts): short intros, the forms and results,
  and the honest status notes. The marketing and two-sided-market framing is gone.
- Voice: no em dashes in `app`, `components`, `lib`, `_elements`, or `_articles`;
  ranges read with the word "to". Plain, short sentences.

## Accepted differences from the old site

These are deliberate departures, kept on purpose, not regressions:

1. The old `/prices/` Ledger (a dense per-category sortable price table and the
   JS-driven interactive ledger with category filters, search, and clickable rows)
   is not reproduced. `/prices/` 301-redirects to `/elements/`, which uses a tile
   grid. This is the migration URL contract and the redesign's chosen index form.
2. The `/elements/` directory shows tiles, not the old dense table, so the Family,
   Trade-form, and dominant-source columns are not shown in a row layout.
3. The element detail page shows a sortable Price History observations table where
   the old page had only the SVG line chart. The chart was dropped because the data
   is too thin (see `docs/VISUALIZATION-AUDIT.md`); the gated price-trend line
   renders for zero elements today and the table carries the data.
4. The dashboard omits the old "30-day movers" gainers and decliners board. Most
   30-day windows span two days and would surface oxide-to-metal artefacts, so the
   page routes "biggest moves" to the factual `/movements/` feed instead.
5. The sources page does not show the old "Adding a New Source" YAML card, and it
   drops registry columns the data does not fill (rather than fabricating them).
6. The news page adds a "Regulatory and Trade Developments" timeline that the old
   page did not surface.
7. Every section page adds a breadcrumb, an eyebrow, and a cross-link block. These
   are redesign information-architecture additions, consistent across the site.
8. `/framework/` and `/data/` are new pages with no equivalent at `56e980f`.

## Final parity sign-off

Run on 2026-06-02 after the element-detail, logo, and tools-copy rebuilds:

- `npm run build` green; `npm run lint` clean.
- `grep -rnE` for em and en dashes over `app components lib _elements _articles`
  returns nothing.
- The three redirects resolve: `/prices` to `/elements/`, `/vision` to `/about/`,
  and `/assets/data/elements.json` to `/api/export/json/`. Element URLs stay
  case-sensitive (`dynamicParams = false`).
- Internal-link check over the built HTML: 0 dangling links (the only unmatched
  hrefs are `/_next/static/*` runtime assets, which Next serves).
- Every `/assets/images/*` reference in the built output resolves to a file in
  `public/`. The header logo, favicons, manifest, OG image, and the one article
  hero and thumb all resolve.
