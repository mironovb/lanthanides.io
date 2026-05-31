# QA.md — performance, accessibility & mobile (Prompt 23)

The production-readiness pass: **performance**, **accessibility (WCAG 2.1 AA)**,
and **mobile/responsive**. This records what was checked, what was fixed, and the
evidence — measured, not estimated.

> **Companion docs:** `DESIGN-SYSTEM.md` (tokens, primitives, the a11y baseline),
> `VISUALIZATION-AUDIT.md` (the chart data-sufficiency gate), `ARCHITECTURE.md`
> (routes / render modes).

---

## 0. Method & honesty note

No Lighthouse or axe-core run is recorded here: **neither is installed in this
repo** (not a dependency; the unattended build host has no browser), so running
them would mean fabricating a score — forbidden by hard rule #1. Instead this is
a **rigorous manual audit** backed by three objective sources:

1. **Computed WCAG contrast ratios** — every palette pair run through the WCAG
   2.x relative-luminance formula (`(L1+0.05)/(L2+0.05)`). Numbers below are
   from that calculation, not eyeballed.
2. **Build-output inspection** — grepping `.next/server/app/*.html` and
   `.next/static/css/*.css` to confirm fixes actually ship (font self-hosting,
   `next/image` optimizer URLs, landmark/heading counts, the reduced-motion
   query, emitted token colours).
3. **Source review** of every interactive island against the WCAG keyboard /
   name-role-value criteria.

Anyone with a browser should still run Lighthouse + axe DevTools before launch;
§5 lists what a tool would additionally cover.

---

## 1. Performance

### 1.1 Fonts — self-hosted via `next/font/google` (was render-blocking)

**Before:** three families loaded from a Google Fonts `<link rel="stylesheet">`
in `<head>` plus two `preconnect`s — a render-blocking external request on every
page, a third-party origin, and no fallback-metric (layout shift on swap).

**After (`app/layout.tsx`, `app/globals.css`):** `next/font/google` for IBM Plex
Sans, IBM Plex Mono, Source Serif 4 — downloaded at build and served from our own
origin.

| Check | Evidence |
|:--|:--|
| Self-hosted (no Google request) | **0** `fonts.googleapis.com` / `fonts.gstatic.com` refs in built HTML (was 1 stylesheet + 2 preconnects) |
| Subset to `latin` | `subsets: ['latin']` on all three |
| `display: swap` | set on all three |
| No layout shift on swap | `next/font` injects size-adjusted `@font-face` fallback metrics automatically |
| Preloaded, same-origin | 27 subsetted `.woff2` emitted to `_next/static/media/`; `<link rel="preload" as="font">` in `<head>` |
| Still token-swappable | `--font-sans/-mono/-serif` set on `<html>` via the `.variable` classes; Tailwind `fontFamily` unchanged |

`Source_Serif_4` is requested **without** `weight` (it is a variable font on
Google Fonts); the static IBM Plex families enumerate their weights.

### 1.2 Images — `next/image` (was raw `<img>`)

The only **rendered** raster images are on the news surfaces (one article carries
art): the card thumbnail and the article hero. Both converted to `next/image`
(`components/news/ArticleCard.tsx`, `app/news/[slug]/page.tsx`):

