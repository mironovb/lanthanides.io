# RECON — lanthanides.io

Repo: `/Users/mironovb/lanthanides.io` — Next.js 14.2 App Router, TypeScript strict, Tailwind 3.4, file-based data store (`_data/`, `_elements/`, `_articles/`). No test framework. Ignored per brief: `periodictech/`, `specimen-kit/`, `logs/`, `outreach/`, `invoices/`, `prompts/`.

---

## 1. Navigation

### `/Users/mironovb/lanthanides.io/components/layout/nav.ts`

Item shape (exact):

```ts
export interface NavItem {
  href: string;
  label: string;
  /** Off-site link (e.g. GitHub): rendered as a new-tab <a rel="noopener">. */
  external?: boolean;
  /** Same-origin non-page resource (an export endpoint): rendered as a plain <a>. */
  raw?: boolean;
}
```

There is **no badge/pill field today** — adding a "Preliminary" pill means extending `NavItem` (e.g. `badge?: string`) and rendering it inside `NavLink` in `SiteNav.tsx` (see below) and optionally `FooterLink` in `SiteFooter.tsx`.

Exported constants (all `NavItem[]` unless noted):

- `NAV_LINKS` — header row: `/` "Prices", `/regulatory/` "Regulatory", `/news/` "News", `/data/` "Open Data", `/about/` "About".
- `CONTRIBUTE_CTA: NavItem` — `{ href: '/contribute/', label: 'Add a price' }`, rendered as the always-visible button in `SiteHeader` (outside the collapsible nav, so it survives mobile).
- `FOOTER_LINKS` — Prices, Regulatory, News, Open Data, Methodology, Framework, `/tools/price-gauge/` "Price Gauge", `/tools/price-map/` "Price Map", About, Contribute.
- `OPEN_DATA_EXPORTS` — `{ href: '/api/export/json/', label: 'JSON', raw: true }`, `{ href: '/api/export/csv/', label: 'CSV', raw: true }`.

All hrefs carry the **trailing slash** (hard URL contract, see §7).

### `/Users/mironovb/lanthanides.io/components/layout/SiteHeader.tsx` (server component)

```tsx
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface supports-[backdrop-filter]:bg-surface/85 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="lanthanides.io home">
          <Image src="/assets/images/logo-48.png" alt="lanthanides.io" width={24} height={24}
                 className="h-6 w-6 shrink-0" priority />
          <span className="font-mono text-sm font-semibold tracking-tightish text-fg">
            lanthanides.io
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteNav />
          <Link href={CONTRIBUTE_CTA.href} className={buttonClasses('primary', 'md', 'whitespace-nowrap')}>
            <span aria-hidden="true">+</span> {CONTRIBUTE_CTA.label}
          </Link>
        </div>
      </Container>
    </header>
  );
}
```

`sticky` on the header is the positioning context for the mobile panel (`top-full`).

### `/Users/mironovb/lanthanides.io/components/layout/SiteNav.tsx` (`'use client'`)

Active-link logic + the exact render (a badge would attach inside `NavLink`, after `{item.label}`):

```tsx
const trim = (p: string) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);

function NavLink({ item, active, onNavigate }:
  { item: NavItem; active: boolean; onNavigate: () => void }) {
  const className = cn(
    'rounded-md px-3 py-1.5 text-sm transition-colors duration-fast',
    // Full-width 44px rows in the mobile panel; inline on desktop.
    'max-md:flex max-md:min-h-[44px] max-md:w-full max-md:items-center',
    active
      ? 'bg-accent/10 font-semibold text-accent'
      : 'font-medium text-fg-muted hover:bg-overlay/60 hover:text-fg',
  );
  if (item.external) {
    return <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{item.label}</a>;
  }
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={className}>
      {item.label}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const h = trim(href);
    const p = trim(pathname);
    return p === h || p.startsWith(`${h}/`);
  };

  return (
    <>
      {/* Mobile toggle (two bars) */}
      <button type="button" aria-label="Toggle navigation" aria-expanded={open} aria-controls="site-nav"
              onClick={() => setOpen((v) => !v)}
              className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5 md:hidden">
        <span aria-hidden="true" className="block h-0.5 w-5 rounded-sm bg-fg" />
        <span aria-hidden="true" className="block h-0.5 w-5 rounded-sm bg-fg" />
      </button>

      <nav id="site-nav" aria-label="Main navigation"
challenge        className={cn('items-center gap-1 md:flex',
          open
            ? 'absolute left-0 right-0 top-full flex flex-col gap-0.5 border-b border-border bg-surface px-4 py-3 shadow-lg'
            : 'hidden')}>
        {NAV_LINKS.map((item) => (
          <NavLink key={item.href} item={item}
                   active={!item.external && isActive(item.href)}
                   onNavigate={() => setOpen(false)} />
        ))}
      </nav>
    </>
  );
}
```

(Note: the `challenge` token above is a transcription artifact of my rendering — the real line is plain `className={cn(...)}`; the logic and classes are verbatim.)

Key facts for a new nav entry:
- Desktop and mobile render the **same** `NAV_LINKS` list from one `<nav>`; there is no separate mobile list to update.
- `isActive('/')` matches only `/` (because `trim('/') === '/'` and `p.startsWith('//')` is false) — root is safe.
- A nav item at e.g. `/marketplace/` automatically highlights on `/marketplace/anything`.

`SiteFooter` (`/Users/mironovb/lanthanides.io/components/layout/SiteFooter.tsx`) renders `[...FOOTER_LINKS, ...OPEN_DATA_EXPORTS]` through a local `FooterLink` that branches on `external` → new-tab `<a>`, `raw` → plain `<a>`, else `<Link>`. It also reads live stats via `getElements()` / `getPriceRecords()`.

Barrel: `/Users/mironovb/lanthanides.io/components/layout/index.ts` exports `Container, PageHeader, SiteHeader, SiteFooter, SiteNav, NAV_LINKS, CONTRIBUTE_CTA, FOOTER_LINKS, OPEN_DATA_EXPORTS` and `type NavItem`.

---

## 2. Design system

### Barrel `/Users/mironovb/lanthanides.io/components/ui/index.ts`

