# QA.md · performance, accessibility & mobile

The production-readiness pass: **performance**, **accessibility (WCAG 2.1 AA)**,
and **mobile/responsive**. This records what was checked, what was fixed, and the
evidence, measured, not estimated.

> **Two passes are recorded here.** §1 to §6 are the original migration pass (Prompt
> 23), written against the **dark** instrument-panel palette. The redesign later
> flipped the theme to **light** (white print-brief), moved a lot of markup, and
> rebuilt the nav/footer/home. **§7 is the redesign accessibility recheck against
> the live light palette** and is the current source of truth for contrast. Where
> §2.1's dark-surface numbers conflict with §7, **§7 wins** (it describes what
> ships today).

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

> **Superseded by §7 for the live site.** The ratios below are for the original
> **dark** palette. The redesign flipped to light; §7 recomputes every pair on the
> white surfaces and records the badge-tint fix. Read §7 for current numbers.

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

---

## 7. Redesign accessibility & mobile recheck (light palette)

The redesign flipped the theme to a light "print intelligence brief" (white
surfaces, near-black text, deep-teal accent), rebuilt the nav as a flat bar, and
rebuilt the footer and home. This pass re-runs the §2/§3 checks against that live
markup. Same method as §0: **computed WCAG ratios** (the `(L1+0.05)/(L2+0.05)`
formula) and **built-output inspection**, with no Lighthouse/axe (still not
installed; no browser on the build host) and no fabricated scores.

### 7.1 Contrast, recomputed on the white palette

Surfaces: `base/surface #ffffff`, `raised #f8f9fa`, `overlay #e9ecef` (hover /
popover). Required: **4.5:1** text, **3:1** non-text. Text-on-white all pass:

| Pair | white | raised | overlay | Verdict |
|:--|--:|--:|--:|:--|
| `fg #1a1a1a` | 17.40 | 16.51 | 14.68 | Pass |
| `fg-muted #4a4e54` | 8.37 | 7.94 | 7.06 | Pass |
| `fg-dim #5a616a` (TH, eyebrow, hints) | 6.26 | 5.94 | 5.28 | Pass |
| `accent #1a5c6b` (links) | 7.53 | 7.15 | 6.35 | Pass |
| `accent-strong #14505d` | 8.99 | 8.53 | 7.58 | Pass |

**White on accent (primary button, active chip)**, the P19 explicit check:
white on `accent #1a5c6b` = **7.53:1** (≥4.5). Confirmed in built CSS: primary
`Button`, `FilterChips` active, and the `/offers` confidence toggle now use an
explicit `text-white` on `bg-accent` (the previous `text-base` resolved to white
only by a fragile fontSize/color name collision, see §7.3).

**Non-text, the form-control border** `border-field #868d95`: white **3.36**,
raised **3.18** (≥3:1, WCAG 1.4.11). Forms sit on white/surface, so the control
boundary passes in every context it appears.

### 7.2 The one regression the light flip introduced: badge/tag text on a tint (FIXED)

Badges and status tags render **colored text on a 10% same-hue tint**
(`text-risk-medium` on `bg-risk-medium/10`, etc.) across `Badge`, `categories.ts`
(`CATEGORY_STYLE`/`CONTROL_STYLE`/`REGULATORY_BADGE`), `regulatory.ts`,
`movements.ts`, `DevelopmentTimeline`, `RegulatoryBanner`, and `Callout`. On the
light palette several of those hues fell **below 4.5:1 on the tint, in their
resting state on white**, a real AA fail, not a hover edge:

| Token (text on its /10 tint, on white) | Before | After (darkened token) |
|:--|--:|--:|
| `risk-medium` (monitored / active licence, 39 uses) | **4.13 FAIL** | **5.80 Pass** |
| `risk-suspended` | **4.36 FAIL** | **5.56 Pass** |
| `risk-low` (normal/clear) | 4.59 (raised 4.36 FAIL) | **5.56 Pass** |
| `risk-high` (restricted) | 5.17 (overlay 4.40 FAIL) | **6.24 Pass** |
| `category-ree-light` | **4.49 FAIL** | **5.72 Pass** |
| `category-strategic` | **4.39 FAIL** | **6.08 Pass** |
| `category-ree-heavy` / `-semiconductor` | pass white, overlay FAIL | **6.04 / 6.56 Pass** |