- **Thumbnail** — `fill` + `sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 360px"` inside the existing `aspect-[16/9]` box (container reserves space ⇒ **no CLS**); lazy by default (below the fold).
- **Hero** — intrinsic `width={1200} height={721}` + `sizes` + `priority` (it is the article's LCP candidate, sits high on the page). Aspect ratio from width/height ⇒ **no CLS**.
- Verified: `_next/image?url=…` optimizer URLs + responsive `srcset` present in built HTML; hero emits `<link rel="preload" as="image">`. Removed the two `eslint-disable @next/next/no-img-element` shims.

**Not converted, intentionally:** `og-default.png` references are
OpenGraph/Twitter **meta tags** (not rendered `<img>` — `next/image` does not
apply); the header "logo" is a CSS square (`bg-accent`), not an image. Noted so a
future reviewer doesn't hunt for a missing `next/image`.

### 1.3 Client JS — already minimal, confirmed

Server-components-by-default is already the architecture; only genuinely
interactive pieces are `'use client'` (the three forms, `SiteNav`, `FilterChips`,
`Tabs`, `Tooltip`, `SortableTable`/`useSortable` consumers, `RegulatoryView`).
Build first-load JS:

- **Shared baseline: 87.3 kB** (Next/React framework floor).
- Static reference pages: **~101 kB** first-load (≈225 B of page JS).
- Heaviest route `/sell`: **110 kB** (the listing form). News pages rose 101→106 kB from the `next/image` runtime — an accepted trade for optimized, no-CLS images.

No code-splitting changes were needed: routes are already split and islands are
small. No god-component to break up.

### 1.4 Render mode — SSG/ISR confirmed static

From the build manifest: `/`, `/about`, `/elements`, `/regulatory`,
`/methodology`, `/sources`, `/news`, `/movements`, `/data`, `/dashboard`,
`/contribute` are **Static (○)**; `/elements/[symbol]` (31) and `/news/[slug]`
(5) are **SSG (●)**. Only the live-DB / query-driven surfaces (`/sell`,
`/offers`, `/tools/price-gauge`, the `/api/*` handlers) are **Dynamic (ƒ)**, by
design. The dashboard is deliberately SSG (data layer memoises `_data/`;
documented in `app/dashboard/page.tsx`).

### 1.5 Dead code

- All chart components are imported and live (`PremiumLeaderboard`,
  `CoverageGrid` → dashboard + data; `MarketStructure`→`BarTable` → data;
  `PriceHistoryChart`→`LineChart` → element pages). **No dead chart code** — the
  AUDIT §3 removals (30-day movers, fluctuation-fallback) were never ported, so
  there is nothing to delete.
- Removed: the render-blocking font `<link>` block, two `preconnect`s, the
  hardcoded `:root` font variables (now provided by `next/font`).
- Tailwind JIT emits only used utilities, so there is no unused-CSS sweep to do.
- Chart gate intact: **0** `<polyline>` in built output (P10 invariant holds).

---

## 2. Accessibility — WCAG 2.1 AA checklist

| # | Criterion (level) | Status | Notes / evidence |
|:--|:--|:--:|:--|
| 1.1.1 | Non-text content (A) | **Pass** | Article images carry `alt` (`image_alt` ?? title); decorative glyphs/swatches/sparkline dots are `aria-hidden`; sparkline `<svg role="img">` has an `aria-label`. |
| 1.3.1 | Info & relationships (A) | **Pass** | Semantic `<table>`/`<th scope>`, `<dl>` for stats/meta, `<fieldset>/<legend>` for topic groups, `<nav>`, `<main>`, `<header>`, `<footer>`. |
| 1.3.5 | Identify input purpose (AA) | **Pass** | `autoComplete` on email/org/contact inputs; `inputMode` on numerics. |
| 1.4.3 | Contrast — text (AA) | **Pass (fixed)** | See §2.1. `fg-dim` lightened to clear 4.5:1; everything else already ≥4.5. |
| 1.4.11 | Non-text contrast (AA) | **Pass (fixed)** | Form-control borders raised to ≥3:1 (`border-field`); focus ring (accent) is 5.5–6.0:1. See §2.1. |
| 1.4.1 | Use of colour (A) | **Pass** | No colour-only meaning — see §2.2. |
| 1.4.4 | Resize text (AA) | **Pass** | `rem`/Tailwind type scale; `text-size-adjust` set; no fixed-px text traps. |
| 1.4.10 | Reflow (AA) | **Pass** | See §3 — single-column reflow, no horizontal scroll at 320px except where tables intentionally scroll. |
| 2.1.1 | Keyboard (A) | **Pass (fixed)** | **Sortable table headers were mouse-only** — now a real nested `<button>` (Enter/Space). All other islands already keyboard-complete (§2.3). |
| 2.4.1 | Bypass blocks (A) | **Pass (improved)** | Skip-to-content link present; target `#main` now `tabIndex={-1}` so focus reliably lands. |
| 2.4.7 | Focus visible (AA) | **Pass** | Global `:focus-visible` 2px accent outline (offset 2); not removed anywhere. |
| 2.5.8 | Target size minimum (AA) | **Pass** | Mobile nav rows 44px; form controls ~34px, buttons ~32–34px — all ≥ the 24px AA minimum (see §3). |
| 2.3.3 | Animation from interactions (AAA, adopted) | **Pass (added)** | Global `prefers-reduced-motion: reduce` collapses transitions/animations + smooth scroll. |
| 3.3.1 | Error identification (A) | **Pass** | Per-field errors with `aria-invalid` + `aria-describedby`, announced via `role="alert"`; form-level `role="alert"` summary. |
| 3.3.2 | Labels or instructions (A) | **Pass** | Every control has a `<label>`/`<legend>` (currency/unit selects use `sr-only` labels); hints wired via `aria-describedby`. |
| 4.1.2 | Name, role, value (A) | **Pass** | `aria-sort`, `aria-pressed`, `aria-current`, `aria-expanded`+`aria-controls`, `role=tab*`/`tabpanel`, `aria-selected`. |
| 1.3.1 | One `h1` / heading order | **Pass** | Build check: exactly **1 `<main>` and 1 `<h1>` per page**; `PageHeader`→h1, `SectionHeading`→h2 (h3 option). Regulatory page: 1×h1, 2×h2, 1×h3 — no skips. |

### 2.1 Contrast — computed ratios & fixes

Computed against the dark surfaces (`base #0b0d10`, `surface #14171c`,
`raised #1a1d23`, `overlay #1f242b`). Required: **4.5:1** normal text, **3:1**
large text / non-text UI.

**The one text failure — `fg-dim` (labels, captions, fine print, _table
headers_, eyebrows):**

| Token | base | surface | raised | overlay | Verdict |
|:--|--:|--:|--:|--:|:--|
| `fg-dim` old `#6b7178` | 3.95 | 3.64 | 3.42 | 3.16 | **FAIL** (normal text) |
| **`fg-dim` new `#828993`** | **5.51** | **5.09** | **4.78** | 4.42 | **Pass** on base/surface/raised |

This single token drives every `<TH>` (fg-dim on raised — was **3.42**, now
4.78), every eyebrow, every hint and footnote, so the lift is site-wide. The
overlay case (4.42) is a hover/popover surface on which `fg-dim` text does not
appear (hovered rows use `fg-muted`/`fg`; tooltips use `fg`). Hierarchy with
`fg-muted #9aa3ad` is preserved (they differ in size/weight/role).

**Already passing (no change):** `fg` 12.7–15.9; `fg-muted` 6.1–7.6; `accent`
(links) 4.8–6.0; `accent-strong` 6.2–7.7; `up` 5.9–7.3; `risk-medium` 7.0–8.8;
near-black-on-accent (primary buttons / active chips) 6.0; category text 4.7–6.9.

**Non-text — form-control borders (1.4.11):** inputs/selects/textarea sat on
`border-strong #333b46` = **1.6–1.7:1** against the field fill and panel — a
fail (the border is the only thing identifying the control). New **`border-field
#606b7b`** = base **3.60**, surface **3.32**, raised 3.12 — all ≥3:1. Applied to
the shared `fieldClass` in all three forms (`SellForm`, `EmailWaitlistForm`,
`PriceGaugeForm`). Decorative hairline dividers (`border`, `border-strong`) are
left as-is — 1.4.11 exempts pure separators, and they are core to the
instrument-panel aesthetic.

**Minor, accepted:** `down #e5564b` is 4.28:1 on `overlay` (just under 4.5) —
only reachable as a coloured numeric inside a *hovered* row; resting state
(surface/base) is 4.6–5.3 ✓. Left unchanged to keep the price-movement red
stable across the vocabulary; flagged for the eventual light-mode retune.

### 2.2 Use of colour — never the only signal

| Surface | Colour + redundant cue |
|:--|:--|
| `Badge` (categories / 5 reg states / up-down-flat) | always a **text label** |
| Movement change | coloured **+** / **−** **sign** prefix + value |
| `Stat` delta | coloured but the delta text carries the sign |
| `CoverageGrid` | monochrome teal density ramp + **observation count printed on every tile** + legend counts |
| `ConfidenceMeter` | monochrome segments + **"Low/Medium/High confidence"** text + `aria-label` |
| `Callout` | tone colour + **glyph + title text** |
| Element/category tiles | category colour + **category short label** text |
| `Regulatory` legend | colour chip + text label |

### 2.3 Keyboard operability — per island

- **Sortable tables** — **FIXED**: header is now a nested `<button>` (was
  `onClick` on a `<th>`, unreachable by keyboard). `aria-sort` stays on the
  `<th>`. Verified 4 sortable headers → focusable buttons in built `/data`.
- **Primary nav** (`SiteNav`) — disclosure `<button>`s, `aria-expanded` +
  `aria-controls`, Escape closes & restores focus, outside-click/focus-out
  close; links real (work without JS); footer mirrors full IA server-side.
- **Mobile nav** — 44px toggle, `aria-expanded`/`aria-controls`, 44px rows.
- **`FilterChips`** — `<button aria-pressed>` in a labelled `role=group`.
- **`Tabs`** — roving tabindex, arrows/Home/End, `role=tab`/`tabpanel`.
- **`Tooltip`** — focusable trigger, `aria-describedby`, opens on focus, Escape.
- **Forms** — native controls, labels, in-flight disabled state, `role=alert`.

---

## 3. Mobile / responsive

Verified by class review at 320 / 375 / 768 / 1024+ and reflow inspection.

| Area | Behaviour | Status |
|:--|:--|:--:|
| Tables (provenance, premium, sources, price history, source breakdown) | wrapped in `overflow-x-auto`; scroll, never overflow the page | **Pass** |
| Element / "periodic" grid | `grid-cols-2 → sm:3 → md:4 → lg:5`; compact tiles, no overflow ≥320px | **Pass** (see note) |
| Dashboard panels | `RegulatorySnapshot` outer `1 → md:2`; coverage `4 → 6 → 8 → 10`; premium table scrolls | **Pass** |
| Stat grids | `grid-cols-2` base → up to 5 at width | **Pass** |
| Forms | stack to one column; price+currency / qty+unit pairs stay inline and fit; controls ~34px (≥24px AA target) | **Pass** |
| CTAs / buttons | full text, wrap, ≥32px; primary uses AA-contrast near-black on teal | **Pass** |
| Nav | hamburger + full-width disclosure panel, 44px targets, `max-h` + scroll | **Pass** |
| Movements / regulatory / news cards | flex-wrap heads; `auto-fit minmax()` meta grids reflow | **Pass** |

**Note on the element grid:** it stays **2-up on the smallest screens** rather
than literally one column. Compact periodic-style tiles read better two-up on a
phone than as 31 full-width rows, and they do **not** overflow at 320px (verified
by tile content width). This is a deliberate, documented density choice;
everything reflows cleanly above it. The dashboard's two *panels* do reflow to a
single column (`md:grid-cols-2`).

---

## 4. Files touched

- `tailwind.config.ts` — `fg-dim` → `#828993` (AA text); new `border-field`
  `#606b7b` (1.4.11 control boundary).
- `app/globals.css` — drop hardcoded `:root` font vars; add
  `prefers-reduced-motion` block; doc the next/font seam.
- `app/layout.tsx` — `next/font/google` (self-host/subset/swap/fallback); remove
  the render-blocking `<head>` font links; focusable skip target.
- `components/ui/Table.tsx` — sortable header → nested `<button>` (keyboard).
- `components/news/ArticleCard.tsx`, `app/news/[slug]/page.tsx` — `next/image`.
- `components/sell/SellForm.tsx`, `components/alerts/EmailWaitlistForm.tsx`,
  `components/tools/PriceGaugeForm.tsx` — `border-field` on fields.

`npm run build` green (57 routes); `npm run lint` clean.

---

## 5. Known limitations / follow-ups

- **No automated audit run** (Lighthouse/axe not installed; no browser on the
  build host). Run both in a browser before launch — they add real-DOM checks
  this manual pass can't (computed contrast of overlapping layers, focus-order
  traversal, ARIA tree validation, actual LCP/CLS/TBT field-ish numbers).