```ts
export { cn } from './cn';                     export type { ClassValue } from './cn';
export { SectionHeading } from './SectionHeading';  export type { SectionHeadingProps } from './SectionHeading';
export { Breadcrumbs } from './Breadcrumbs';   export type { Crumb } from './Breadcrumbs';
export { Card, Panel } from './Card';          export type { CardProps, PanelProps } from './Card';
export { Badge, Chip } from './Badge';         export type { BadgeProps, BadgeVariant, ChipProps } from './Badge';
export { Stat, StatGrid } from './Stat';       export type { StatProps, StatGridProps } from './Stat';
export { Button, LinkButton, buttonClasses } from './Button';
export type { ButtonProps, LinkButtonProps, ButtonVariant, ButtonSize } from './Button';
export { Callout } from './Callout';           export type { CalloutProps, CalloutTone } from './Callout';
export { Table, THead, TBody, TR, TH, TD } from './Table';  export type { THProps, TDProps } from './Table';
export { SortableTable, useSortable } from './SortableTable';
export type { Column, SortableTableProps, SortDir } from './SortableTable';
export { Tabs } from './Tabs';                 export type { TabItem } from './Tabs';
export { FilterChips } from './FilterChips';   export type { ChipOption } from './FilterChips';
export { Tooltip } from './Tooltip';
```

Import convention: `import { Panel, Stat, Badge } from '@/components/ui';`. `cn` also importable directly from `@/components/ui/cn`.

### Props (exact)

**Card / Panel** — `components/ui/Card.tsx`, server:
```ts
type Padding = 'none' | 'sm' | 'md' | 'lg';   // '', p-3, p-4, p-5
export interface CardProps {
  children: React.ReactNode;
  padding?: Padding;              // default 'md'
  interactive?: boolean;          // hover lift + border-strong + shadow-md
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
}
export interface PanelProps {
  children: React.ReactNode;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;      // mono uppercase kicker
  actions?: React.ReactNode;      // right-aligned header slot
  titleAs?: 'h2' | 'h3';          // default 'h2'
  padding?: Padding;              // body padding, default 'md'
  className?: string;
  bodyClassName?: string;
}
```
Card base classes: `rounded-lg border border-border bg-surface shadow-sm`. Panel header: `border-b border-border bg-raised px-4 py-2.5`, title `font-serif text-base font-semibold text-fg`.

**Badge / Chip** — `components/ui/Badge.tsx`, server:
```ts
export type BadgeVariant =
  | 'default' | 'accent'
  | 'up' | 'down' | 'flat'
  | 'rare_earth_light' | 'rare_earth_heavy' | 'strategic_metal' | 'semiconductor_metal'
  | 'normal' | 'monitored' | 'active' | 'restricted' | 'suspended';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;   // default 'default'
  className?: string;
  href?: string;            // renders <a> instead of <span>
  title?: string;
}
export interface ChipProps {
  children: React.ReactNode;
  dot?: string;             // solid color utility for a leading dot, e.g. 'bg-up'
  className?: string;
}
```
Badge base: `inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-semibold leading-none`; the five regulatory variants additionally get `font-mono uppercase tracking-caps`. `variant="accent"` → `text-accent-strong border-accent/40 bg-accent/10` — that is the natural "Preliminary" pill styling if a badge is needed in nav or a page header.

**Stat / StatGrid** — `components/ui/Stat.tsx`, server:
```ts
export interface StatProps {
  label: React.ReactNode;  value: React.ReactNode;
  unit?: React.ReactNode;  delta?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  hint?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';   // text-lg | text-2xl | text-3xl, default 'md'
  className?: string;
}
export interface StatGridProps { children: React.ReactNode; cols?: 2 | 3 | 4 | 5; className?: string; }
```
`StatGrid` renders a `<dl>`; each `Stat` is `<dt className="eyebrow">` + `<dd>` with `font-mono tracking-tightish tabular-nums`.

**Button / LinkButton** — `components/ui/Button.tsx`:
```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string
export interface ButtonProps extends ComponentProps<'button'> { variant?: ButtonVariant; size?: ButtonSize }
export interface LinkButtonProps extends ComponentProps<typeof Link> { variant?: ButtonVariant; size?: ButtonSize }
```
`LinkButton` is a styled `next/link` — use it for navigation, never a routing `onClick`.

**SectionHeading** — `components/ui/SectionHeading.tsx`, server:
```ts
export interface SectionHeadingProps {
  title: React.ReactNode;
  as?: 'h2' | 'h3';          // h2 → text-lg, h3 → text-base
  id?: string;               // deep-link anchor; adds scroll-mt-16
  swatch?: string;           // solid utility, e.g. 'bg-category-ree-light'
  count?: React.ReactNode;   // right-aligned mono count (ignored when actions set)
  actions?: React.ReactNode; // takes precedence over count
  description?: React.ReactNode;
  className?: string;
}
```

**Callout** — `components/ui/Callout.tsx`, server:
```ts
export type CalloutTone = 'note' | 'info' | 'warning' | 'danger' | 'success';
export interface CalloutProps {
  children: React.ReactNode;
  tone?: CalloutTone;                 // default 'note'
  title?: React.ReactNode;
  glyph?: React.ReactNode | null;     // pass null to hide the leading glyph
  className?: string;
}
```
Tones: note/info → `border-l-accent bg-accent/5`; warning → `risk-medium`; danger → `risk-high`; success → `up`. Body auto-styles nested links (`[&_a]:text-accent [&_a]:underline decoration-dotted`).

**FilterChips** — `components/ui/FilterChips.tsx`, `'use client'`, controlled single-select:
```ts
export interface ChipOption { value: string; label: React.ReactNode }
export function FilterChips({ options, value, onChange, label, allLabel = 'All', showAll = true, className }: {
  options: ChipOption[];
  value: string | null;                 // null = "All"
  onChange: (value: string | null) => void;
  label?: string;                        // visible group label + accessible name
  allLabel?: React.ReactNode;
  showAll?: boolean;
  className?: string;
})
```
Clicking the active chip clears it; `aria-pressed` on each button; unique `useId()` per instance.

**Table primitives** — `components/ui/Table.tsx` (no hooks → usable in server *and* client components):
```ts
Table({ children, className, caption, bordered = true })   // bordered adds rounded-md border + bg-surface, always overflow-x-auto
THead({children}) / TBody({children})
TR({ children, hover = true, className })                  // hover wash: hover:bg-accent/5
export interface THProps { children?: React.ReactNode; numeric?: boolean; align?: 'left'|'right'|'center';
  sortable?: boolean; sortDir?: 'asc' | 'desc' | null; onSort?: () => void; scope?: 'col' | 'row'; className?: string }
export interface TDProps { children?: React.ReactNode; numeric?: boolean; align?: 'left'|'right'|'center';
  className?: string; colSpan?: number }
```
`numeric` ⇒ right-aligned + `font-mono tabular-nums text-fg`; sortable `TH` renders a real nested `<button>` and keeps `aria-sort` on the `<th>`.

