# lanthanides.io Improvement Plan

Last updated: 2026-04-08

---

## 1. What Exists Now — Complete Inventory

### Configuration & Infrastructure

| File | Purpose |
|:--|:--|
| `_config.yml` | Jekyll config: collections (`elements`, `articles`), plugins (feed, seo-tag, sitemap), kramdown, permalink `:pretty` |
| `Gemfile` | Jekyll ~4.4 + webrick + 3 plugins |
| `CNAME` | Custom domain: www.lanthanides.io |
| `.gitignore` | Excludes _site, sass-cache, invoices, .env, prompts/, logs/ |
| `LICENSE` | Dual license: MIT (code), CC BY 4.0 (content/data) |
| `README.md` | Project documentation: structure, data workflows, deployment |
| `robots.txt` | Standard SEO directives |
| `humans.txt` | Creator metadata |
| `.impeccable.md` | Design brief: user personas, brand personality, aesthetic direction, UI commitments |

### Data Files (`_data/`)

| File | Purpose | Records |
|:--|:--|:--|
| `element_catalog.yml` | 31 elements: symbol, name, Z, category, export control, trade forms, notes | 31 entries |
| `price_records.json` | All price data: provenance, normalization, confidence, verification | ~6,500 lines, ~200+ records |
| `news.yml` | News feed items with dates, headlines, bodies, article links, element tags | 14 entries |
| `policy_events.yml` | Structured policy timeline: dates, types, affected elements, source citations | 12 events |
| `key_developments.yml` | Homepage summary of active export controls | 6 entries |
| `source_registry.yml` | 5 curated data sources with trust tiers | 5 sources |
| `alternative_supply.yml` | Non-dominant sourcing for 5 elements (Nd, Dy, Ga, Ge, W) | 5 entries |
| `site_settings.yml` | Thresholds: freshness (90/180d), confidence (0.5/0.8), heatmap baselines, labels |
| `demo/demo_price_records.json` | Dev-only sample data (excluded from build) |

### Layouts (`_layouts/`)

| File | Purpose |
|:--|:--|
| `default.html` | Shell: head.html + header + main + footer + JS |
| `home.html` | Homepage: header, news + key developments row, category legend, element grid |
| `element-detail.html` | Element pages: identity block, retail/bulk price cards, content, provenance table, nav bar |
| `article.html` | Long-form articles with structured data, hero images, element tags |
| `page.html` | Simple wrapper (used by methodology) |
| `data-page.html` | Wrapper with description support (used by sources, regulatory, supply-risk, heatmap) |

### Includes (`_includes/`)

| File | Purpose |
|:--|:--|
| `head.html` | Full `<head>`: favicons, fonts (Google Fonts), SEO meta, OG/Twitter cards, canonical |
| `header.html` | Fixed header: logo + brand name + 6 nav links |
| `footer.html` | Footer: nav, data freshness badge, methodology blurb, license/copyright |
| `price-selection.html` | Shared logic: selects retail ref (metal-preferred, 5g-1kg, conf >= 0.5) and bulk ref (most recent, conf >= 0.6) |
| `provenance-table.html` | Sortable price records table filtered by element |
| `heatmap-grid.html` | Element grid with data attributes for JS-driven heatmap coloring |
| `disclaimer.html` | Data integrity statement |
| `structured-data-site.html` | Schema.org WebSite + FAQPage JSON-LD |
| `structured-data-element.html` | Schema.org Product JSON-LD per element |
| `structured-data-article.html` | Schema.org Article JSON-LD |
| `structured-data-breadcrumb.html` | BreadcrumbList JSON-LD |

### Pages (`pages/`)

| File | URL | Purpose |
|:--|:--|:--|
| `elements.html` | `/elements/` | Full directory: 4 category sections, table per category with prices, control status |
| `news.html` | `/news/` | Featured hero story + tile grid timeline |
| `regulatory.html` | `/regulatory/` | Active controls by element + MOFCOM announcement timeline |
| `supply-risk.html` | `/supply-risk/` | Concentration bars + risk cards + policy timeline |
| `sources.html` | `/sources/` | Trust tiers table + registered sources + add-new-source guide |
| `heatmap.html` | `/heatmap/` | Price dislocation heatmap with baseline controls |
| `methodology.md` | `/methodology/` | Full methodology: display prices, normalization, verification, trust tiers |

### Element Collection (`_elements/`) — 31 files

