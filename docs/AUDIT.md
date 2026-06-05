# lanthanides.io — Site Audit & Investment-Readiness Gaps

> Audit date: 2026-05-31 · Branch: `main` · Audited against current `main` (HEAD `2a0a1b9`; a prior pass mis-stated its base as `56e980f`, which predated `/framework/`)
> Scope: the current static **Jekyll** repo (no Next.js yet). Read-only inventory.
> This document is the reference that later migration prompts read. It is factual and
> cites file paths. Where the older `docs/improvement-plan.md` (dated 2026-04-08)
> disagrees with the repo, the repo wins — that plan is **stale** (it references
> `supply-risk.html`, `heatmap.html`, `search.js`, `heatmap.js`, `_sass/_heatmap.scss`,
> `alternative_supply.yml`, `header.html`, all of which no longer exist).
>
> **Re-evaluation note (2026-05-31):** a prior pass of this audit was written against the
> stale base commit `56e980f`, which predates `d55ad05` ("feat: add `/framework/` — REE
> import/export operational reference") and `0628880`/`44fdc1d` (the regulatory-monitor
> automation). That pass omitted **(a)** the served **`/framework/` page** from the
> inventory (§1.4), the permalink contract (§2), the navigation (§1.3), and the crown-jewel
> discussion (§6); and **(b)** the **regulatory-monitor pipeline** (`scripts/scraper|triage|notify`)
> that previously ran through GitHub Actions. The scheduled workflow has since been removed. This revision
> adds both and corrects the nav link count (8 → 9). Every other count and claim below was
> re-verified against the working tree and stands unchanged.
>
> **Re-evaluation note (2026-06-02):** re-ran this audit's verification against the
> post-migration working tree (HEAD `65d4060`). The migration this document scoped is now
> **complete** (Prompts 1–25). `legacy/` — the quarantined Jekyll source for the `pages/`,
> `_layouts/`, `_includes/`, `assets/js/`, and `_sass/` paths cited throughout §1 — was
> removed in **Prompt 25**, so those paths are now historical: §1 documents the *pre*-migration
> site as audited, by design. Every load-bearing count still resolves **exactly** against the
> data files retained at repo root: **31** `_elements/*.md`, **5** `_articles/*.md` (slugs per
> §2), **238** records in `price_records.json`, **285** `price_history` observations across **31**
> files (= `source_breakdown.yml` `total_observations`, confirming the §4.3 285 ≠ 238 split),
> **11** `policy_events`, **5** `regulatory/*.yml` notices, **5** `source_registry` sources; the
> regulatory-monitor pipeline (`scripts/run_monitor.py`, `scripts/scraper/`, `scripts/triage.py`,
> `scripts/notify/`) and all three `.github/workflows/*` are intact. **One §4 finding has since
> been resolved:** §4.4's broken/placeholder `_data/elements/La.yml` was repaired during the
> data-model phase exactly as that section prescribed — it now carries a real `retail_reference`
> ($685.0/kg, sourced) and well-formed YAML. §4.4 is retained verbatim as the as-audited record.
> Everything else stands unchanged.

---

## 1. Site map & inventory

### 1.1 Configuration & infrastructure

| File | What it does |
|:--|:--|
| `_config.yml` | Jekyll config. Collections `elements` (`/elements/:name/`) and `articles` (`/news/:name/`); plugins `jekyll-feed`, `jekyll-seo-tag`, `jekyll-sitemap`; kramdown + rouge; `permalink: pretty`; compressed Sass. Excludes `Gemfile`, `Gemfile.lock`, `scripts/`, `invoices/`, `outreach/`, `node_modules/`, `vendor/`, `README.md`, `LICENSE`, `*.py`, `requirements.txt`, `_data/demo/` from the build. **`pages/framework.md` is NOT excluded → it builds and serves at `/framework/`.** |
| `Gemfile` / `Gemfile.lock` | Jekyll `~> 4.4`, `webrick ~> 1.9`, plugins feed/seo-tag/sitemap. No framework. |
| `CNAME` | `www.lanthanides.io` (root-domain GitHub Pages; **no** `/project/` base path). |
| `.gitignore` | Ignores `_site/`, caches, `invoices/*` (except `.gitkeep`), `.env`, **`prompts/`**, **`logs/`**, `run-all.sh`, `outreach/suppliers.yml`, `outreach/drafts/`. (So `prompts/` being untracked is expected.) |
| `LICENSE` | Dual license: **MIT** (code) + **CC BY 4.0** (content/data). |
| `README.md` | Project overview: 31 elements, two-price model, regulatory tracker, tech stack. |
| `CONTRIBUTING.md` | Contribution guide: data schemas, source standards, local dev. **Contact = `mironovb@berea.edu`** (line 220). |
| `.impeccable.md` | Design brief: personas, brand personality ("intelligence brief — Foreign Affairs meets a Goldman Sachs commodity note"), color semantics, IBM Plex + Source Serif typography commitments. |
| `robots.txt` | `Allow: /` + sitemap pointer (Liquid-templated, `layout: null`). |
| `humans.txt` | Creator metadata. **Contact = `mironovb@berea.edu`**. |
| `404.html` | Custom 404 with home/prices/news links. |
| `run-all.sh` | Pipeline runner (gitignored). |
| `.github/ISSUE_TEMPLATE/{price-update,data-correction,market-note}.yml` | Structured contributor intake forms. |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template. |
| `.github/workflows/community-intake.yml` | **Manual-dispatch-only** workflow: ingests an `approved`-labelled price-update issue → opens a PR (two human checkpoints; never auto-runs on issue creation). |
| `.github/workflows/price-update.yml` | Scheduled/again-manual price refresh workflow. |
| `.github/workflows/regulatory-monitor.yml` | **Removed**. The old cron workflow ran `scripts/run_monitor.py` every 6h and opened monitor-state updates; it was removed after the site moved to the Vercel app path. The Python monitor scripts remain for manual or future external use. |