**SortableTable / useSortable** — `components/ui/SortableTable.tsx`, `'use client'`:
```ts
export type SortDir = 'asc' | 'desc';
export function useSortable<T>(rows: T[], initial: { key: keyof T | null; dir?: SortDir } = { key: null })
  // → { sorted, sortKey, sortDir, toggle(key, opts?: { numeric?: boolean }) }
export interface Column<T> {
  key?: keyof T;              // omit → non-sortable display column
  header: React.ReactNode; numeric?: boolean; align?: 'left'|'right'|'center';
  render: (row: T) => React.ReactNode;
}
export interface SortableTableProps<T> {
  columns: Column<T>[]; rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  initialSort?: { key: keyof T; dir?: SortDir };
  caption?: React.ReactNode; footnote?: React.ReactNode; emptyMessage?: React.ReactNode; // default 'No records.'
}
```
Sort semantics: nulls always last; numbers numerically, everything else `localeCompare`; first click on a `numeric` column sorts desc.

**Breadcrumbs** — `components/ui/Breadcrumbs.tsx`, server, visual-only:
```ts
export interface Crumb { label: React.ReactNode; href?: string }  // omit href on the final crumb
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string })
```

**Tabs** (`TabItem { id; label; panel }`, uncontrolled, WAI-ARIA roving tabindex) and **Tooltip** (`{ children, label, side?: 'top'|'bottom', className }`) are the remaining two client primitives.

**cn** — `components/ui/cn.ts`: `export type ClassValue = string | number | false | null | undefined;` `export function cn(...values: ClassValue[]): string` — plain filter+join, **no tailwind-merge**, so never rely on last-wins overrides.

### `components/layout` props

- `Container({ children, className, as: Tag = 'div' })`, `as?: 'div'|'header'|'footer'|'main'|'section'`; classes `mx-auto w-full max-w-content px-6`. Root layout does **not** wrap children — every page renders `<Container as="main" className="py-10">`.
- `PageHeader({ crumbs?: Crumb[], eyebrow?, title, lead?, actions?, children? })` — renders `<header className="border-b border-border-strong pb-6">`, `Breadcrumbs` with `mb-5`, `<p className="eyebrow mb-2">`, `<h1 className="font-serif text-3xl font-semibold leading-tight text-fg">`, lead `<p className="mt-3 text-md leading-relaxed text-fg-muted">` inside a `max-w-prose` block, with `actions` right-aligned on `md:` and `children` rendered below inside the rule.

### House classes — `/Users/mironovb/lanthanides.io/app/globals.css` (`@layer components`)

```css
.eyebrow { @apply font-mono text-2xs uppercase text-fg-dim; letter-spacing: theme('letterSpacing.eyebrow'); }
.numeric { @apply text-right font-mono; font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1, 'zero' 1; }
```
Plus base-layer rules: `h1,h2,h3 { @apply font-serif text-fg; letter-spacing: -0.01em; text-wrap: balance }`, `code/kbd/samp/pre/.tabular → font-mono + tabular-nums`, global `:focus-visible { outline: 2px solid accent; outline-offset: 2px }`, `::selection` = `accent.dim`, reduced-motion kill switch, quiet scrollbars on `.overflow-x-auto`.

### Tailwind tokens — `/Users/mironovb/lanthanides.io/tailwind.config.ts`

Content globs: `./app/**/*.{ts,tsx,mdx}`, `./components/**/*.{ts,tsx,mdx}`, `./lib/**/*.{ts,tsx}`. **Any new top-level dir with classes must be added here.** Class strings must be complete literals (no runtime construction).

Colors (light mode; hex on purpose so `theme()` works in the `*-body.css` prose sheets):
- Surfaces: `base #fafbfc` (page), `surface #ffffff` (cards/fields), `raised #f8f9fa` (table headers), `overlay #e9ecef` (hover/popover).
- Borders: `border #dee2e6`, `border-strong #ced4da`, `border-field #868d95` (form controls, ≥3:1).
- Text: `fg #1a1a1a`, `fg-muted #4a4e54`, `fg-dim #5a616a`.
- Accent: `accent #1a5c6b`, `accent-strong #14505d`, `accent-dim #d4eaf0`.
- Movement: `up #2c764b`, `down #b5342b`, `neutral #6c757d`, `flat` (alias of neutral).
- Risk: `risk-low #256b43`, `risk-medium #7a5500`, `risk-high #a02b22`, `risk-suspended #56606b`.
- Category: `category-ree-light #1d4ed8`, `category-ree-heavy #6d28d9`, `category-strategic #92400e`, `category-semiconductor #065f46`.

Type scale: `2xs 11px`, `xs 12px`, `sm 14px`, `base 16px`, `md 17px` (lead/prose), `lg 20px`, `xl 24px`, `2xl 30px`, `3xl 38px` (page hero H1), `4xl 48px`, `5xl 56px`. Fonts: `sans/serif` → Inter (`--font-sans` / `--font-serif`), `mono` → JetBrains Mono. Radius: `sm 3px`, DEFAULT `4px`, `md 6px`, `lg 8px`, `xl 10px`. Shadows `sm/DEFAULT/md/lg` (barely-there). `maxWidth.content 75rem`, `maxWidth.prose 46rem`. Letter-spacing `tightish -0.01em`, `caps 0.08em`, `eyebrow 0.2em`. `transitionDuration.fast 120ms`, `.base 200ms` (used as `duration-fast`). Extra spacing `4.5`, `13`, `15`.

Design rule from the config header, enforced everywhere: **color only ever encodes meaning** (movement, regulatory status, element category); no decorative color.

---

## 3. Data layer

### `lib/data/load.ts` — memoised, validating readers

`const DATA_DIR = join(process.cwd(), '_data')`. JSON via `fs` + `JSON.parse`; YAML via `yaml`'s `parse`. `once<T>(fn)` memoises per process. Errors throw `` `[lib/data] malformed _data/${file}: ${message}` `` (via `fail()`) or `` `[lib/data] could not read _data/${file}: …` ``, so a bad file fails `npm run build` loudly.

