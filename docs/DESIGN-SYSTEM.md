# DESIGN-SYSTEM.md — lanthanides.io

The terminal-grade design system (Prompt 11): the tokens, the base component
library (`components/ui/`), and the layout shell (`components/layout/`) that
every page composes from. Read this before adding UI; prefer composing these
primitives over hand-rolling markup.

> **Companion docs:** `ARCHITECTURE.md` (routes, data contracts),
> `MIGRATION.md` (URL contract, sequencing), `VISUALIZATION-AUDIT.md` (chart
> rules — the data-sufficiency gate is upstream of this system).

---

## 1. Visual principles

The feel is **an instrument panel a procurement officer trusts** — dense,
legible, understated. Five rules, in priority order:

1. **Evidence over decoration.** Every visual element carries information. No
   gradients, no shadows-for-depth, no illustration, no color-for-warmth. If it
   doesn't point at data, provenance, or status, it isn't there.
2. **Color only ever encodes meaning.** The palette is mostly monochrome
   graphite. Non-neutral hue is reserved for exactly three vocabularies — price
   movement (up/down/flat), regulatory status (the five states), and the four
   element categories — plus the single teal accent for interaction. Never use
   these colors decoratively.
3. **Density with hierarchy.** A 13px base and compact tables are correct for
   data; section-level hierarchy (serif headings, generous rules) still has to
   let a non-specialist skim and land. Dense ≠ cramped.
4. **Restraint signals authority.** Subtle borders and dividers separate
   content, never elevation/shadow. Sharp corners. One accent. No motion beyond
   fast hover color transitions.
5. **Numeric data is monospace and right-aligned.** Prices, quantities,
   purities, atomic properties, confidence scores — all render in IBM Plex Mono
   with tabular figures (`font-variant-numeric: tabular-nums`) and right-align
   in tables so digits stack by place value. This is non-negotiable; it is the
   `.numeric` house class and the `numeric` prop on `<TD>`/`<TH>`.

---

## 2. Tokens

Defined in `tailwind.config.ts` (colors, scale) and `app/globals.css` (font
variables, base layer, two house classes). All tokens are **semantic by name**.

### Color

Tokens are plain hex (not `rgb(var() / <alpha-value>)`) on purpose: the
markdown/prose stylesheets (`*-body.css`) resolve them through PostCSS
`theme()`, which can't expand the `<alpha-value>` placeholder, while Tailwind's
`/opacity` modifiers (`bg-risk-high/10`) work fine on hex. Hex keeps both valid.

| Group | Tokens | Use |
|:--|:--|:--|
| **Surfaces** | `base` · `surface` · `raised` · `overlay` | page → panel → header/zebra → hover/popover |
| **Borders** | `border` · `border-strong` | hairline dividers → emphasized edges |
| **Foreground** | `fg` · `fg-muted` · `fg-dim` | primary text/numerics → body → labels/fine print |
| **Accent** | `accent` · `accent-strong` · `accent-dim` | links/active/focus → hover → tint wash |
| **Movement** | `up` · `down` · `neutral` / `flat` | gain / loss / flat (financial) |
| **Regulatory** | `risk-low` · `risk-medium` · `risk-high` · `risk-suspended` | normal → controlled → restricted → suspended |
| **Category** | `category-ree-light` · `-ree-heavy` · `-strategic` · `-semiconductor` | azure / violet / copper / emerald |

The **five named regulatory states** map onto the 4-stop `risk` scale (resolved
by `<Badge>`): `normal → low`, `monitored → medium`, `active → medium`,
`restricted → high`, `suspended → suspended`.

### Type

- **Families** (CSS variables in `globals.css`, swappable without touching
  utilities): **IBM Plex Sans** (`font-sans`, UI/prose) · **IBM Plex Mono**
  (`font-mono`, ALL numerics, tabular) · **Source Serif 4** (`font-serif`,
  headings — editorial authority).