### 1.2 Layouts (`_layouts/`)

| File | What it does | Reads |
|:--|:--|:--|
| `default.html` | Shell: `head.html` + `nav.html` + `<main>` + `footer.html`. Loads 5 JS files deferred (main, sort, ledger, regulatory-timeline, charts). | — |
| `home.html` | Homepage: hero + stat counters, category legend, element grid, regulatory banner, recent articles (3), recent movements widget (5). | `element_catalog`, `price_records`, `source_registry`, `site.articles`, `movements` |
| `element-detail.html` | Element page: identity block, two-price cards (retail/bulk), **Price Movement panel + Price History chart**, inline regulatory notice, body content, related elements, prev/next, full element nav bar. | `element_catalog`, `price_records`, `price_history`, `fluctuations` (via includes) |
| `article.html` | Long-form article: meta, status badge, element tags, hero image, body, back link. | front-matter |
| `page.html` | Minimal `<h1>` + content wrapper (currently unused by any page). | — |
| `data-page.html` | Title + description + content wrapper. Used by `methodology`, `regulatory`, `sources`, **`framework`**. | — |

### 1.3 Includes (`_includes/`)

| File | What it does | Reads | Mounted by |
|:--|:--|:--|:--|
| `head.html` | `<head>`: favicons, manifest, `theme-color #1A5C6B`, **Inter + JetBrains Mono** Google Fonts, SEO/OG/Twitter meta, canonical, `{% feed_meta %}`, movements.xml `<link>`. | `site`, `page` | `default.html` |
| `nav.html` | Fixed header: logo + **9 links** (Dashboard, Prices, Regulatory, **Framework**, Movements, News, Methodology, About, Contribute) + mobile toggle. Framework sits immediately after Regulatory (header-only — **not** in the footer, mirroring how Sources is footer-only). | `page.url` | `default.html` |
| `footer.html` | Footer nav (8 links incl. **Sources**, not in header), live freshness badge computed from newest `quote_date`, license/build stamp. | `price_records`, `site.elements`, `site.time` | `default.html` |
| `element-grid.html` | Compact tile grid of all 31 elements (category color, retail/bulk price, indicators). | `element_catalog`, `price_records` (via `price-selection`) | `home.html` |
| `price-selection.html` | **Shared selection logic**: `retail_ref` (metal-preferred, 5 g–1 kg, conf ≥ 0.5, lowest) + `bulk_ref` (most recent bulk/industrial, conf ≥ 0.6). | `price_records` | element-detail, element-grid, price-table |
| `price-table.html` | Master 4-section price ledger (server-rendered, sortable headers). | `element_catalog`, `price_records` | `pages/prices.html` |
| `price-movement-panel.html` | **% change table** (retail/bulk × 7d/30d/90d/1y) with quality chip. | `fluctuations.elements[sym]` | `element-detail.html` |
| `price-chart.html` | Emits chart container + inline JSON of raw retail/bulk observations for `charts.js`. | `price_history[sym]` | `element-detail.html` |
| `fluctuation-fallback.html` | No-JS latest-price + 30d-change block. **ORPHANED — included by nothing.** | `price_history[sym]` | *(none)* |
| `dashboard-mover-row.html` | One row of the dashboard movers list: price, % label, **2-point SVG sparkline**, confidence chip. | include params | `pages/dashboard.html` |
| `movement-row.html` | One row of the Market Movements feed (full + compact variants), incl. a server-baked sparkline from `movements.yml`. | `movements.events[]` | `movements.html`, `home.html` |
| `provenance-table.html` | Sortable per-element price-records table. | `price_records` | all 31 `_elements/*.md` |
| `regulatory-banner.html` | Homepage alert listing active-control elements. | `element_catalog` | `home.html` |
| `disclaimer.html` | "All prices require provenance…" bar. | — | prices, sources, regulatory |
| `structured-data-site.html` | JSON-LD `WebSite` + `FAQPage` (4 Q&As, embeds live counts). | `price_records`, `site.elements` | `home.html` |
| `structured-data-element.html` | JSON-LD `Product` + `Offer[]` per element. | `cat_info`, `retail_ref`, `bulk_ref` | `element-detail.html` |
| `structured-data-article.html` | JSON-LD `Article`. | `page` | `article.html` |
| `structured-data-breadcrumb.html` | JSON-LD `BreadcrumbList`. | `breadcrumb_current` | every page |
| `price-selection.html` *(see above)* | — | — | — |