**Fix (root cause, one edit):** the `risk-*` and `category-*` tokens in
`tailwind.config.ts` were darkened **one step, in-family** (e.g. `risk-medium` from
`#9a6b00` to `#7a5500`, `category-ree-light` from `#2563eb` to `#1d4ed8`). This is
the same dark-ink-on-light-tint pattern the `accent` badge already used
(`accent-strong`) and the static site used for its amber badge
(`darken($reg-export, 10%)`). Because every consumer references the token by name,
the single edit fixes all seven call sites at once, and it is monotonically safe for
the tokens' other uses (text on white only gets darker, still ≥6.4:1; tile bands,
dots, and swatches stay ≥3:1 and clearly the same hue). Verified in built CSS: the
eight new values ship and the old hues are gone. The darkened text-on-tint clears AA
on **white, raised, and the overlay hover** (all ≥4.7:1), so badges are now AA in
every state, with no "hover-only" caveat.

**Movement `up`/`down`/`neutral` left unchanged:** these render as numerics or signs
**on white** (gain 5.24, loss 6.02, flat 4.69, all AA), not as badge text (the
`up`/`down`/`flat` Badge variants are unused), so the static-site movement hues are
kept. Direction also carries a `+`/`−` sign, never color alone (§7.4).

### 7.3 Hardening: the `text-base` white-on-teal collision

`base` is both a fontSize key (1rem) and a color token (`#ffffff` in light mode),
so `text-base` happened to emit *both* a font-size and `color:#fff`. Primary
buttons and active chips relied on that to get white text on teal. It worked (built
CSS confirmed white shipped), but it was fragile: a `tailwind-merge` or a `base`
recolor would silently drop the color, and the `Button` comment even mis-described
it as "near-black." Replaced with explicit `text-white` in `Button`, `FilterChips`,
and `OffersFeed`; corrected the comment. (The element-detail periodic-nav tiles
still use `bg-fg text-base` = white on near-black, ~17:1, left for the element-page
rebuild; correct today.)

### 7.4 Color is never the only signal (re-verified on the rebuilt markup)

| Surface | Redundant non-color cue |
|:--|:--|
| `Badge` / status tags | always a **text label** (`Restricted`, `Export Licence`, `Suspended`, and so on) |
| Movement change (`MovementRow`) | **`+` / `−` sign** prefix on the percent (`sign()`); row hover is shadow-only (no tint) |
| `ConfidenceMeter` / movement confidence | monochrome + **"Low/Medium/High confidence"** text + `aria-label` |
| Element / category tiles | category color + **category short-label** text |

### 7.5 Landmarks, headings, keyboard, skip link

- **One `<main>` + one `<h1>` per page**, built-HTML sweep over **all 50**
  prerendered pages: 0 violations. The root layout's skip target is a
  `<div id="main" tabIndex=-1>`; each page renders its own `<main>` via
  `Container as="main"`.
- **404 fixed:** the Next default `not-found` shipped **no `<main>`**. Added
  `app/not-found.tsx` (`Container as="main"`, one `<h1>`, recovery links,
  `noindex`) so the route now has the landmark + heading like every other page.
- **Skip-to-content** link present, targets the focusable `#main`.
- **Flat nav (`SiteNav`):** mobile toggle is a 44px (`h-11 w-11`) `<button>` with
  `aria-label` + `aria-expanded` + `aria-controls`; the panel is full-width with
  ≥44px (`min-h-[44px]`) rows; links are real (work without JS); active link gets
  `aria-current="page"`; the footer mirrors the full IA server-side. Decorative
  bars are `aria-hidden`.
