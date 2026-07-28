# RECON — periodictech

Read-only recon of the vendored store repo at `./periodictech` (gitignored;
never committed). Produced by the `recon-periodictech` agent, 2026-07-28.

## 1. What the repo is

A **Next.js 16 / React 19 ecommerce storefront** for high-purity element
samples, rare-earth metals, and specialty alloys. Package name
`elemental-shop`, live at `https://periodictech.com`. Tailwind v4, PostgreSQL
16 + Prisma 7 (auth/orders only), Stripe hosted checkout, session-cookie auth,
Hetzner + Caddy hosting.

**Critical finding: the catalog is code, not database.** There is no `Product`
model in Prisma. `periodictech/src/lib/products.ts` exports a hard-coded
`PRODUCTS: Product[]` array imported by every consumer (storefront index,
`products/[slug]` detail with `generateStaticParams`, sitemap, price-sanity
CI script). Postgres stores only `User`, `Session`, token tables, `Order`,
`OrderItem` (denormalized order history, not a catalog), `ContactMessage`.
`prisma/seed.ts` seeds an admin user only — zero product records.

The file's own header records its lineage:

```ts
// Curated + normalized catalog
// Source of truth: Shopify Handle/Title/Body + Variant SKU + Variant Price.
// Money is stored in cents (unitAmount). Currency is fixed to USD.
```

## 2. Authoritative source of truth

**`periodictech/src/lib/products.ts`** (26,411 bytes, 641 lines). Nothing
else — no SQLite, no seed JSON, no CSV, no markdown catalog, no HTML dump
(verified by `find` across the tree excluding `node_modules`/`.next`).

Schema (verbatim, `src/lib/products.ts:5-25`):

```ts
export type ElementType = "Rare Earth" | "Ultra Pure" | "Alloy";

export type Variant = {
  sku: string;
  label: string; // e.g. "25 g", "900 g", "4.4 kg"
  massGrams: number;
  unitAmount: number;
};

export type Product = {
  slug: string;
  name: string; // stable, normalized
  symbol?: string; // omitted for non-elements / multi-element alloys
  purity?: string; // omitted for alloys where composition matters more
  element: ElementType;
  short: string; // consistent one-liner
  description: string; // consistent template
  currency: "usd";
  variants: Variant[];
  image: { bg: string; src?: string; alt?: string };
};
```

Exact counts: **19 listings** (unique slugs), **90 variants** (unique SKUs).
Categories: `Ultra Pure` 12, `Rare Earth` 4, `Alloy` 3. Helper accessors:
`getProductBySlug` (:621), `getProductBySku` (:625), `ELEMENTS` (:612).

## 3. Fields available per listing

| Field | Level | Present | Notes |
|---|---|---|---|
| `slug` | product | 19/19 | stable URL key, unique |
| `name` | product | 19/19 | e.g. `"Scandium Metal, 99.9% (3N)"` — purity embedded in title |
| `symbol` | product | 19/19 | elements `"Sc"`; alloys composite `"Bi/Pb/Sn"`, `"Al/Cu/Zn"` |
| `purity` | product | **16/19** | absent on the 3 alloys |
| `element` | product | 19/19 | the 3-value category taxonomy |
| `short` | product | 19/19 | one-line teaser |
| `description` | product | 19/19 | `\n`-joined; carries the spec bullets |
| `currency` | product | 19/19 | literal `"usd"` everywhere |
| `variants[]` | product | 19/19 | 90 total; `{sku,label,massGrams,unitAmount}` |
| `image.src` | product | 19/19 | `/images/products/*.jpg`; 18 unique files |
| `image.alt` | product | 19/19 | |
| `image.bg` | product | 19/19 | Tailwind gradient class — presentation only, do not import |
| Weight | variant | 90/90 | `massGrams` numeric + `label` human string |
| Price | variant | 90/90 | `unitAmount` integer cents, USD |
| Form | in description | 16/19 | `"• Form: granules"` etc. |
| Packaging | in description | 16/19 | `"• Packaging: sealed bag, moisture-free"` etc. |
| **Origin (provenance)** | in description | **16/19** | all 16 read `"• Origin: Kazakhstan"` |
| Composition | in description | 3/3 alloys | e.g. `"Nominal composition: Al 44 to 46%, Cu 49 to 51%, Zn 4 to 6%."` |
| Dates | — | **0** | no timestamps anywhere in the catalog |
| COA / certificate | — | **0** | see §5 |
| Stock / quantity | — | 0 | availability hard-coded `schema.org/InStock` in the page |

Example record (rare earth, full spec block, `src/lib/products.ts:34-68`):