### 1.4 Pages (`pages/` + `index.html`)

| File | URL | What it does | Reads |
|:--|:--|:--|:--|
| `index.html` | `/` | Home (layout `home`). | (see `home.html`) |
| `pages/dashboard.html` | `/dashboard/` | Market dashboard: 30-day movers (gainers/decliners), regulatory snapshot stat-cards, retail-premium leaderboard, data-coverage tile map. All computed in Liquid from `fluctuations`. | `fluctuations`, `element_catalog` |
| `pages/prices.html` | `/prices/` | "The Ledger" — server `price-table.html`, then **`ledger.js` replaces it** with an interactive table fetched from `elements.json`. | `element_catalog`, `price_records`; JS reads `assets/data/elements.json` |
| `pages/elements.html` | `/elements/` | Full directory, 4 category tables. **Duplicates** the retail/bulk selection algorithm inline (lines 62-99) instead of using `price-selection.html`. | `element_catalog`, `price_records`, `site.elements` |
| `pages/regulatory.html` | `/regulatory/` | **Export-control tracker**: filter chips, notice cards (per `_data/regulatory/*.yml`), announcement timeline (per `policy_events.yml`), legal references. | `element_catalog`, `regulatory`, `policy_events` |
| `pages/framework.md` | `/framework/` | **REE import/export operational framework** (`data-page` layout): quick-start decision tree, 3-tier regulatory classification (uncontrolled / general-licence / case-by-case), post-IEEPA US tariff stack, China-side control summary + per-element licence-status table, multiplicative realised-price model, four-axis landed-cost decomposition with worked examples + lot-size sensitivity, buyer playbook, channels/counterparties, 2026 decision-trigger calendar. ~450 lines, heavily sourced, **table-driven (no charts)**; reconciles against `_data/regulatory/mofcom_18_2025.yml` + `mofcom_55_62_2025.yml`. | static prose; deep-links `/regulatory/`, `/methodology/`, `/elements/*` |
| `pages/movements.html` | `/movements/` | Auto-generated movements feed (>10% / 30d + regulatory changes) + Atom link. | `movements` |
| `pages/news.html` | `/news/` | Article tile grid. **Uses the `articles` collection, NOT `_data/news.yml`.** | `site.articles` |
| `pages/methodology.md` | `/methodology/` | Full methodology: two-price rationale, normalization, provenance chain, trust tiers, **live source-breakdown table** from `source_breakdown.yml`. | `source_breakdown` |
| `pages/about.html` | `/about/` | Mission, principles, coverage stats, contributions, **contact `mironovb@berea.edu`** (line 79). | `site.elements`, `price_records`, `source_registry`, `policy_events` |
| `pages/sources.html` | `/sources/` | Trust-tier table + registered-source table + "add a source" guide. | `site_settings`, `source_registry` |

### 1.5 Collections

| Collection | Dir | Count | Permalink | Notes |
|:--|:--|:--|:--|:--|
| `elements` | `_elements/*.md` | **31** | `/elements/:name/` (each file sets explicit `permalink: /elements/<Sym>/`) | Rich hand-authored bodies: applications table, market/supply stats, verified-offers (`provenance-table`), important notes, physical properties, references. |
| `articles` | `_articles/*.md` | **5** | `/news/:name/` | `chinas-invisible-rare-earth-wall`, `chinese-export-licence-timelines`, `ebay-rare-earth-market-research-april-2026`, `mofcom-october-2025-suspension`, `retail-premium-puzzle`. Publication-quality, footnoted. |

### 1.6 Data files (`_data/`)