- **Sortable table header:** still a nested `<button>` (Enter/Space), `aria-sort`
  on the `<th>` (the §2.3 migration fix survived the redesign).
- **Forms** (`SellForm`, `EmailWaitlistForm`, `PriceGaugeForm`): `<label htmlFor>`
  /`<fieldset>`+`<legend>`, `aria-invalid` + `aria-describedby`, per-field +
  form-level `role="alert"`, `border-field` controls. Unchanged by the redesign.
- **`prefers-reduced-motion`** global collapse + **`:focus-visible`** 2px accent
  outline, both intact in `globals.css`.

### 7.6 Mobile / responsive (re-verified at 320 / 375 / 768 / 1024)

- **Flat nav** at 320px: hamburger toggle ≥44px, full-width disclosure panel, 44px
  rows, no horizontal overflow.
- **Element grid** (home + `/elements`): `grid-cols-2` at base (≈130px tiles at
  320px after the `Container` gutter, no overflow), widening to 3/5/6 columns. The
  deliberate 2-up density choice (§3 note) stands.
- **Tables** stay in `overflow-x-auto`; **forms/CTAs** stack and clear the 24px AA
  target; **dashboard panels** reflow to one column. **News images** carry `alt`
  (`image_alt ?? title`) via `next/image` with intrinsic dimensions (no CLS); the
  article hero is `priority`.

### 7.7 Result

`npm run build` green (61 routes); `npm run lint` clean. Chart gate still holds (**0**
`<polyline>` in built output); fonts still self-hosted (**0** `googleapis`/`gstatic`
refs). Files touched: `tailwind.config.ts` (risk/category token darkening),
`components/ui/{Button,FilterChips}.tsx`, `components/offers/OffersFeed.tsx`
(`text-white`), `app/not-found.tsx` (new). Same browser caveat as §5: run
Lighthouse + axe in a real browser before launch.

## 8. Redesign final parity sign-off

The full page-by-page parity record is `docs/OLD-DESIGN.md`. This is the closing
verification after the last rebuilds (element detail, brand logo and images, tools
copy), run 2026-06-02.

### 8.1 What the last rebuilds changed

- **Element detail** (`app/elements/[symbol]/page.tsx`, `ReferencePriceCard.tsx`):
  dropped the methodology callout and the per-card confidence badge so the page
  matches the old calm reference layout. Verification and confidence still travel
  with every record in the sortable provenance table. Block order, premium
  calculation, and keyboard-plus-mouse sorting confirmed against the old layout.
- **Brand logo and images** (`SiteHeader.tsx`, `site.webmanifest`): the header now
  uses the real `logo-48.png` via `next/image` at 24px with the wordmark, matching
  the old `nav.html`. The manifest name is back to plain `lanthanides.io` (the em
  dash is gone) and its `background_color` is white for the light theme. Every
  `/assets/images/*` reference in the built output resolves to a file in `public/`.
- **Tools copy** (`price-gauge`, `sell`, `offers`, `alerts`): removed the vision
  and two-sided-market sections and trimmed the intros. Forms, validation, database
  reads and writes, the price-gauge basis disclosure, and every honesty note
  (review before publish, private contact never shown, feed seeded with screening
  in development, email waitlist sends nothing) are kept.

### 8.2 Closing checks

- `npm run build` green; `npm run lint` clean.
- Em and en dashes over `app components lib _elements _articles`: **0**. Config and
  root code (`next.config.mjs`, `tailwind.config.ts`, `package.json`,
  `prisma/seed.ts`, `app/layout.tsx`, the manifest): **0**.
- Internal-link check over built HTML: **0** dangling links (the only unmatched
  hrefs are `/_next/static/*` runtime assets, which Next serves).
- Redirects intact: `/prices` to `/elements/`, `/vision` to `/about/`,
  `/assets/data/elements.json` to `/api/export/json/`. Element URLs case-sensitive
  (`dynamicParams = false`). Feed and export paths unchanged.