```ts
{
  slug: "scandium-1900",
  name: "Scandium Metal, 99.9% (3N)",
  symbol: "Sc",
  purity: "99.9%",
  element: "Rare Earth",
  short: "Silvery scandium granules, sealed airtight to keep moisture out.",
  description: desc([
    "Very little scandium ever circulates as free metal; most of what is refined goes straight into aluminum master alloys for aircraft parts and bicycle frames. These granules are the element itself, silvery with a faint straw tint where air has reached them. We bag them sealed and dry so they arrive bright.",
    "",
    "Specs:",
    "• Purity: 99.9% (3N)",
    "• Form: granules",
    "• Packaging: sealed bag, moisture-free",
    "• Origin: Kazakhstan",
  ]),
  currency: "usd",
  variants: [
    { sku: "396682381010-66868", label: "1 g", massGrams: 1, unitAmount: 2400 },
    { sku: "396682381010-66869", label: "5 g", massGrams: 5, unitAmount: 6800 },
    // … 10 variants, 1 g → 900 g, $24.00 → $7,540.00
  ],
  image: { bg: "from-blue-100 to-white", src: "/images/products/scandium.jpg", alt: "Scandium metal sample" },
}
```

Alloy records (`rose-453`, `woods-metal`, `devardas-alloy`) have **no**
`purity`, no spec block, no Origin bullet; instead a
`Nominal composition …` sentence (and, for the low-melt alloys, a melting
range) inside `description`.

## 4. Images

Directory: `periodictech/public/images/products/`.

- **18 files, 1,827,423 bytes = 1.74 MB total.** All progressive JPEG
  (sharp `quality: 90, mozjpeg`), capped at **1024 px** long edge; largest
  file `vanadiumshavings.jpg` 131,674 B (1024×1024). Aspect ratios vary —
  not square.
- Referenced by a single string `product.image.src` — **exactly one image
  per listing**, 19 references → 18 unique files (`cadmium.jpg` shared by
  `cadmium-6n` and `cadmium-ingot-996` with different `alt` text).
- Filename ≠ slug for 6 listings (`vanadium-pieces`→`vanadium.jpg`,
  `vanadium-wool`→`vanadiumshavings.jpg`, `tungsten-100`→`tungsten.jpg`,
  `rose-453`→`rose.jpg`, `woods-metal`→`woods.jpg`,
  `devardas-alloy`→`devarda.jpg`).
- No embedded third-party markers (sharp stripped metadata). Per
  `periodictech/AUDIT.md:122` these are "desk-snapshot product photos with
  rulers in frame" — real photos of the actual stock.
- Non-catalog images to EXCLUDE from listings: `public/images/hero/*.png`
  (4 decorative cutouts, 1.10 MB), `public/storelogo.png` (356×346 brand
  mark).

## 5. Documents — COA / certificates / provenance