- **`down` on `overlay`** = 4.28:1 (hover-state coloured numeric only) — accept
  now, retune with the light-mode switch.
- **`category-ree-heavy` on `overlay`** = 4.28:1 (same hover-only edge).
- **Target size**: form controls (~34px) clear the 24px AA minimum but are below
  the 44px AAA comfort target; consider bumping field/button height if a future
  audit prioritises AAA touch ergonomics.
- **Element grid** one-column reflow is intentionally declined (see §3 note).

---

## 6. Route-parity sign-off & legacy removal (Prompt 25)

The final prompt verifies route parity against the AUDIT §2 / MIGRATION §3 URL
contract **before** deleting the quarantined Jekyll tree, then removes it. Method:
build the app, then check the contract against the **built output** (not the
source), because that is what actually ships.

### 6.1 Parity — every old URL resolves or 301s

| Contract (AUDIT §2) | Verified against built output | Result |
|:--|:--|:--:|
| 11 top-level pages (`/`, `/dashboard/`, `/elements/`, `/regulatory/`, `/framework/`, `/movements/`, `/news/`, `/methodology/`, `/about/`, `/sources/`, + `/404`) | route manifest + emitted HTML | **Pass** |
| 31 element pages, **case-sensitive** `/elements/<Sym>/` | 31 per-symbol HTML files emitted; `comm` vs `element_catalog.yml` symbols = empty diff | **Pass** |
| 5 articles `/news/<slug>/` | 5 per-slug HTML files emitted | **Pass** |
| Feeds / SEO handlers `/sitemap.xml`, `/feed.xml`, `/movements.xml`, `/robots.txt` | present in route manifest | **Pass** |
| Statics `/humans.txt`, `/assets/data/fluctuations.json`, `/assets/images/site.webmanifest`, favicons, `og-default.png` | present in `public/` | **Pass** |
| 301s: `/prices`→`/elements/`, `/vision`→`/about/`, `/assets/data/elements.json`→`/api/export/json/` | `next.config.mjs` `redirects()` (`statusCode: 301`) | **Pass** |
| Preserved anchors: `/methodology/#display-price`, `#provenance-chain`, `#data-sources-breakdown`, `#oxide-to-metal`; `/framework/#pricing`, `#us-side-tariff-stack-may-14-2026` | `id="…"` grepped in built `methodology.html` / `framework.html` | **Pass (6/6)** |