| File | What it is | Size | Consumed by | Status |
|:--|:--|:--|:--|:--|
| `element_catalog.yml` | **Master** 31-element catalog (symbol, Z, category, control status, trade form, notes). | 31 | every template | ✅ canonical |
| `price_records.json` | Flat price observations (provenance, normalization, confidence, verification). | **238 records** | `price-selection`, `provenance-table`, all stat counters | ✅ canonical for display |
| `price_history/*.yml` | Per-element time series (incl. `median_aggregate` rows). | 31 files, **285 observations** | `price-movement-panel`, `price-chart`, `fluctuation-fallback`, movements pipeline | ⚠️ **second price store** — count (285) ≠ `price_records.json` (238) |
| `fluctuations.json` | Pre-computed per-element windowed % changes + coverage grade. | 3,772 lines | dashboard, `price-movement-panel` | ✅ used |
| `movements.yml` | Auto-detected price/regulatory events + sparkline geometry. | 1,214 lines | movements page/feed, home widget | ✅ used |
| `policy_events.yml` | **11** policy events (MOFCOM/GAC/EU/State Council), Chinese refs. | 11 | regulatory timeline, about counter | ✅ used |
| `regulatory/*.yml` | **5** detailed notices (`gac_46_2024`, `mofcom_10_2025`, `mofcom_18_2025`, `mofcom_55_62_2025`, `mofcom_1_17_2026`) with legal basis, compliance, suspension. | 5 | regulatory notice cards | ✅ used — **crown jewel data** |
| `source_registry.yml` | **5** sources (Stanford AM, Edgetech, ALB, American Elements, Goodfellow), trust tiers. | 5 | sources page, counters | ✅ used |
| `source_breakdown.yml` | Observation mix by source type (285 total: 76.8% public_listing, 16.5% aggregate, 6.7% benchmark; community/supplier/invoice = **0**). | — | methodology table | ✅ used |
| `site_settings.yml` | Thresholds, labels, trust-tier text. | — | sources page | ✅ used |
| `elements/*.yml` | **Second 31-element store** with `retail_reference`/`bulk_benchmark`/`retail_premium_ratio`. | 31 files | **only** `assets/data/elements.json` → `ledger.js` | ⚠️ parallel store; **`La.yml` is broken placeholder** (see §4) |
| `news.yml` | 16 legacy "news feed" entries. | 16 | **nothing** | ❌ **ORPHANED** (news page uses the `articles` collection) |
| `key_developments.yml` | Homepage export-control summary. | — | **nothing** | ❌ **ORPHANED** |
| `snapshots/2026-05-24_*.json` | Dated price snapshot. | 1 | **nothing** (written by `build_snapshots.py`) | ❌ orphaned in templates |
| `demo/demo_price_records.json` | Synthetic dev data, self-labelled "DEMO DATA ONLY… Never display." | — | excluded from build in `_config.yml` | ⚠️ demo dir in repo |

### 1.7 JavaScript (`assets/js/`)

| File | Module | What it does | Mount point | Status |
|:--|:--|:--|:--|:--|
| `main.js` | — | Boots `SML_Sort`, `SML_Ledger`, `SML_RegTimeline`; wires mobile-nav toggle. | global | ✅ |
| `sort.js` | `SML_Sort` | Click-to-sort `.data-table` headers (`data-sort-key`). | any `.data-table` | ✅ |
| `ledger.js` | `SML_Ledger` | On `/prices/`, **hides the server table** and rebuilds it from `assets/data/elements.json` (filter/search/sort). | `.prices-page` | ⚠️ reads the divergent `_data/elements/*.yml` store |
| `regulatory-timeline.js` | `SML_RegTimeline` | Element-chip filtering of notice cards + timeline. | `#reg-filter-strip` | ✅ |
| `charts.js` | (IIFE) | Renders inline-SVG price-history chart; **no connecting line below 3 points** (dots only) per no-fabrication rule. | `[data-chart="price-history"]` | ✅ but starved of data |

### 1.8 Styles (`_sass/`) + media

- **24 SCSS partials** imported by `assets/css/main.scss` (`_variables`, `_reset`, `_mixins`, `_typography`, `_layout`, `_header`, `_footer`, `_home`, `_cards`, `_badges`, `_tables`, `_panels`, `_dashboard`, `_movements`, `_element-detail`, `_elements-page`, `_news-page`, `_article`, `_about`, `_interactive`, `_regulatory-banner`, `_periodic-nav`, `_responsive`, `_print`).
- `assets/images/`: favicons (ico/16/32/svg/apple-touch/android-chrome 192+512), logos (48/128/png), `og-default.png` **(exists)**, article images `china-rare-earth-controls-{600,1200}.jpg`, `site.webmanifest`.
- `assets/data/`: `elements.json` (Liquid-generated from `_data/elements/`), `fluctuations.json` (a **duplicate** of `_data/fluctuations.json`).

### 1.9 Out-of-build tooling (not served)

`scripts/*.py` (validate, normalize, generate, import invoices/offers, detect movements, build snapshots, fluctuations, source breakdown, placeholder generator), `outreach/*.py` (consent-gated supplier intake), `invoices/`, `logs/`, `prompts/`. Excluded via `_config.yml`/`.gitignore`.

**Regulatory-monitor pipeline** (out-of-build, currently manual/paused — see §5/§6): `scripts/run_monitor.py` + `scripts/run_state.json` (orchestrator + dedup/seen state), `scripts/scraper/monitor.py` + `scripts/scraper/sources.yaml` (polls MOFCOM homepage, gov.cn, and RSS/Atom feeds for REE-relevant announcements), `scripts/triage.py` (rule-based 1–10 significance scorer, biased low to avoid false-positive alerts), `scripts/notify/{telegram,email}.py` (alert channels). The scheduled GitHub Actions driver was removed; no automated monitor-state commits run today.

---

## 2. Routing / permalinks (MUST be preserved by the migration)

Every public URL the current site serves. This is the contract the Next.js migration must honor (redirects if any change).

**Top-level pages**
- `/` — home
- `/dashboard/`
- `/prices/`
- `/elements/`
- `/regulatory/`
- `/framework/` — **served page (`pages/framework.md`); was missing from the prior pass. Part of the contract.**
- `/movements/`
- `/news/`
- `/methodology/`
- `/about/`
- `/sources/`
- `/404.html`