- **Scale:** `2xs` 11 · `xs` 12 · `sm` 13 · `base` 14 · `md` 15 (lead) — the
  small, dense end is overridden for data density; `lg` 18 · `xl` 20 · `2xl` 24
  · `3xl` 30 · `4xl` 36 inherit Tailwind defaults and form the serif heading
  ramp. `h1–h3` are serif with `-0.01em` tracking via the base layer.

### Spacing, radii, motion

- **Spacing:** Tailwind's default scale (4px base) plus `4.5`/`13`/`15`. Keep it
  tight and consistent.
- **Radii:** sharp — `none`/`sm` 1px/`DEFAULT` 2px/`md` 3px. No rounded cards.
- **Borders over shadows:** there is no `boxShadow` token. Separation is always
  a border or a surface step.
- **Motion:** `duration-fast` 120ms / `duration-base` 200ms, for hover color
  transitions only. No entrance/decorative animation (see VISUALIZATION-AUDIT).
- **Letter-spacing:** `tightish` -0.01em (headings) · `caps` 0.08em (uppercase
  table headers / chip labels) · `eyebrow` 0.2em (the mono uppercase kicker).

### House classes (`@layer components` in `globals.css`)

- `.eyebrow` — the mono, uppercase, `2xs`, dimmed kicker above headings/panels.
- `.numeric` — the data convention in one class: `font-mono`, tabular figures,
  right-aligned.

---

## 3. Base components (`components/ui/`)

Import from the barrel: `import { Panel, Stat, Badge } from '@/components/ui'`.
Most are server components; the interactive few are marked **client**.

| Component | Use it for | Notes |
|:--|:--|:--|
| `Table` + `THead`/`TBody`/`TR`/`TH`/`TD` | any static data table | compact, zebra-free, hairline-ruled. `numeric` prop → mono + tabular + right-aligned. `TH` supports `sortable`/`sortDir`/`onSort` (wires `aria-sort` + ↑/↓/↕). Server-safe (no hooks). |
| `SortableTable` + `useSortable` | the common sortable table | **client.** Column-driven; nulls sort last; numeric columns default to desc-first. Renders full HTML (works without JS). Use the hook directly when you need custom cell markup. |
| `Card` / `Panel` | bordered surfaces | `Card` = bare graphite box (`padding`, `interactive`). `Panel` = card + header bar (`eyebrow`, serif `title`, `actions`). |
| `Badge` / `Chip` | status + labels | `Badge` variants are the meaning vocabulary (categories, 5 regulatory states, up/down/flat, accent). Reg/control variants render mono+uppercase. `Chip` = quiet non-semantic tag with optional color `dot` (legends). |
| `Stat` / `StatGrid` | big-number readouts | value is always mono+tabular; `delta`+`trend` carry up/down/flat color. `StatGrid` is a semantic `<dl>`. |
| `Button` / `LinkButton` | actions / navigation | variants `primary` (teal), `secondary`, `ghost`, `danger`; sizes `sm`/`md`. Use `LinkButton` for routing, never a button that navigates. |
| `Tabs` | switch between views | **client.** Full WAI-ARIA: roving tabindex, arrow/Home/End keys, panels stay in DOM. |
| `FilterChips` | single-select filter strip | **client, controlled** (parent owns state). The generalized base of the regulatory element filter; `aria-pressed`, click-active-to-clear. |
| `Tooltip` | supplementary definitions | **client.** Opens on hover AND focus, `aria-describedby`, Escape to close. Never hide essential info here. |
| `Callout` | caveats, methodology notes | left-accent + faint tint; tones `note`/`info`/`warning`/`danger`/`success` (all from the semantic scale). |
| `Breadcrumbs` | the trail under the header | `items: Crumb[]`; last is current (`aria-current`). Visual only — JSON-LD is emitted separately. |
| `SectionHeading` | section titles | optional `swatch` (category color), `count`/`actions` (right), `description`, anchor `id` (with scroll-margin for the sticky header). |