- Chart gate still holds (**0** `<polyline>` in built output).

Deliberate departures from the old site (the `/prices/` Ledger, the elements tile
grid, the dropped dashboard movers board, the sources YAML card) are listed and
justified in `docs/OLD-DESIGN.md` under "Accepted differences from the old site".

## 9. Dashboard & discussion QA hardening (2026-06-07)

A focused correctness / accessibility / route-stability / migration-safety pass
over the dashboard rebuild and the new discussion board (`/dashboard/`,
`/discussion/`, `/discussion/[id]/`, and the `/api/dashboard/*` +
`/api/discussion/*` handlers). Companion specs: `docs/DASHBOARD-ROADMAP.md`,
`docs/DISCUSSION-MODERATION.md`.

**Method (same honesty stance as §0).** No Lighthouse/axe and no headless
browser are available in this environment (none installed; WebFetch cannot reach
`localhost`), so no score is fabricated. Verification was done against a **running
production server** (`next start`) reading the **live Neon dev database** (all
four migrations applied), driven with `curl` over the rendered HTML and JSON, plus
source review of the responsive classes. The repo has **no test runner**
(`jest`/`vitest`/`playwright` absent, no `*.test.*`/`*.spec.*` files) and the only
in-code check pattern (`lib/data/verify.ts` build-time assertions) validates
`_data/`, not the DB — so there was no suitable harness to extend, and these are
recorded as manual checks per the task.

### 9.1 Build, lint, routes

- `npm run build` green (64 static pages generated); `npm run lint` clean.
- Render modes confirmed in the build manifest: **`/dashboard` is Static (SSG)**
  and never reads Prisma at build — the page builds with no database. The DB-backed
  surfaces are all **Dynamic (ƒ)**: `/discussion`, `/discussion/[id]`,
  `/api/discussion/{threads,threads/[id]/replies,moderation}`,
  `/api/dashboard/discussion`. `/api/dashboard/brief` is **Static** (file-derived,
  no DB). This is the SSG/DB-free contract in `DASHBOARD-ROADMAP.md` §5–§6 holding.

### 9.2 Database & migration safety (task 3)

- **Migrations committed and applied.** 4 migrations tracked (`…_init`,
  `…_add_discussion_board`, `…_add_source_tip_fields`,
  `…_add_discussion_notice_link`); `prisma migrate status` → *"Database schema is
  up to date"*; `prisma validate` passes; `prisma generate` run (client current).
  Each discussion schema field maps to a committed migration (the `elementSymbol`
  index + `sourceUrl`/`sourceDate` from the source-tip migration, `noticeId` from
  the notice-link migration); no schema↔migration drift.
- **Build never touches the DB** (verified: a clean `next build` succeeds and emits
  `/dashboard` as static), so a deploy without a reachable database still builds.

### 9.3 Contact-safety — no private fields exposed (task 6)

Confirmed by construction **and** by live inspection of a populated board:

- The `DiscussionThread` / `DiscussionReply` schema has **no email/contact/phone
  column** — `authorName` and `organization` are author-chosen public free text,
  and the thread body hint explicitly warns *"Do not include private contact
  details."* (Contrast `Listing.sellerContact`, which the discussion surfaces never
  read.)
- `toThreadDTO` / `toReplyDTO`, `CommunityThreadItem`, and the explicit `select`s
  in `/api/dashboard/discussion`, the board page, and the secret-gated moderation
  GET all carry display fields only.
- Live scans of the board JSON, a populated thread+reply detail page, and the
  dashboard panel API returned **zero** `email`/`contact`/`sellerContact`/`mailto`
  keys. The maintainer moderation API is **404 when disabled** (no secret set — the
  default) for both GET and POST, and uses a constant-time secret check.

### 9.4 Audit: links, empty states, metadata, responsive (task 1)