**Element collection (31)** — `/elements/<Symbol>/` with original-case symbol:
`/elements/La/`, `/elements/Ce/`, `/elements/Pr/`, `/elements/Nd/`, `/elements/Sm/`, `/elements/Y/`, `/elements/Sc/`, `/elements/Eu/`, `/elements/Gd/`, `/elements/Tb/`, `/elements/Dy/`, `/elements/Ho/`, `/elements/Er/`, `/elements/Tm/`, `/elements/Yb/`, `/elements/Lu/`, `/elements/Te/`, `/elements/V/`, `/elements/Sb/`, `/elements/W/`, `/elements/Bi/`, `/elements/Mo/`, `/elements/Zr/`, `/elements/Ta/`, `/elements/Nb/`, `/elements/Co/`, `/elements/Li/`, `/elements/Ga/`, `/elements/Ge/`, `/elements/Se/`, `/elements/In/`

**Article collection (5)** — `/news/<slug>/`:
- `/news/chinas-invisible-rare-earth-wall/`
- `/news/chinese-export-licence-timelines/`
- `/news/ebay-rare-earth-market-research-april-2026/`
- `/news/mofcom-october-2025-suspension/`
- `/news/retail-premium-puzzle/`

**Machine-readable / feeds / SEO**
- `/sitemap.xml` (jekyll-sitemap)
- `/feed.xml` (jekyll-feed; `{% feed_meta %}` in `head.html`)
- `/movements.xml` (custom Atom feed, `permalink: /movements.xml`)
- `/assets/data/elements.json` (open-data export, `permalink: /assets/data/elements.json`)
- `/assets/data/fluctuations.json` (open-data export)
- `/robots.txt`
- `/humans.txt`
- `/assets/images/site.webmanifest`

> ⚠️ Migration note: `/elements/<Sym>/` uses **case-sensitive** symbols. Several pages also deep-link `/methodology/#display-price`, `/methodology/#provenance-chain`, `/methodology/#data-sources-breakdown`, `/methodology/#oxide-to-metal` — preserve those anchors. The `/framework/` page also exposes in-page anchors (`#pricing`, `#us-side-tariff-stack-may-14-2026`) for its own internal navigation — preserve them too.

---

## 3. Visualization audit

Context that colors every "data sufficiency" cell below: the price corpus is essentially **two collection days — 2026-03-15 and 2026-04-04** (with a sprinkle of bulk on 04-04). `fluctuations.json` confirms it: nearly every window carries `confidence: "low"` and `distinct_days_in_window: 2`, and several elements have `distinct_days: 1` with **all windows `null`**. The codebase itself says so (`pages/dashboard.html:209` "Most current windows span only two distinct observation days, so confidence is generally low"). **Any widget that draws a line, trend, or "% move" from ≤2 points is structurally choppy/misleading** and is flagged accordingly.