`cn(...)` is the tiny class-name joiner (no `clsx`/`tailwind-merge` dependency).

---

## 4. Layout shell (`components/layout/`)

Wired into `app/layout.tsx`; the `<body>` is a `min-h-screen` flex column so the
footer sits at the bottom.

- **`SiteHeader`** — sticky top bar: brand mark + wordmark, primary nav. The
  interactive `SiteNav` island (client) handles active-route highlighting
  (`usePathname`) and the mobile disclosure menu.
- **`SiteFooter`** — license (CC BY 4.0), open-data exports, contribute/contact,
  secondary nav groups. The open-data framing is load-bearing: the dataset *is*
  the product.
- **`Container`** — the one content column (`max-w-content`, 72rem, consistent
  gutters). Header and footer use it. Pages still render their own `<main>`;
  Prompt 12 migrates page bodies onto `Container` + these components.
- **`nav.ts`** — the single source of truth for header + footer links (only
  routes that exist today; commercial stubs added when they land).

A skip-to-content link targets `#main` (the flex-1 wrapper around `children`).

---

## 5. Theme & the light-mode path

The shipped theme is now the **light "print intelligence brief"** — white
surfaces, near-black text, a single deep-teal accent (`#1A5C6B`), and the
saturated category hues — matching the last deployed static (Jekyll) site
(`_sass/_variables.scss`) and the `.impeccable.md` brand. It replaced the
original dark instrument-panel theme via a pure **token-value edit**: the switch
touched only `tailwind.config.ts` (colors + type scale + radii/shadows),
`app/globals.css` (16px base, Inter headings), the font imports in
`app/layout.tsx` (Inter + JetBrains Mono), and three components that opted into
subtle white-card elevation (`Card`/`Panel`, `SiteHeader`, `ElementCard`). No
page changed a single color utility — proof the semantic-token discipline held:

- No page or component names a literal color — they reference `surface`, `fg`,
  `accent`, `risk-*`, `category-*`. So switching the theme was a
  **token-value edit** (change the hex in `tailwind.config.ts`), never a
  utility-class rewrite. A few static-site values were darkened to clear WCAG AA
  on white (dim text, the suspended gray, the gold used for text, the field
  border); all text pairs now pass 4.5:1 (see docs/QA.md).
- **The two inversion seams that made this safe:** primary buttons / active
  chips set their text color to the `base` token (page background) on an
  `accent` fill, and a few tiles set `fg`-colored text on a `bg-fg` chip — both
  flip together with the surface tokens, so light-on-teal and light-on-dark
  stay correct without per-component edits.
- **Why hex, not CSS variables:** a `rgb(var(--x) / <alpha-value>)` token layer
  would let a `[data-theme]` attribute swap themes at runtime — but it would
  break the ~150 `theme('colors.*')` calls in the `*-body.css` prose
  stylesheets (the `<alpha-value>` placeholder is only expanded by Tailwind's
  utility generator, not by `theme()`), *and* hex is required for the
  `/opacity` modifiers used throughout the components. Until those prose styles
  are migrated to utilities, hex tokens are the correct seam. A later prompt can
  introduce a runtime-swappable variable layer once that constraint is removed.

When the light switch happens: edit the surface/foreground/border hexes (and
re-check `text-base`-on-accent contrast, since `primary` buttons and active
chips use near-black text on teal). The category/movement/risk hues are already
tuned to read on either ground and should need only minor adjustment.

---

## 6. Accessibility baseline

- Semantic HTML first (`<nav>`, `<dl>`, `<table>`, `<button>`); ARIA only to
  fill gaps (`aria-sort`, `aria-pressed`, `aria-current`, `role=tab*`).
- Global `:focus-visible` outline (2px accent) — components don't remove it.
- Interactive islands are keyboard-complete: Tabs (arrows/Home/End), FilterChips
  (Tab + Enter/Space), Tooltip (focus + Escape), mobile nav (`aria-expanded`).
- Color is never the only signal: badges carry text labels, movement shows sign.