All 31 element pages follow a consistent structure:
- Front matter: layout, symbol, name, Z, category, title, description, keywords, permalink
- Regulatory banner (for controlled elements: Dy, Ga, Tb, etc.)
- Applications table (5 rows)
- Market & Supply stats (2-column grid)
- Verified Offers section with `provenance-table.html` include
- Important Notes (2-3 items)
- Compact physical properties block
- References list
- Related elements links

**Elements covered:** La, Ce, Pr, Nd, Sm, Y, Sc (light REE); Eu, Gd, Tb, Dy, Ho, Er, Tm, Yb, Lu (heavy REE); Te, V, Sb, W, Bi, Mo, Zr, Ta, Nb, Co, Li (strategic); Ga, Ge, Se, In (semiconductor)

### Articles Collection (`_articles/`) — 2 files

| File | Title |
|:--|:--|
| `chinas-invisible-rare-earth-wall.md` | Deep analysis of China's 6-layer domestic regulatory architecture (~200 lines + 21 footnotes) |
| `ebay-rare-earth-market-research-april-2026.md` | Multi-platform retail pricing survey across eBay, Alibaba, Amazon |

### Stylesheets (`_sass/`) — 21 partials

`_variables`, `_reset`, `_mixins`, `_typography`, `_layout`, `_header`, `_footer`, `_home`, `_cards`, `_badges`, `_tables`, `_panels`, `_heatmap`, `_element-detail`, `_elements-page`, `_news-page`, `_article`, `_search`, `_supply-risk`, `_charts`, `_periodic-nav`, `_responsive`, `_print`

Entry point: `assets/css/main.scss` imports all partials.

### JavaScript (`assets/js/`) — 5 files

| File | Purpose | Status |
|:--|:--|:--|
| `main.js` | Entry point, initializes SML_Sort | Active |
| `sort.js` | Table column sorting (price, date, text) | Active |
| `heatmap.js` | Baseline comparison and heatmap coloring | Active |
| `search.js` | Client-side element search with keyboard nav | **Broken: no HTML mount point** |
| `charts.js` | Canvas sparkline charts with tooltip | Active (unused — no pages mount it) |

### Python Scripts (`scripts/`) — 5 files + requirements.txt

| File | Purpose |
|:--|:--|
| `validate_data.py` | Comprehensive schema/integrity validation for price_records, policy_events, source_registry |
| `normalize_prices.py` | Currency/unit normalization to USD/kg |
| `import_invoices.py` | PDF/CSV/XLSX invoice ingestion |
| `import_offers.py` | Web offer scraping with source-specific adapters |
| `build_snapshots.py` | Dated price data snapshots |
| `generate_placeholder_data.py` | Test data generation utility |

### Media (`assets/images/`)

Favicons (ico, 16px, 32px, apple-touch, android-chrome 192/512), logos (48, 128), article images (china-rare-earth-controls at 600/1200px), `site.webmanifest`

---

## 2. What's Working Well — Keep As-Is

### Content quality
- **Element pages are exceptional.** All 31 have real, sourced applications tables, market stats, important notes, physical properties, and references. This is genuinely valuable content.
- **Two long-form articles** are deeply researched with proper citations and footnotes. The "China's Invisible Rare Earth Wall" article is publication-quality.
- **Data integrity philosophy** is sound: no fabrication, confidence scores, verification statuses, trust tiers. This is a real differentiator.

### Data architecture
- `element_catalog.yml` is comprehensive and well-structured.
- `price_records.json` schema is thorough: provenance, normalization, confidence, verification — all the right fields.
- `policy_events.yml` and `news.yml` are clean, well-sourced data.
- `price-selection.html` logic is correct: metal-preferred retail, most-recent bulk, with sensible confidence thresholds.

### Site architecture
- Jekyll collections (`elements`, `articles`) are correctly configured.
- Structured data (JSON-LD) for WebSite, Product, Article, Breadcrumb — solid SEO foundation.
- SEO meta tags (OG, Twitter, canonical, keywords) are comprehensive.
- Dual retail/bulk price model is the right abstraction for this domain.

### CSS architecture
- SCSS partial organization is clean and well-separated.
- Variable system with design tokens is a good foundation.
- Responsive breakpoints are well-chosen.
- Print stylesheet exists.