| # | Visualization | Location | What it shows | Data sufficiency | Rendering quality | Decision | Rationale |
|:--|:--|:--|:--|:--|:--|:--|:--|
| 1 | Per-element price-history chart | `_includes/price-chart.html` + `assets/js/charts.js` (element-detail) | Inline-SVG scatter/line of retail & bulk USD/kg over time | **Poor** — most elements have 2 distinct days → 2 dots/series; line suppressed below 3 points | Code is *honest* (dots-only <3 pts, per-day medians) but the result is a near-empty plot | **REBUILD-CLEAN** | Keep the no-fabrication discipline, but a 2-dot "chart" reads as broken. Rebuild as a point-in-time comparison (retail vs bulk vs premium) and only show a true time series once ≥3 distinct days exist; otherwise hide the chart, not show 2 dots. |
| 2 | Price Movement % table | `_includes/price-movement-panel.html` (element-detail) | Retail/bulk × 7d/30d/90d/1y % change grid + quality chip | **Poor/misleading** — windows derive from 2 days and **mix forms** (e.g. day-1 oxide vs day-2 metal) → absurd values (Ce 1y `pct_change: 10450%`, Y retail 30d `+115,837.5%`) | Clean table; many "—" cells; tooltips honest about confidence | **REBUILD-CLEAN** | The math is real but compares non-comparable products across only 2 days. Suppress any window with <3 distinct days and same-form anchoring; otherwise the headline number is noise dressed as signal. |
| 3 | Dashboard "30-day movers" | `pages/dashboard.html` + `_includes/dashboard-mover-row.html` | Top gainers/decliners by abs % over trailing 30d | **Misleading** — fed by the same 2-day, mixed-form windows; surfaces `+115,837%` "spikes" | Tidy two-column list; compact %; confidence chip | **REBUILD-CLEAN** | A "movers" board that ranks oxide→metal artifacts as the biggest movers actively undermines credibility. Gate on ≥3 distinct days / same-form deltas, or replace with a "latest prices + spread" board until the series deepens. |
| 4 | Movers 2-point sparkline | `_includes/dashboard-mover-row.html:69-103` | A hardcoded up/down/flat slope (`M3,18 L77,4`) | **None** — geometry is fixed by direction, not data | Crisp SVG, but conveys zero information the arrow/% don't already | **REMOVE** | Pure decoration. The brief (`.impeccable.md`) forbids non-informative visuals. The % label + direction arrow already carry the signal. |
| 5 | Movements-feed sparkline | `_includes/movement-row.html:43-58` (+ `movements.yml` geometry) | 2-point slope baked by `detect_movements.py` | **Low** — `point_count: 2` on the events I inspected | Honest meta ("2 pts · $8 → $9,275") but the curve itself is a straight segment | **REBUILD-CLEAN** | Keep the factual from→to + observation count; drop or rebuild the 2-point "sparkline" so it doesn't imply a shape. Acceptable once events span ≥3 points. |
| 6 | Dashboard premium leaderboard | `pages/dashboard.html:356-424` | Latest retail ÷ latest bulk ratio, ranked | **Fair** — needs one retail + one bulk obs; ratio is meaningful | Clean ranked table; inverse (<1×) highlighted | **KEEP** *(clarify)* | The premium ratio is a genuine differentiator. But it silently divides **metal retail by oxide bulk**, inflating ratios (the article cites 200:1). Keep, but label the form basis so the number is defensible. |
| 7 | Dashboard data-coverage map | `pages/dashboard.html:426-490` | Tile per element colored by coverage grade + observation count | **Good** — it *is* the honest meta-view of sparsity | Clean grid + legend; links to element pages | **KEEP** | This is the right way to be transparent about thin data. Reuse the pattern; it turns a weakness into a credibility signal. |
| 8 | `fluctuation-fallback.html` | `_includes/fluctuation-fallback.html` | No-JS latest price + 30d change per (symbol, tier) | n/a | Well-written, but **included by no template** | **REMOVE** | Dead code (orphaned include). Either wire it as the no-JS baseline under the chart or delete it; today it ships nothing. |
| 9 | Regulatory timeline | `pages/regulatory.html` + `assets/js/regulatory-timeline.js` + `policy_events.yml`/`regulatory/*.yml` | Filterable notice cards + reverse-chron announcement timeline | **Strong** — 11 events + 5 deep notices, all sourced | Polished, accessible, progressively enhanced | **KEEP** | The **crown jewel** (see §6). Don't touch the data model; only elevate it. |
| 10 | Home element grid | `_includes/element-grid.html` (home) | 31 tiles: category color, retail/bulk price, control/demand indicators | **Fair** — prices honest; "—" where absent | Dense, scannable, on-brand | **KEEP** | Core navigation and the at-a-glance promise of the brief. Keep; consider surfacing control status more boldly. |
| 11 | Interactive Ledger (replaces `/prices/` table) | `assets/js/ledger.js` ← `assets/data/elements.json` ← `_data/elements/*.yml` | Filter/search/sortable price table | **Inconsistent** — reads a **different data store** than the server table; `_data/elements/La.yml` is broken placeholder → La shows blanks/garbage with JS on | Functional UI, but numbers diverge from the no-JS page and from element-detail | **REBUILD-CLEAN** | Two sources of truth (`price_records.json` vs `_data/elements/*.yml`) produce different prices for the same element. Repoint to one canonical store (or drop the JS replacement) and fix/remove the placeholder file. |
| 12 | Element two-price cards | `_layouts/element-detail.html:106-154` | Retail Reference + Bulk Benchmark + premium ×, with source line | **Good** — single observed prices, fully attributed | Clean, on-brand, honest empty states | **KEEP** | The signature "two-price system." Exactly the right abstraction; keep verbatim. |
| 13 | Regulatory snapshot stat-cards | `pages/dashboard.html:310-354` | Counts by export-control posture / regulatory state | **Good** — derived from catalog fields | Clean stat-card row, links to tracker | **KEEP** | Accurate, useful, links to the crown jewel. |
| 14 | Hero / about stat counters | `_layouts/home.html:26-31`, `pages/about.html:44-61` | Elements / records / sources / controls counts | **Good** | Simple, legible | **KEEP** *(reconcile)* | Honest, but uses `price_records | size` (238) while methodology cites 285 observations — pick one number and label it (see §4.3). |

---

## 4. Student-project signals (and where they get fixed)

Concrete, fixable tells that make a strong dataset read as a class project rather than a fundable venture.

### 4.1 `.edu` contact address (credibility)
`mironovb@berea.edu` appears in **3 public places**: `pages/about.html:79`, `CONTRIBUTING.md:220`, `humans.txt`. A `.edu` address signals "student, not company."
**Fix:** replace with a domain address (e.g. `data@lanthanides.io` / `hello@lanthanides.io`). → *content/brand phase.*

### 4.2 Stray scratch files at repo root (professionalism)
Untracked junk in the working tree: `chat.md`, `combined.txt`, `combined 2.txt`, `combined 3.txt`, `.arun/`. (`logs/`, `prompts/`, `run-all.sh` are correctly gitignored.) Also committed bytecode dirs `outreach/__pycache__/`, `scripts/__pycache__/` despite `__pycache__/` being in `.gitignore` — they were committed before the ignore rule.
**Fix:** delete the scratch files; `git rm -r --cached` the `__pycache__` dirs. → *repo-hygiene / migration setup phase.*