- **Broken links: none.** Every internal cross-link resolves against the running
  server — `/elements/<Sym>/` (200), the regulatory `id="notice-…"` anchors (the
  card now renders `noticeAnchor(notice_id)` with `scroll-mt`, matching the
  discussion `ThreadRefs` href), and the dashboard risk-matrix
  `/elements/#<category>` deep-links (the four `rare_earth_light|rare_earth_heavy|
  strategic_metal|semiconductor_metal` ids now exist on `/elements/`). User-supplied
  source links render `rel="nofollow ugc noopener noreferrer"` + `target="_blank"`.
- **Empty states are clear and distinct.** The board separates *board-empty*
  ("No threads yet") from *filter/search-excluded* ("No threads match your search"
  + Clear button), paying for the extra count query only when a filter is active and
  the result is empty. `CommunityIntel` degrades through loading → unavailable
  (DB outage / unmigrated table → `{ok:false}` → "temporarily unavailable", board
  link intact) → empty → list, and ships a `<noscript>` fallback. Premium leaderboard,
  coverage, and the risk matrix each render an explicit empty hint under a filter.
- **Metadata present** on all three pages: `/dashboard` and `/discussion` static
  `buildMetadata` (title/description/keywords/canonical), `/discussion/[id]`
  `generateMetadata` (per-thread title + truncated body description + `modifiedTime`;
  `noindex` on a missing thread). JSON-LD: dashboard `BreadcrumbList`; board
  `WebApplication` + `BreadcrumbList`; thread `DiscussionForumPosting` +
  `BreadcrumbList`.
- **No stale copy.** The dashboard masthead and `getDataGeneratedAt` no longer
  claim a "6-hourly" pipeline (the only remaining "6-hourly" string is an accurate
  comment recording that the monitor was *removed*); the "Dashboard scope" callout
  states plainly the screen is a build-time snapshot.
- **Overflow / responsive.** Every data table (discussion list, risk matrix,
  premium leaderboard, coverage detail) renders inside the shared `Table` /
  `SortableTable` `overflow-x-auto` wrapper, so the 6-column risk matrix and the
  wide thread list scroll rather than overflow at 320px. The board and thread-detail
  two-column layouts use `grid-cols-[minmax(0,1fr)_…]` (the `minmax(0,…)` keeps a
  wide table from forcing page overflow) and stack to one column below `xl`/`lg`.
  Dashboard stat band and lens chips reflow; forms are single-column with native
  controls, labels, `aria-invalid`/`aria-describedby`, and per-field + form-level
  `role="alert"`.
- **End-to-end round trip** (then cleaned up): created a marked thread + reply on
  the live DB via the POST APIs, confirmed they render in the board list (element
  chip, source link, author), the detail page (post, reply, references note,
  source-tip note, JSON-LD), and the dashboard panel API (per-category count → 1),
  then hard-deleted both (cascade) and re-confirmed the board empty. Server-side
  validation mirror rejects a short title and an off-catalog element symbol with
  `400` (no row written); thread/reply status is server-assigned (a body `status`
  is ignored).

### 9.5 Fixes applied in this pass

- **`/discussion/` was missing from `app/sitemap.ts`** though it is a header- and
  footer-nav destination explicitly built to be crawlable (every other nav page,
  and the dynamic `/offers/`, `/sell/`, `/alerts/`, `/tools/price-gauge/`, were
  already listed). Added it (priority 0.6, `daily`); individual `/discussion/[id]`
  threads stay out (dynamic, unbounded, DB-backed). Verified in the built sitemap
  (54 URLs).
- **Render-mode doc drift reconciled.** `DASHBOARD-ROADMAP.md` §1/§5 flagged that
  `ARCHITECTURE.md` §2 and `DEPLOYMENT.md` still called `/dashboard` ISR; the build
  manifest proves it is SSG. Corrected the route-map row and the two `DEPLOYMENT.md`
  mentions to SSG (and noted the discussion panel is a client island, not server
  ISR).

### 9.6 Remaining risks / follow-ups

- **No real-browser / Lighthouse / axe pass** in this environment (as in §0/§5/§7).
  The checks above are curl-rendered-HTML + class review, not a true viewport or an
  ARIA-tree validation. Run both in a browser before launch.