### Tooling
- `validate_data.py` is well-written with proper error/warning separation and `--strict` mode.
- `.impeccable.md` design brief captures the right aesthetic.

---

## 3. What Needs Improvement

### 3.1 Brand Color Mismatch (HIGH)

**Current** `_variables.scss`:
- `$bg-primary: #ffffff` (pure white)
- `$accent-teal: #1a8a5c` (green-teal)
- `$accent-amber: #b8860b` (dark goldenrod)
- `$text-primary: #1a1d23` (dark blue-gray)

**Target** brand tokens:
- primary: `#1A5C6B` (deep teal — more blue than current green-teal)
- secondary: `#D4A847` (amber/gold — warmer and lighter than current)
- background: `#F5F2EC` (off-white/warm paper — currently pure white)
- text: `#1A1A1A` (true near-black — currently has blue undertone)

**Impact:** The entire site reads as generic/cool when it should read as warm/authoritative. The warm paper background especially would give the "intelligence brief" feel described in `.impeccable.md`.

**Files to change:** `_sass/_variables.scss`, then cascade through all partials that hard-code colors instead of using variables.

### 3.2 Search Is Wired But Not Mounted (HIGH)

`search.js` is loaded and references `#element-search` and `#search-results`, but no HTML element with those IDs exists anywhere in `_includes/header.html` or any layout. `_sass/_search.scss` has full styling.

**Impact:** Users have no way to search for elements. The search feature is complete in JS and CSS but invisible.

**Fix:** Add search input HTML to `header.html`.

### 3.3 Charts Module Has No Mount Points (MEDIUM)

`charts.js` (SML_Charts) looks for `.sparkline-canvas` elements, but no page renders any `<canvas class="sparkline-canvas">`. The chart module is complete (high-DPI, tooltips, price change annotation) but never instantiated.

**Fix:** Add sparkline charts to element detail pages where multiple price records exist for the same element. Wire `data-values` and `data-dates` from `price_records.json`.

### 3.4 default.html Only Loads sort.js Globally (LOW-MEDIUM)

`default.html` loads `main.js` and `sort.js` but not `search.js`, `heatmap.js`, or `charts.js`. Those modules are never loaded.

**Fix:** Conditionally load JS based on page layout, or load all deferred.

### 3.5 Element Grid Price-Selection Logic Duplicated (MEDIUM)

`pages/elements.html` (lines 62-99) duplicates the full retail/bulk selection algorithm that already exists in `_includes/price-selection.html`. Any change to selection criteria must be made in two places.

**Fix:** Refactor `elements.html` to use `{% include price-selection.html %}` like `home.html` and `element-detail.html` do.

### 3.6 Homepage Element Grid Could Show Export Control Status (MEDIUM)

The element tiles on the homepage show prices, form, and date but don't visually distinguish export control status. The `cn_export_control` indicator icons exist but they're small emoji-style markers. The `.impeccable.md` brief says "Risk is legible at a glance" — the homepage grid doesn't achieve this yet.

### 3.7 Alternative Supply Data Is Sparse (LOW)

Only 5 of 31 elements have entries in `alternative_supply.yml`. The supply-risk page shows "No alternative sources documented" for 26 elements. The file header says "PLACEHOLDER DATA."

**Impact:** The supply-risk page looks underpopulated for most elements.

**Not actionable now** — this requires real research, not code changes.

### 3.8 No `og-default.png` Image (LOW)

`head.html` references `/assets/images/og-default.png` as fallback OG image, but no such file exists in the images directory. Social sharing will show a broken image for pages without a specific `page.image`.

**Fix:** Create an OG image (1200x630) using the brand identity.

### 3.9 Footer Heatmap and Sources Links Not in Header Nav (LOW)

Footer nav includes links to `/heatmap/` and `/sources/` that aren't in the header nav. These are useful pages but somewhat hidden.

### 3.10 No Dark Mode (LOW)

`.impeccable.md` says "Light mode primary" — implying dark mode is a secondary concern, not absent. CSS variables are in place but no prefers-color-scheme media query exists.

### 3.11 Google Fonts Render-Blocking (MEDIUM)

`head.html` loads three font families (IBM Plex Sans, IBM Plex Mono, Source Serif 4) synchronously from Google Fonts. This blocks first paint.

**Fix:** Add `font-display: swap` (already in the `display=swap` parameter, which is correct), but also consider `<link rel="preload">` for critical font files.