### 4.3 Two parallel data stores with diverging numbers (data integrity)
- **Prices:** `price_records.json` (238) vs `price_history/*.yml` (285 observations). The "238 price records" stat (home/about) contradicts methodology's "285 observations."
- **Elements:** `element_catalog.yml` (canonical, drives all server pages) vs `_data/elements/*.yml` (drives only `elements.json` → `ledger.js`). With JS on, `/prices/` can show **different prices** than with JS off.
**Fix:** collapse to a single canonical store in the migration; derive everything else from it; label every count. → *data-model phase (high priority).*

### 4.4 Broken / placeholder data shipping (data integrity)
`_data/elements/La.yml` is **malformed placeholder**: literal schema strings `source: "Description of source(s)"`, `applications_summary: "Brief description of primary uses."`, broken indentation, no `price_per_kg`. It flows into `assets/data/elements.json` and the interactive Ledger. A demo dir (`_data/demo/`) and a `generate_placeholder_data.py` script also sit in the repo (demo is build-excluded, but its presence is a tell).
**Fix:** regenerate/repair `La.yml` from canonical data; remove `_data/demo/` and the placeholder generator from the shipped tree. → *data-model phase.*

### 4.5 Apologetic "sparse data" framing (positioning)
The site repeatedly apologizes for thin coverage: `methodology.md:406` "## Why Some Pages Show Sparse Data," dashboard copy "We don't hide thin coverage," "Insufficient data yet," "confidence is generally low." Honesty is good; *apology* is not — it reads as a student hedging.
**Fix:** reframe transparency as a *feature* ("provenance-first; we show our work") and lead with the regulatory intelligence that **is** deep, rather than foregrounding what's missing. The existing `/framework/` page already models this confident, declarative, decision-oriented voice — use it as the in-repo tone reference. → *content/positioning phase.*

### 4.6 No clear value proposition / "who is this for" above the fold (positioning)
The home hero ("Rare earth & critical metal prices, with provenance.") states *what* but not *for whom* or *why now*. `.impeccable.md` names the audience (investors, journalists, analysts) but the page never does. There is no above-the-fold hook tying the (world-class) export-control tracking to a decision a reader is trying to make.
**Fix:** add a one-line audience + value statement and route the eye to the regulatory tracker / movements. → *home redesign phase.*

### 4.7 Design diverges from its own brief (polish)
`.impeccable.md` commits to **IBM Plex Sans/Mono + Source Serif 4** ("serif headings… load-bearing," "monospace for all numeric data"). The shipped site loads **Inter + JetBrains Mono and no serif at all** (`head.html:13`). The "Foreign Affairs / Goldman note" editorial identity is therefore not actually implemented.
**Fix:** decide the type system deliberately in the migration and apply it consistently. → *design-system phase.*

### 4.8 `site.webmanifest` is broken + off-brand (polish/bug)
`assets/images/site.webmanifest` points icons at **`/periodicpricing/assets/images/…`** — a stale GitHub-Pages *project* base path that 404s on the root domain (`www.lanthanides.io`). Its `theme_color: #1a1d23` and `background_color: #ffffff` also contradict the brand tokens used elsewhere (`theme-color #1A5C6B` in `head.html`; paper `#F5F2EC` in the brief).
**Fix:** correct icon paths to `/assets/images/…` and align colors. → *polish / PWA phase.*

### 4.9 Thin-data charts implying trends (covered in §3)
Items #1, #2, #3, #4, #5 above. The migration should treat "≤2 distinct days ⇒ no line/no %move" as a hard rendering rule. → *visualization phase.*

### 4.10 Orphaned data + dead includes (codebase smell)
`_data/news.yml`, `_data/key_developments.yml`, `_data/snapshots/`, and `_includes/fluctuation-fallback.html` are referenced by **no template**. They suggest abandoned iterations.
**Fix:** delete or re-wire during migration. → *cleanup phase.*

### 4.11 Minor: contributor dropdown lists untracked elements
`price-update.yml` offers Pm, Hf, Re (not in the 31-element catalog).
**Fix:** trim to tracked elements (or commit to adding them). → *low priority.*

---

## 5. Assets to preserve (do not lose in the migration)

These are real, hard-won, and differentiating. Carry every one forward.

**SEO & structured data**
- The four `_includes/structured-data-*.html` (WebSite + FAQPage, Product+Offer, Article, BreadcrumbList) — comprehensive JSON-LD with live counts.
- `jekyll-seo-tag`-style meta (title/desc/keywords/canonical/OG/Twitter) in `head.html`, including the per-layout OG title logic.
- `/sitemap.xml` (jekyll-sitemap) and `/feed.xml` (jekyll-feed).
- The custom **`/movements.xml` Atom feed** (`movements.xml`) — hand-rolled, valid, category-tagged.
- `robots.txt`, `humans.txt`, favicons + `site.webmanifest` (fix paths per §4.8), `og-default.png`, `CNAME`.