- **Anonymous board, post-moderation by default.** Spam/abuse is possible; the
  mitigations are reactive hide/lock or opt-in pre-moderation
  (`DISCUSSION_REQUIRE_APPROVAL`) plus the secret-gated maintainer API — all
  off by default, documented in `DISCUSSION-MODERATION.md` §9. No rate-limit/captcha
  (deliberately not built).
- **No pagination.** The board lists `take: 100`, the dashboard panel `take: 5`
  (newest); fine at current volume, revisit if the board grows large.
- **Dashboard freshness.** The "Data as of" stamp is a build-time value and can be
  days old (the intraday monitor was removed); already disclosed on-page.

## 10. Modernization refresh contrast recheck (2026-06-10)

The design refresh changed two color tokens: the page background `base`
(`#ffffff` to `#fafbfc`, a faint cool off-white under white cards) and `up`
(`#2e7a4e` to `#2c764b`, darkened one step). Everything else in the refresh is
non-color (radii, layered shadows, header blur, accent-color, text-wrap), so
this section recomputes only the pairs the two color moves touch. Same method
as §7: the WCAG 2.x relative-luminance formula in Node, with `/10` badge tints
resolved by alpha-compositing the token at 10% over the ground.

### 10.1 Text on the new `base` `#fafbfc` (was white; AA threshold 4.5)

| Token | On `#fafbfc` | Was on white |
|:--|--:|--:|
| `fg` `#1a1a1a` | 16.80 | 17.40 |
| `fg-muted` `#4a4e54` | 8.08 | 8.37 |
| `fg-dim` `#5a616a` | 6.05 | 6.26 |
| `accent` `#1a5c6b` | 7.27 | 7.53 |
| `accent-strong` `#14505d` | 8.68 | 8.99 |
| `up` (new `#2c764b`) | 5.33 | 5.53 |
| `down` `#b5342b` | 5.81 | 6.02 |
| `neutral` `#6c757d` | 4.53 | 4.69 |
| `risk-low/-medium/-high/-suspended` | 6.21 / 6.48 / 7.08 / 6.18 | 6.44 / 6.72 / 7.33 / 6.40 |
| `category` ree-light / ree-heavy / strategic / semiconductor | 6.47 / 6.86 / 6.84 / 7.42 | 6.70 / 7.10 / 7.09 / 7.68 |

All pass AA. `neutral` (4.53) is the tightest pair; it renders only as the
"flat" movement word/figure, and it still clears 4.5.

### 10.2 Badge text on its own `/10` tint over the new base (AA 4.5)

risk-low 5.40 · risk-medium 5.59 · risk-high 6.01 · risk-suspended 5.40 ·
ree-light 5.56 · ree-heavy 5.84 · strategic 5.86 · semiconductor 6.33 ·
down 4.98 · **up 4.67** (the motivating fix: the old `#2e7a4e` computed
**4.44** on this tint, the one sub-AA pair the off-white base would have
created; `#2c764b` clears it and also improves `up` as plain text).

### 10.3 Unchanged seams re-confirmed

- White button/chip text on `accent` 7.53; white tooltip text on the new
  inverted `bg-fg` bubble 17.40 (the tooltip moved from gray-on-overlay to
  white-on-near-black, a contrast upgrade).
- `fg-dim` on `raised` 5.94 and on `overlay` 5.28 (table headers, hover).
- `border-field` `#868d95` on the white field fill 3.36 (WCAG 1.4.11 ≥ 3
  non-text). Form fields kept their white fill by moving from `bg-base` to
  `bg-surface`, so this ratio is unchanged by the off-white page.
- Focus ring, selection wash, and reduced-motion handling are untouched; the
  new smooth anchor scrolling is inside the existing reduced-motion collapse.

As in §0/§7: computed ratios and built-output inspection only, no
Lighthouse/axe score quoted (neither tool is installed here).