Exported loaders (all zero-arg, memoised):
```ts
loadElementCatalog(): Element[]                 // _data/element_catalog.yml, requires symbol,name,atomic_number,category,regulatory_status,export_control_status
loadPriceRecords(): PriceRecord[]               // _data/price_records.json, requires id,element_symbol,normalized_usd_per_kg,market_tier,confidence_score,quote_date
loadAllPriceHistory(): Map<string, PriceHistory>// _data/price_history/*.yml keyed by `symbol`
loadFluctuationsFile(): FluctuationsFile        // _data/fluctuations.json (needs `.elements` map)
loadRegulatoryNotices(): RegulatoryNotice[]     // _data/regulatory/*.yml sorted by filename
loadMovements(): MovementsFile                  // _data/movements.yml
loadPolicyEvents(): PolicyEvent[]               // _data/policy_events.yml
loadNews(): NewsItem[]                          // _data/news.yml
loadSources(): Source[]                         // _data/source_registry.yml
loadSourceBreakdown(): SourceBreakdown          // _data/source_breakdown.yml
loadSiteSettings(): SiteSettings                // _data/site_settings.yml
```

### `lib/data/verify.ts`

`verifyData(): VerifyReport` (`{ ok, errors: string[], counts: { elements, priceRecords, regulated, notices } }`) and `assertDataIntegrity(): void`. Invariants: **exactly 31 elements**, **exactly 238 price records**, every `regulatory_status === 'active'` element named by some notice. Hard-coded `EXPECTED_ELEMENTS = 31`, `EXPECTED_PRICE_RECORDS = 238` — adding price records to `_data/` without bumping these breaks the build.

### `lib/data/index.ts` — the public accessors (server-only; never import from a Client Component)

Every accessor calls a lazy `ensureVerified()` first. `export type * from './types'` and `export { selectReferencePrices } from '../price-gauge'`.

```ts
export const CATEGORY_ORDER: readonly ElementCategory[]   // ['rare_earth_light','rare_earth_heavy','strategic_metal','semiconductor_metal']

// Elements
getElements(): Element[]                                   // catalog order (atomic-ish, as authored)
getElementBySymbol(symbol: string): Element | null         // CASE-SENSITIVE ('Dy' not 'dy')
getElementsByCategory(): Record<ElementCategory, Element[]>

// Prices
getPriceRecords(symbol?: string): PriceRecord[]
getPriceHistory(symbol: string): PriceHistory | null
getFluctuation(symbol: string): Fluctuation | null
getDataGeneratedAt(): string                               // RFC3339 from fluctuations.json generated_at
getReferencePrices(symbol: string): ReferencePrices        // { retailRef, bulkRef, retailPremium }

// Regulatory
getRegulatoryNotices(): RegulatoryNotice[]
getPolicyEvents(): PolicyEvent[]
getRegulatedElements(): Element[]                          // regulatory_status === 'active'
getRegulatedAndSuspendedElements(): Element[]              // !== 'none', sorted by atomic_number
getMovements(): MovementsFile

// Sources & settings
getSources(): Source[]
getSourceBreakdown(): SourceBreakdown
getSiteSettings(): SiteSettings

// News
getNews(): NewsItem[]

// Aggregates
getCategoryCounts(): Record<ElementCategory, number>
getControlledElementCount(): number                        // cn_export_control === true
getPremiumLeaderboard(limit?: number): PremiumLeaderboardRow[]
getCoverageTally(): CoverageTally
getElementCoverage(): ElementCoverage[]
getControlByCategory(): CategoryControl[]
getRegulatorySnapshot(): RegulatorySnapshot
```

**Element catalog symbol/name/category exposure**: there is no `getSymbols()` helper — the idiom used across the codebase is `getElements().map(e => e.symbol)` (see `app/api/price-gauge/route.ts:74`-equivalent, `app/elements/[symbol]/page.tsx:53`, `app/regulatory/page.tsx:41`). `Element.symbol` is the URL key and is case-sensitive throughout.

### `lib/content.ts` — gray-matter loaders for `_elements/*.md` and `_articles/*.md`

`ELEMENTS_DIR = join(process.cwd(), '_elements')`, `ARTICLES_DIR = join(process.cwd(), '_articles')`.

```ts
export interface ElementFrontMatter {
  symbol: string; name: string; atomic_number: number; category: string;
  title?: string; description?: string; keywords?: string;
  element_name?: string; element_symbol?: string; permalink?: string;
}
export interface ElementContent { frontMatter: ElementFrontMatter; body: string }  // body VERBATIM (Liquid {% include %} left intact)

export function getElementContent(symbol: string): ElementContent | null
```
Memoised in `const elementCache = new Map<string, ElementContent | null>()`. Symbol is guarded by `/^[A-Za-z]{1,3}$/`; a missing file or read error is swallowed → `null` (caller renders a fallback). **Never throws.**

```ts
export interface ArticleFrontMatter {
  title: string; subtitle?: string; description?: string; keywords?: string;
  date: string;              // 'YYYY-MM-DD', normalised via toISODate (gray-matter yields a Date for unquoted YAML dates)
  status?: string; elements?: string[];
  image?: string; image_thumb?: string; image_alt?: string; image_w?: number; image_h?: number;
}
export interface ArticleContent { slug: string; frontMatter: ArticleFrontMatter; body: string }

export function getArticleSlugs(): string[]                    // cached; THROWS `[lib/content] could not list _articles: …`
export function getArticleContent(slug: string): ArticleContent | null   // slug guarded by /^[A-Za-z0-9-]+$/; null on miss
export function getAllArticles(): ArticleContent[]             // newest first by frontMatter.date
```

### `lib/types.ts` and naming conventions

`lib/types.ts` is one line: `export type * from './data/types';` — both `@/lib/types` and `@/lib/data` resolve to the same contracts.

Naming convention, layer by layer:
- **Data files + `lib/data/types.ts`**: `snake_case`, matching `_data/` verbatim (`element_symbol`, `normalized_usd_per_kg`, `quote_date`, `cn_export_control`, `export_control_status`, `affected_elements`, `data_quality`, `generated_at`).
- **Derived/computed shapes** (also in `lib/data/types.ts`): mixed by intent — `PremiumLeaderboardRow` stays snake_case (`retail_usd_per_kg`, `bulk_date`, `retail_purity`) because it mirrors record fields, while `ElementCoverage` uses **camelCase** for the computed fields (`distinctDays`, `retailAvailable`, `bulkAvailable`, `labAvailable`, `dataSince`, `dataUntil`) alongside snake-free `symbol/name/category/quality/observations`. `ReferencePrices` is camelCase: `{ retailRef, bulkRef, retailPremium }`.
- **React props / component APIs**: camelCase (`bodyClassName`, `titleAs`, `getRowKey`, `initialSort`, `filterElements`, `quantityKg`).
- **API query params**: camelCase (`quantityKg`, with `quantity` accepted as an alias).