**Open data**
- `assets/data/elements.json` and `assets/data/fluctuations.json` (`sitemap: false`, stable permalinks) — the public open-data export. Preserve the URLs; fix the underlying store (§4.3/4.4).

**Licensing**
- Dual **CC BY 4.0** (content/data) + **MIT** (code), surfaced in `LICENSE`, `footer.html`, `head.html` `rel="license"`, and the Atom `<rights>`.

**Contributor pipeline**
- `.github/ISSUE_TEMPLATE/{price-update,data-correction,market-note}.yml` + `PULL_REQUEST_TEMPLATE.md`.
- `.github/workflows/community-intake.yml` — the manual-dispatch, `approved`-label-gated, PR-opening "two human checkpoints" flow (and the matching `outreach/community_intake.py`). This consent-/review-gated provenance model is itself a credibility asset and is documented on `/methodology/`.

**Regulatory-monitoring scripts** (currently manual/paused)
- `scripts/scraper/` (`monitor.py`, `sources.yaml` — Chinese-gov + RSS pollers), `scripts/triage.py` (rule-based significance scorer), `scripts/notify/{telegram,email}.py`, `scripts/run_monitor.py` + `run_state.json` (dedup state). The old scheduled GitHub Actions driver has been removed, so these scripts no longer run every 6h or fire automatic alerts.

**Content (the substance)**
- All **31 element pages** (`_elements/*.md`) — sourced applications, market/supply stats, notes, properties, references.
- All **5 articles** (`_articles/*.md`) — footnoted, publication-quality.
- The **`/framework/` operational reference** (`pages/framework.md`) — ~450 lines of sourced import/export decision support (regulatory tiering, US tariff stack, realised-price model, landed-cost decomposition, channels, 2026 trigger calendar). A near-unique companion to the regulatory tracker; preserve verbatim and keep the `/framework/` URL.
- `element_catalog.yml`, `price_records.json`, `policy_events.yml`, `regulatory/*.yml`, `source_registry.yml`, `site_settings.yml`, `methodology.md` — the data and the rules that govern it.
- The two-price (Retail Reference / Bulk Benchmark) model and the `price-selection.html` logic.

---

## 6. Crown jewel — the MOFCOM/GAC regulatory tracker

**The strongest, least-replicable asset on the site is the Chinese export-control tracker** (`pages/regulatory.html`, `_data/regulatory/*.yml`, `_data/policy_events.yml`) — now a *cluster* with its operational companion `/framework/` and paused/manual monitor scripts — and the migration should make it the centerpiece, not a tab buried mid-nav.

Why it's the differentiator:
- **Depth and primary sourcing.** `_data/regulatory/mofcom_18_2025.yml` (and siblings) carry the **announcement number**, the **Chinese reference** (`商务部 海关总署公告2025年第18号`), issuing authority, issue/effective dates, exact affected elements and controlled forms, the **legal basis** (Article 15, Export Control Law of the PRC; 2024 Dual-Use Items Regulations), the **45-working-day** review period, and **suspension state** (e.g. "No. 18 was never suspended; Oct-2025 Nos. 55–62 suspended until 28 Nov 2026"). `policy_events.yml` strings 11 events from the July-2023 Ga/Ge controls through the Feb-2026 Japan sanctions into one coherent timeline.
- **It answers the question the audience actually has.** The brief's primary user (investor/journalist/analyst) needs "is this element controlled, by which announcement, since when, and is it suspended?" — and almost no English-language source assembles this with citations. The element pages already reflect it inline (`Dy.md` banner cites No. 18/2025 + the 28-Nov-2026 suspension key date), and the dashboard/regulatory snapshot quantify it.
- **It's defensible.** Prices are thin and will always be contestable; the regulatory corpus is deep, dated, sourced, and updated as announcements land. It is the thing a funder can verify in five minutes and not find elsewhere.
- **It now ships with the operational companion the prior pass missed.** The **`/framework/` operational reference** (`pages/framework.md`) converts the tracker's *what/when* into procurement *how* — three-tier classification (uncontrolled / general-licence / case-by-case), the live post-IEEPA US tariff stack, a multiplicative realised-price model, four-axis landed-cost decomposition with worked examples, and a 2026 decision-trigger calendar — all reconciled against the same `_data/regulatory/*.yml` corpus, in ~450 lines of confident, sourced, decision-oriented prose (the clearest in-repo counter-example to the apologetic voice of §4.5). The old scheduled regulatory-monitor workflow has been removed; the scripts remain available for manual or future external monitoring.

**Implication for the migration:** elevate the tracker to a hero position (home above-the-fold + a first-class destination), keep its data model intact, and let the (transparent) thin price data play a *supporting* role behind the regulatory intelligence rather than leading with apologies about sparse coverage (§4.5).

---

*End of audit. Later prompts: treat §2 (permalinks) as a hard contract, §3 decisions as the visualization backlog, §4 as the investment-readiness punch-list, §5 as the do-not-break list, and §6 as the product's north star.*