### 6.2 Internal link check — 0 dangling links

Every root-relative `href` extracted from the built HTML was diffed against the set
of valid paths (page routes incl. trailing slash, the four feed/handler paths, the
five `/api/*` paths, `public/` statics, the three redirect sources, and the three
dynamic `ƒ` routes that don't prerender to HTML — `/offers/`, `/sell/`,
`/tools/price-gauge/`). After excluding framework-served `/_next/*` assets:
**0 unresolved internal links.**

### 6.3 What was removed (parity met)

- **`legacy/`** — the entire quarantined Jekyll tree (layouts, includes, the 24
  SCSS partials incl. `assets/css/main.scss`, pages, `_config.yml`, `Gemfile*`, and
  the old `assets/js/*` charts — i.e. the AUDIT §3 "REMOVE" JS). The Next build
  never imported from it (`grep` confirmed: the only references are provenance
  comments + historical migration docs).
- **`humans.txt`** and **`movements.xml`** at the repo root — dead Jekyll-Liquid
  sources (`layout: null` front-matter, `{{ site.url }}` tags) fully superseded by
  `public/humans.txt` and `app/movements.xml/route.ts`. Next never served the
  repo-root copies (it serves only `public/` + app routes), so their removal
  breaks no URL.
- Working-tree only (gitignored, never committed): `chat.md`, `combined*.txt`,
  `_site/`, `.jekyll-cache/`.

### 6.4 Documented decision — root `robots.txt` retained

The repo-root `robots.txt` is, like the two files above, a vestigial Jekyll-Liquid
source (`layout: null`, `{{ site.url }}/sitemap.xml`) — and it is **not served**
(the live `/robots.txt` is generated by `app/robots.ts`, which additionally emits
`Disallow: /api/` and the `Host:`/`Sitemap:` lines, verified in the built output).
It is nonetheless **retained**, because the Prompt 25 brief lists "`robots`/manifest"
in its explicit do-not-remove set. This is the one knowing asymmetry in the
cleanup: it is kept to honor that constraint, not because it is functional. If a
later pass is cleared to remove it, `app/robots.ts` already covers the endpoint.

No parity gaps remain; `legacy/` is gone. `npm run build` green (61 routes);
`npm run lint` clean.