Core scalar unions (from `lib/data/types.ts`):
```ts
type ElementCategory = 'rare_earth_light' | 'rare_earth_heavy' | 'strategic_metal' | 'semiconductor_metal';
type ExportControlStatus = 'restricted' | 'monitored' | 'normal';
type RegulatoryStatus = 'active' | 'suspended' | 'none';
type MarketTier = 'retail' | 'wholesale' | 'bulk' | 'lab' | 'industrial';
type FluctuationTier = 'retail' | 'bulk' | 'lab';
type Confidence = 'low' | 'medium' | 'high';
type Direction = 'up' | 'down' | 'flat';
type WindowKey = '7d' | '30d' | '90d' | '1y' | 'all_time';
type DataQuality = 'sparse' | 'moderate' | 'rich';
type ISODate = string;      // 'YYYY-MM-DD'
type ISODateTime = string;  // RFC3339
```

`Element` (verbatim):
```ts
export interface Element {
  symbol: string; name: string; atomic_number: number; category: ElementCategory;
  family: string; default_forms: string[];
  export_control_status: ExportControlStatus; regulatory_status: RegulatoryStatus;
  dominant_source_country: string; origin_countries: string[];
  trade_form: string; notes: string; price_tier: number;
  high_demand: boolean; cn_export_control: boolean;
  purity_range?: string;   // present on 11 of 31 entries
}
```

`PriceRecord` always-present fields: `id, element_symbol, element_name, normalized_usd_per_kg, form, purity, market_tier, moq_kg, quoted_quantity_kg, incoterm, source_type, seller_name, seller_country, verification_status, confidence_score, quote_date, notes`; optional (only on rows R-0001..R-0128): `invoice_ref, original_price_per_unit, original_currency, original_unit, exchange_rate_used, exchange_rate_date, taxes_included, shipping_included, source_id, source_url, ingestion_timestamp`.

Related engine module `/Users/mironovb/lanthanides.io/lib/price-gauge.ts`:
```ts
export function selectReferencePrices(records: PriceRecord[], symbol: string): ReferencePrices
export type TierBand = 'retail' | 'bulk';
export type MatchMode = 'exact-form' | 'form-widened' | 'all-forms' | 'none';
export interface PriceGaugeInput { symbol: string; form?: string; purity?: string | null; quantityKg?: number | null; tier?: TierBand }
export interface PriceGaugeBasis { matchedRecords; distinctSellers; dateRange: {from;to}|null; method: string; tier: TierBand;
  requestedForm: string|null; matchedForms: string[]; matchMode: MatchMode; observedRange: {min;max}|null;
  availableByTier: { retail: number; bulk: number }; recordIds: string[]; avgConfidenceScore: number|null }
export interface PriceGaugeResult { sufficient: boolean; low: number|null; mid: number|null; high: number|null;
  currency: 'USD'; unit: 'kg'; confidence: Confidence; basis: PriceGaugeBasis; message: string|null }
export function bandOf(tier: MarketTier): TierBand           // bulk|wholesale|industrial → 'bulk', else 'retail'
export function estimatePrice(input: PriceGaugeInput, records: PriceRecord[], opts: { asOf?: ISODate } = {}): PriceGaugeResult
export function selfCheck(records: PriceRecord[]): { … }     // SelfCheckItem[]
```

DB layer (contributions only): `/Users/mironovb/lanthanides.io/lib/contributions.ts` exports `inboxConfigured(): boolean` and `async insertContribution(...)`, lazily creating a `neon()` client from `DATABASE_URL` with `fetchOptions: { cache: 'no-store' }`. Build never touches the DB.

---

## 4. SEO

### `/Users/mironovb/lanthanides.io/lib/seo.ts`

```ts
export const SITE_URL = 'https://www.lanthanides.io';           // canonical origin; matches CNAME; also metadataBase
export const SITE_NAME = 'lanthanides.io · Strategic Materials Ledger';
export const SITE_TAGLINE_TITLE = 'lanthanides.io · Rare Earth Prices, Export Controls & Strategic Materials Intelligence';
export const TITLE_SUFFIX = 'lanthanides.io';
export const TITLE_SEPARATOR = ' · ';
export const DEFAULT_DESCRIPTION = 'Sourced pricing, supply-chain risk, and regulatory intelligence for rare-earth and strategic materials.';
export const DEFAULT_KEYWORDS = 'rare earth prices, rare earth elements, lanthanide prices, strategic materials, export controls, China rare earth, critical minerals pricing';
export const DEFAULT_OG_IMAGE = '/assets/images/og-default.png';

export interface PageMetadataInput {
  title?: string;             // runs through the '%s · lanthanides.io' template
  absoluteTitle?: string;     // bypasses branding (home only)
  description?: string;
  keywords?: string | string[];
  path: string;               // canonical path AND og:url — keep the trailing slash
  ogType?: 'website' | 'article';
  image?: string;             // default DEFAULT_OG_IMAGE
  imageAlt?: string;          // default SITE_NAME
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;          // emits robots: { index:false, follow:false }
}

export function buildMetadata(input: PageMetadataInput): Metadata
```
It emits `alternates: { canonical: path, types: FEED_ALTERNATES }` where `FEED_ALTERNATES = { 'application/atom+xml': [{ url: '/feed.xml', title: `${SITE_NAME} · News` }] }`, a full `openGraph` (union-narrowed on `type`, images `[{ url: image, width: 1200, height: 630, alt: imageAlt }]`) and `twitter: { card: 'summary_large_image', … }`.

Usage precedent (module-scope const, not a function) — `app/regulatory/page.tsx:25`:
```ts
export const metadata: Metadata = buildMetadata({ title: '…', description: DESCRIPTION, keywords: '…', path: '/regulatory/' });
```
Dynamic-route precedent — `app/elements/[symbol]/page.tsx:56`: `export function generateMetadata({ params }: { params: Params }): Metadata`.

### `components/seo/*`