**Zero document files exist** (no PDF/DOCX/scan anywhere). "Certificate of
analysis" and "full provenance" appear only as **marketing prose in page
templates** (layout.tsx:36, HomePage.tsx trust badges, about/page.tsx:65,
products/[slug]/page.tsx:33) — never bound to a listing. The store's own
`AUDIT.md:115` flags these claims as unverified and contradictory ("keep only
claims the owner can literally stand behind"). **Do not migrate the
COA/certificate boilerplate as per-listing provenance.** The only real
per-listing provenance datum is the `• Origin: Kazakhstan` bullet (16/19).

## 6. Price / category metadata

- Prices: integer cents in `Variant.unitAmount`, USD everywhere. Range
  across 90 variants: **$22.00 – $7,540.00**.
- No price history, no reference/comparison table, no cost basis.
- Category taxonomy: the 3-value `ElementType` union only.
- Price-integrity guard `scripts/check-prices.ts` (heavier must not cost
  less). **Two deliberate violations survive with in-file comments saying
  the correct figure is unknown, pending the owner:**
  - `terbium` 90 g `53900` ($539) > 150 g `53400` ($534)
  - `devardas-alloy` 250 g `5100` ($51) > 450 g `4900` ($49)
  Import verbatim and flag — do not silently "fix".
- Shipping/returns (page copy, not catalog data): $12 flat US, free ≥ $150,
  30-day return by mail, customer pays return shipping.

## 7. Third-party marks to EXCLUDE from import

| Item | Location | Action |
|---|---|---|
| "Source of truth: Shopify …" comment | `src/lib/products.ts:2` | strip; keep SKUs only as opaque `legacy_sku` |
| `metals.jpeg` | repo root | **eBay-processed** (EXIF comment "Processed By eBay with ImageMagick") — exclude entirely |
| Stripe mentions | prose in cart/checkout/policy pages | no logo assets exist; exclude the processor prose |
| Card-network / wallet marks | none found | nothing to exclude |
| `storelogo.png`, `icon.svg`, OG template | `public/`, `src/app/` | Periodic Tech first-party brand — not listing content |
| `© Periodic Technology LLC`, server IP, `support@periodictech.com` | footer/README | infra + legal detail; `support@periodictech.com` is the store's real, operating support address |

`specimen-kit.zip` (repo root, 3.7 MB) is an exportable UI component kit
(gitignored in periodictech itself) — contains no listing data; exclude. The
`specimen-kit/` folder at the *main* repo root is its extracted copy,
referenced by nothing here; ignore.

## 8. First commit date (seed seller `joined_at`)

```
$ git -C periodictech log --reverse --format='%aI %s' | head -3
2026-03-11T23:22:00Z Initial import from Hetzner server
2026-03-11T23:42:42Z Add server deploy script
2026-03-11T23:51:15Z Update README with deploy workflow and clean up docs
```

**First commit: 2026-03-11T23:22:00Z.** Caveat: that commit is literally an
import from a server already in production; the earliest Prisma migrations
are dated 2026-01-06, so 2026-01-06 is the earlier defensible anchor for the
store's operation. 32 commits total; latest 2026-07-06.

## 9. Field coverage — real counts

| Check | Count |
|---|---|
| Listings lacking a photo | **0 / 19** |
| Listings lacking a price | **0 / 19** (all 90 variants priced, none zero) |
| Listings lacking explicit provenance (`Origin:`) | **3 / 19** — `rose-453`, `woods-metal`, `devardas-alloy` (all alloys) |
| Listings lacking `purity` | 3 / 19 (same three) |
| Listings lacking `Form:` / `Packaging:` bullet | 3 / 19 (same three) |
| Listings with any date field | 0 / 19 |
| Listings with a linked COA/document | 0 / 19 |
| Duplicate slugs / SKUs | 0 / 0 |
| Image refs missing on disk | 0 |
| Distinct `Origin` values | 1 (`Kazakhstan`) |
| Distinct `Form` values | 12 (granules, ingot, pieces, wool, chips, …) |
| Composite (Shopify-style) SKUs | 26 / 90 (treat as opaque strings) |

## Parsing strategy recommendation

**Read exactly one file: `periodictech/src/lib/products.ts`.** Ignore Prisma
and the DB entirely.

The file is plain TypeScript with zero imports (one local `desc()` helper =
`lines.join("\n")`). **Do not regex-scrape records** — evaluate the module
and walk the real array. Options: run the importer under a TS-capable node
invocation, or strip types and evaluate in a sandbox re-declaring `desc`.
Prefix node with `PATH=/usr/local/opt/node@24/bin:$PATH`.

Per-listing mapping:

| Marketplace field | Source |
|---|---|
| legacy slug / source id | `product.slug` |
| title | `product.name` |
| summary | `product.short` |
| body | `product.description` verbatim (render pre-line) |
| category | from `product.element` (3-value taxonomy) |
| element symbol(s) | `product.symbol`; split on `/` for alloys |
| purity | `product.purity` (nullable ×3); normalize by stripping trailing ` (\dN)` |
| variants | `sku → legacy_sku`, `label`, `massGrams`, `unitAmount` (cents) |
| image | resolve `join(periodictech, 'public', image.src)`; copy per-slug (shared `cadmium.jpg`!); `alt` from source; discard `image.bg` |
| specs/provenance | parse `^• ([^:]+): (.+)$` bullets from `description` (bullet is U+2022); `Origin` → provenance origin; alloys instead match `Nominal composition…` / `Melting (point|range)…` |

Edge cases present in the real data (all must be handled): shared cadmium
image; filename ≠ slug ×6; two SKU shapes (opaque); kg labels (`"4.4 kg"` —
always trust `massGrams`); label with parenthetical (`"325 g (as pictured)"`
— preserve verbatim); 2 price inversions (import verbatim + flag); 3
single-variant listings; U+2019 typographic apostrophes in 3 names (UTF-8
end-to-end, slug care); no timestamps (synthesize deterministically — git
first-appearance per slug is available and real); trailing comment block
(:633-641) lists items deliberately dropped upstream — do not resurrect.

## Manifest

| Metric | Exact count |
|---|---|
| **Listings** | **19** |
| Variants (SKUs) | 90 |
| Categories | 3 — Ultra Pure 12, Rare Earth 4, Alloy 3 |
| **Listing images on disk** | **18** (19 refs; 1 shared) |
| Listing images total size | 1.74 MB, all JPEG ≤1024 px |
| **Documents (COA/PDF)** | **0** |
| Listings missing photo / price | 0 / 0 |
| Listings missing explicit provenance | **3** (the alloys) |
| Price range | $22.00 – $7,540.00 USD |
| Known price inversions to flag | 2 |
| Seed seller joined_at | 2026-03-11T23:22:00Z (repo first commit) |