### 3.12 Heatmap Page JS Not Loaded (MEDIUM)

`heatmap.html` includes the heatmap grid HTML but `heatmap.js` is never loaded by `default.html`. The heatmap controls render but clicking baseline buttons does nothing.

**Fix:** Load `heatmap.js` on the heatmap page.

---

## 4. What's Missing That Should Be Added

### 4.1 Search Input in Header

The most impactful missing feature. All code exists; just needs HTML.

### 4.2 Per-Element Sparkline Charts

Element detail pages with multiple price records should show a small price trend chart. The `charts.js` module is ready.

### 4.3 Proper JS Loading Strategy

Add script loading for `search.js`, `heatmap.js`, and `charts.js` where needed. Either conditionally per layout or all deferred in `default.html`.

### 4.4 Brand Color Application

Apply the target brand tokens throughout. The warm paper background (`#F5F2EC`) would especially transform the feel from "generic web app" to "intelligence brief."

### 4.5 Homepage Quick Stats / Summary Bar

A concise stats bar above the element grid: total elements tracked, total price records, latest data date, active export controls count. The footer has some of this but it's not prominent.

### 4.6 Element-to-Element Comparison

No way to compare two elements side by side. Not critical for v1 improvements but worth noting for the future.

---

## 5. Proposed Order of Changes

Priority is based on: (a) impact on user experience, (b) effort required, (c) risk of breakage.

### Phase 1 — Fix Broken Features (highest impact, lowest risk)

1. **Mount the search input.** Add `<input id="element-search">` and `<div id="search-results">` to `header.html`. Load `search.js` in `default.html`. Immediate usability win.

2. **Fix JS loading.** Load `search.js`, `heatmap.js`, and `charts.js` (deferred) in `default.html` so all interactive features work.

3. **Deduplicate price-selection logic.** Replace inline selection in `pages/elements.html` with `{% include price-selection.html %}`.

### Phase 2 — Apply Brand Identity (high impact, moderate effort)

4. **Update `_variables.scss` with brand tokens.**
   - `$bg-primary`: `#ffffff` -> `#F5F2EC` (off-white/paper)
   - Primary accent: `#1a8a5c` -> `#1A5C6B` (deep teal)
   - Secondary accent: `#b8860b` -> `#D4A847` (amber/gold)
   - `$text-primary`: `#1a1d23` -> `#1A1A1A` (true near-black)
   - Cascade through all partials: update any hard-coded hex values that should use the new tokens.

5. **Refine card/panel backgrounds** to work against the warm paper base. Cards should remain white (`#ffffff`) to create paper-on-paper layering.

6. **Update `theme-color` meta tag** from `#1a1d23` to `#1A5C6B`.

### Phase 3 — Add Interactive Features (high impact, moderate effort)

7. **Wire sparkline charts into element detail pages.** For each element with 3+ price records, render a `<canvas class="sparkline-canvas">` with `data-values` and `data-dates` populated from price_records. Add `charts.js` to the element-detail layout.

8. **Add homepage stats bar.** Show element count, price record count, latest data date, and active control count above the element grid.

### Phase 4 — Navigation & Discovery (medium impact, low effort)

9. **Add search to mobile nav.** Ensure search works at `bp-max-md` breakpoint.

10. **Add heatmap and sources to header nav** or restructure nav to surface these. Currently 6 items in header; consider grouping or using a "More" dropdown for secondary pages.

### Phase 5 — Polish & Performance (lower impact, varies)

11. **Create `og-default.png`** for social sharing fallback.

12. **Font loading optimization.** Add `preload` hints for the most critical font weights.

13. **Audit hard-coded colors** throughout all 21 SCSS partials. Replace any remaining hex literals that should be variables.

14. **Add prefers-color-scheme dark mode.** The variable-based CSS architecture makes this feasible. Define dark-mode variable overrides in a `@media (prefers-color-scheme: dark)` block.

---

## Constraints (Reiterated)

- **No invented prices.** Only prices already in `price_records.json` will be displayed. Empty states are preferred to fabrication.
- **No placeholder data.** If real data doesn't exist for a field, show the empty state.
- **Preserve all existing data and content.** Improve structure and presentation around it.
- **Jekyll + GitHub Pages only.** No React, no build tools, no framework migrations.
- **Brand tokens:** primary `#1A5C6B`, secondary `#D4A847`, background `#F5F2EC`, text `#1A1A1A`.