`/Users/mironovb/lanthanides.io/components/seo/JsonLd.tsx`:
```ts
export const ORG_ID = `${SITE_URL}/#organization`;
export function abs(path: string): string           // passthrough for http(s) URLs, else SITE_URL + path
export function JsonLd({ data }: { data: object | object[] })   // single <script type="application/ld+json">, '<' → '\u003c'
export { SITE_URL };
```

`/Users/mironovb/lanthanides.io/components/seo/index.tsx` — all server components:
```ts
export function SiteJsonLd()                        // WebSite + Organization; rendered once in app/layout.tsx

export interface BreadcrumbCrumb { name: string; path?: string }   // omit path on the current-page crumb
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbCrumb[] })

export function FaqJsonLd({ records, elements }: { records: number; elements: number })

export function ArticleJsonLd({ slug, title, description, datePublished, dateModified, image }: {
  slug: string; title: string; description?: string; datePublished: string; dateModified?: string; image?: string })

// The Product-ish one:
export function ElementJsonLd({ element, retailRef, bulkRef, description }: {
  element: Element; retailRef: PriceRecord | null; bulkRef: PriceRecord | null; description?: string })
// → schema.org Product with brand/category/additionalProperty and 0-2 Offer nodes built by
//   offerNode(name, ref): { '@type':'Offer', priceCurrency:'USD', price: ref.normalized_usd_per_kg,
//     unitCode:'KGM', priceValidUntil: quote_date + 90d, availability: InStock,
//     seller: { '@type':'Organization', name: ref.seller_name }, itemCondition: NewCondition }

export interface DatasetDistribution { encodingFormat: string; contentUrl: string; name?: string }
export function DatasetJsonLd({ name, description, path, keywords, temporalCoverage, distribution }: {
  name: string; description: string; path: string;
  keywords?: string | string[]; temporalCoverage?: string; distribution?: DatasetDistribution[] })

export function WebApplicationJsonLd({ name, description, path, applicationCategory = 'BusinessApplication' }: {
  name: string; description: string; path: string; applicationCategory?: string })
```
Note the deliberate asymmetry: visual `Breadcrumbs` takes `Crumb { label, href }`; JSON-LD `BreadcrumbJsonLd` takes `BreadcrumbCrumb { name, path }`. Pages emit both (see `app/regulatory/page.tsx:45-69`).

Licence constant used by Dataset/WebSite: `CC_BY_40 = 'https://creativecommons.org/licenses/by/4.0/'`; repo `REPO_URL = 'https://github.com/mironovb/lanthanides.io'`.

### `/Users/mironovb/lanthanides.io/app/sitemap.ts`

`export const dynamic = 'force-static'`. URL builder: `const url = (path: string) => `${SITE_URL}${path}`` — paths are authored with their trailing slash in `STATIC_PAGES: Array<[string, number, ChangeFreq]>`:
`/` 1.0 daily, `/regulatory/` 0.9 daily, `/data/` 0.8 weekly, `/framework/` 0.7 weekly, `/news/` 0.7 weekly, `/contribute/` 0.7 monthly, `/methodology/` 0.6 monthly, `/about/` 0.6 monthly, `/tools/price-gauge/` 0.6 monthly, `/tools/price-map/` 0.6 monthly.
Then `getElements().map(e => url(`/elements/${e.symbol}/`))` (weekly, 0.7) and `getAllArticles().map(a => url(`/news/${a.slug}/`))` (monthly, 0.6). `lastModified` is `getDataGeneratedAt()` for pages/elements and the article date for articles. Machine endpoints (`/feed.xml`, `/api/*`) are deliberately excluded. **A new indexable section must be added to `STATIC_PAGES`.**

`/Users/mironovb/lanthanides.io/app/robots.ts`: `allow: '/'`, `disallow: '/api/'`, `sitemap: `${SITE_URL}/sitemap.xml``, `host: SITE_URL`.

### OG images

Static PNG/JPG files in `/Users/mironovb/lanthanides.io/public/assets/images/` (`og-default.png`, plus per-article `*-1200.jpg` / `*-600.jpg`). **No `opengraph-image.tsx`, no `next/og` / ImageResponse anywhere** — OG images are file paths passed as `image` to `buildMetadata`, sized `1200×630` in the metadata object. Site origin/base URL source is the single `SITE_URL` const in `lib/seo.ts`, re-exported through `components/seo/JsonLd.tsx`, and set as `metadataBase: new URL(SITE_URL)` in `app/layout.tsx`.

`app/layout.tsx` also owns the site-wide `title.template` (`` `%s · ${SITE_NAME.split(' · ')[0]}` ``), icons/manifest, robots defaults, `viewport = { themeColor: '#1A5C6B' }`, the skip link, `<SiteJsonLd />`, `<SiteHeader />`, `<div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>`, `<SiteFooter />`, body classes `flex min-h-screen flex-col bg-base text-fg`.

---

## 5. Route handlers

### `/Users/mironovb/lanthanides.io/app/api/export/[format]/route.ts` — static export pattern

```ts
export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams(): Array<{ format: string }> { return [{ format: 'json' }, { format: 'csv' }]; }
export function GET(_request: Request, { params }: { params: { format: string } })
```
Common headers on every 200:
```ts
const commonHeaders: Record<string, string> = {
  'X-License': 'CC-BY-4.0',
  Link: `<https://creativecommons.org/licenses/by/4.0/>; rel="license"`,
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600',
};
```
JSON branch: `JSON.stringify(records, null, 2)`, `Content-Type: application/json; charset=utf-8`, `Content-Disposition: inline; filename="lanthanides-price-records.json"`. CSV branch: `text/csv; charset=utf-8`, `attachment; filename="lanthanides-price-records.csv"`, CRLF row join, RFC4180 quoting via `csvCell`, columns = `PREFERRED_COLUMNS` present ∪ remaining keys sorted (no data loss). Fallthrough returns a **plain-text** 404 (`text/plain; charset=utf-8`), not JSON.

### `/Users/mironovb/lanthanides.io/app/api/price-gauge/route.ts` — dynamic API pattern

```ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, ...CORS },
  });
}

export function GET(request: Request): Response          // reads new URL(request.url).searchParams
export async function POST(request: Request): Promise<Response>   // JSON object body; non-object → 400
export function OPTIONS(): Response                      // 204 + CORS
```
Validation style: a discriminated result, never exceptions —
```ts
type Validated = { ok: true; input: PriceGaugeInput }
              | { ok: false; status: number; body: Record<string, unknown> };
function validate(raw: RawParams): Validated
```
Error JSON shapes: `{ error, usage, parameters }` (400 missing symbol, with a self-documenting `parameters` map), `{ error }` (404 unknown element), `{ error, allowed }` (400 unknown tier/form, echoing the allowed set), `{ error: 'Invalid JSON body. …' }` (400). Success: `json({ query: v.input, ...result }, 200, 'public, max-age=300')` — **200 even when `sufficient: false`**, because "no data" is a valid honest answer, never a fabricated price. Symbol resolution is case-insensitive (`resolveSymbol`) but canonicalises to the catalog's case-sensitive symbol.

### `/Users/mironovb/lanthanides.io/app/api/contributions/route.ts` — DO NOT TOUCH

Exists; POST-only; `dynamic = 'force-dynamic'`, `runtime = 'nodejs'`; shares `validateContribution` with the client island; honeypot `website` field returns a silent `{ ok: true }` 200; 503 (not 500) when the inbox is unconfigured. Local `json(body, status)` helper uses lowercase `content-type` and no CORS. Response bodies: `{ ok: false, message }`, `{ ok: false, errors, message: 'Fix the highlighted fields.' }`.

Other handlers: `/Users/mironovb/lanthanides.io/app/feed.xml/route.ts` (`export const dynamic = 'force-static'`, hand-rolled Atom with `xmlEscape`), `app/sitemap.ts`, `app/robots.ts`.

---

## 6. Rendering conventions

### Page skeleton (server component) — `/Users/mironovb/lanthanides.io/app/regulatory/page.tsx`

```tsx
export const metadata: Metadata = buildMetadata({ title: '…', description: DESCRIPTION, keywords: '…', path: '/regulatory/' });

export default function RegulatoryPage() {
  const notices = [...getRegulatoryNotices()].sort((a, b) => b.date_effective.localeCompare(a.date_effective));
  const events  = [...getPolicyEvents()].sort((a, b) => b.date.localeCompare(a.date));
  const filterElements = getRegulatedAndSuspendedElements().map((e) => e.symbol);

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Regulatory Tracker', path: '/regulatory/' }]} />
      <DatasetJsonLd name="…" description={DESCRIPTION} path="/regulatory/" keywords={[…]} />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Regulatory Tracker' }]}
        eyebrow="Export Controls"
        title="China Rare Earth Export Controls Tracker"
        lead="Every published Chinese export-control announcement …"
      />

      <RegulatoryView notices={notices} events={events} filterElements={filterElements} />

      <Callout tone="note" glyph={null} title="Key Legal References" className="mt-12"> … </Callout>
    </Container>
  );
}
```
The invariants across every page: one `<Container as="main" className="py-10">` (home uses `pb-16`), JSON-LD components first, then `PageHeader`, then sections spaced with `mt-8`/`mt-10`/`mt-12`. Exactly one `<main>` and one `<h1>` per page (docs/QA.md). `app/data/page.tsx` follows the same shape and additionally computes a module-scope `const RECORD_COUNT = getPriceRecords().length` reused by both `metadata` and the body so counts can never disagree.

`app/elements/[symbol]/page.tsx` shows the dynamic-route conventions: `export const dynamicParams = false`, `generateStaticParams(): Params[]` from `getElements()`, `generateMetadata({ params })`, `notFound()` on a miss, and it hand-rolls its own header (no `PageHeader`) with `<Breadcrumbs className="mb-5" …>`.

### `next/image` precedent

Fixed-dimension hero — `/Users/mironovb/lanthanides.io/app/news/[slug]/page.tsx:193`:
```tsx
<Image
  src={`/assets/images/${fm.image}`}
  alt={fm.image_alt ?? fm.title}
  width={fm.image_w ?? 1200}
  height={fm.image_h ?? 721}
  sizes="(max-width: 768px) 100vw, 736px"
  priority
  className="h-auto w-full"
/>
```
Fill inside an aspect-ratio box — `/Users/mironovb/lanthanides.io/components/news/ArticleCard.tsx:37`:
```tsx
<Link href={href} aria-label={`Read ${fm.title}`}
  className={cn('relative block overflow-hidden bg-raised',
    featured ? 'min-h-[18rem] border-t border-border md:h-full md:border-l md:border-t-0'
             : 'aspect-[16/9] border-b border-border')}>
  <Image
    src={`/assets/images/${image}`}
    alt=""
    fill
    sizes={featured ? '(max-width: 768px) 100vw, 42vw' : '(max-width: 640px) 100vw, 33vw'}
    className="object-cover"
  />
</Link>
```
Logo — `SiteHeader.tsx:35`: `width={24} height={24} className="h-6 w-6 shrink-0" priority`. Hero specimens (`components/home/HeroSpecimens.tsx`) inject `ImageComponent={Image}` with `imageProps={{ priority: true, sizes: '(max-width: 1023px) 48vw, 280px' }}`.
Rules in practice: `src` is always a `/assets/images/...` path under `public/`; either explicit intrinsic `width`+`height` **or** `fill` inside a `relative` + aspect-constrained parent; `sizes` always given; `alt=""` when the image is decorative next to a labelled link; `priority` only above the fold. There is **no `images` config in next.config.mjs** (no remote patterns) — remote image hosts would need config added.

### Client-island filter precedent — `/Users/mironovb/lanthanides.io/components/regulatory/RegulatoryView.tsx`

Data flow: the **server page** does all data reading + sorting and passes plain serialisable arrays down; the client island owns only the selection state and filters in `useMemo`; because it SSRs with `selected = null`, the full list is in the initial HTML (crawlable, works without JS) and filtering is pure progressive enhancement.

```tsx
'use client';
export function RegulatoryView({ notices, events, filterElements }:
  { notices: RegulatoryNotice[]; events: PolicyEvent[]; filterElements: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const filterOptions   = useMemo(() => filterElements.map((sym) => ({ value: sym, label: sym })), [filterElements]);
  const visibleNotices  = useMemo(() => selected ? notices.filter((n) => n.affected_elements.includes(selected)) : notices, [notices, selected]);
  const visibleEvents   = useMemo(() => selected ? events.filter((e) => e.affected_elements.includes(selected)) : events, [events, selected]);

  return (
    <>
      <FilterChips options={filterOptions} value={selected} onChange={setSelected} label="Filter by element" className="mt-8" />
      <section className="mt-8">
        <SectionHeading title="Active Control Regimes" count={visibleNotices.length}
                        description="One card per regulatory action, with its current status." />
        {visibleNotices.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
            {visibleNotices.map((notice) => <RegulatoryNoticeCard key={notice.notice_id} notice={notice} />)}
          </div>
        ) : <EmptyHint symbol={selected} noun="active control regime names" />}
      </section>
      <section className="mt-10"> … <RegulatoryTimeline events={visibleEvents} /> … </section>
    </>
  );
}
```
Alternative no-JS-first precedent: `/Users/mironovb/lanthanides.io/app/tools/price-gauge/page.tsx` + `components/tools/PriceGaugeForm.tsx` — a plain `method="get"` form whose state lives in `searchParams`, server-rendered result, JS only narrowing the form select.

### `/Users/mironovb/lanthanides.io/lib/format.ts` — exact signatures

```ts
export function capitalize(s: string): string
export function humanize(s: string): string                       // '_' → ' '
export function fmtUsd(n: number): string                         // toLocaleString('en-US', { maximumFractionDigits: 2 }), NO '$'
export function fmtUsdPrice(n: number | null | undefined): string  // '$1,234.5'; null/NaN → 'n/a'
export function fmtQuantity(kg: number): string                   // '<1kg' → grams, else 'N kg'
export function fmtPremium(premium: number): string               // floor to 1 decimal, e.g. '5.4'
export function formatDate(input: string | Date | undefined | null): string  // 'May 31, 2026', parsed in UTC; falls back to the raw string
```
Numeric helpers return bare strings; typography is the `.numeric` class or the `numeric` prop on `TD`/`TH`. `components/elements/format.ts` is a thin re-export of the same seven — new code should import `@/lib/format`.

Markdown rendering: `/Users/mironovb/lanthanides.io/components/content/Markdown.tsx` (server, `react-markdown` + `remark-gfm` + `rehype-raw`, preserves kramdown `{#id}` anchors), with page-imported stylesheets `components/content/content-body.css` and `components/elements/element-body.css`.

Feature-module style tokens worth reusing: `/Users/mironovb/lanthanides.io/components/elements/categories.ts` (`CATEGORY_ORDER`, `CATEGORY_STYLE: Record<ElementCategory, { label, badgeLabel, swatch, borderTop, hoverBorder }>`, `REGULATORY_BADGE`), `/Users/mironovb/lanthanides.io/components/regulatory/regulatory.ts` (`classifyNotice`, `NOTICE_STYLE`, `EVENT_TYPE_STYLE`, `fmtLongDate`, `noticeAnchor`), `/Users/mironovb/lanthanides.io/components/charts/coverage.ts` (`GRADE_ORDER/LABEL/TILE/RANK/DEFINITION`).

---

## 7. Tooling

**`/Users/mironovb/lanthanides.io/package.json`** scripts:
```json
"dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint", "db:init": "node db/init.mjs"
```
Deps: `next ^14.2.18`, `react/react-dom ^18.3.1`, `gray-matter ^4.0.3`, `yaml ^2.6.1`, `react-markdown ^9`, `remark-gfm ^4`, `rehype-raw ^7`, `@neondatabase/serverless ^1.1.0`, `three`/`@react-three/fiber`. Dev: `typescript ^5.6.3`, `tailwindcss ^3.4.15`, `eslint ^8.57.1`, `eslint-config-next ^14.2.18`, `autoprefixer`, `postcss`, `@types/*`.

**Test framework: none — confirmed.** No `test`/`spec` files, no vitest/jest/playwright config or dependency anywhere in the app tree. Correctness is enforced by (a) `tsc` via `next build` under `strict: true`, (b) `lib/data/verify.ts` integrity assertions that throw at first data access during the build, and (c) `next lint`. Any new invariant checking should follow the `assertDataIntegrity()` pattern, not a new test runner.

**`/Users/mironovb/lanthanides.io/tsconfig.json`** (path alias quoted):
```json
"baseUrl": ".",
"paths": { "@/*": ["./*"] }
```
plus `"target": "ES2022"`, `"strict": true`, `"noEmit": true`, `"module": "esnext"`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`, `"isolatedModules": true`, `"resolveJsonModule": true`, `"incremental": true`, `plugins: [{ "name": "next" }]`. `include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, `exclude: ["node_modules", "legacy", "_site", "specimen-kit"]` — note `periodictech/` is **not** excluded from tsconfig.

**`/Users/mironovb/lanthanides.io/.eslintrc.json`**:
```json
{ "extends": "next/core-web-vitals", "ignorePatterns": ["scripts/", "node_modules/", "specimen-kit/"] }
```

**`/Users/mironovb/lanthanides.io/next.config.mjs`** essentials:
- `trailingSlash: true` — the hard URL contract; every internal href and every `path` passed to `buildMetadata` must end with `/` (except `/` itself and machine endpoints like `/feed.xml`).
- `async redirects()` returning objects in the form `{ source, destination, statusCode: 301 }` — the codebase deliberately uses `statusCode: 301` rather than `permanent: true` (which emits 308). Existing entries: `/prices→/`, `/vision→/about/`, `/assets/data/elements.json→/api/export/json/`, `/sell→/contribute/`, `/offers→/data/`, `/alerts→/regulatory/`, `/discussion`+`/discussion/:id→/contribute/`, `/movements→/`, `/movements.xml→/feed.xml`, `/sources→/methodology/`, `/elements→/`, `/dashboard→/`, `/api/dashboard/brief→/api/export/json/`.
- **No `images` config, no `headers()`, no `rewrites()`, no `experimental` block.** Local images only.

**`/Users/mironovb/lanthanides.io/postcss.config.mjs`**: `{ plugins: { tailwindcss: {}, autoprefixer: {} } }`.
**`/Users/mironovb/lanthanides.io/vercel.json`**: `{ "$schema": …, "buildCommand": "next build" }` — no route/header config at the platform level.

Other repo context: `CLAUDE.md` / `AGENTS.md` (identical 48 KB governance docs, hard rule #1 = no fabricated data, `_data/` is Python-pipeline-owned and read-only from the app), `docs/` (`ARCHITECTURE.md`, `DESIGN-SYSTEM.md`, `SEO.md`, `QA.md`, `MIGRATION.md`, …; **`docs/marketplace/` does not yet exist**), `db/` (schema + `init.mjs` for the single `price_contributions` Neon table), `.env` / `.env.example` (`DATABASE_URL`). Recent commits: `52061cc chore(marketplace): add agent workflow definitions`, `71bbf7c chore(marketplace): quarantine vendored periodictech source repo`. Working tree has untracked `assets/images/*.png`, `lanthanides-marketplace-overnight-prompt.md`, `specimen-kit/`.