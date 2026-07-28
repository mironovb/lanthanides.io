# PLAN — Lanthanides Marketplace (Preliminary)

The operating plan for the overnight build, merged from
[RECON-lanthanodes.md](./RECON-lanthanodes.md) (repo conventions),
[RECON-periodictech.md](./RECON-periodictech.md) (real source data), and
[DESIGN.md](./DESIGN.md) (target architecture). Where the three disagree,
this file is the ruling. Decisions are logged in
[ASSUMPTIONS.md](./ASSUMPTIONS.md); progress in [TODO.md](./TODO.md).

## Ruling constraints

1. **Persistence is versioned files, no database.** The repo forbids new DB
   tables (CLAUDE.md 2026-07 refocus; the Neon contributions inbox is
   off-limits). "Schema + migrations" = `lib/marketplace/types.ts` + build-time
   validation over `_marketplace/` files; every data change is a git diff.
   DESIGN §3.5 is adopted as-is.
2. **The prompt's non-negotiables win over DESIGN preferences** where they
   conflict: nav item is **"Lanthanides Marketplace", second**, with a
   Preliminary badge (DESIGN Q12 suggested a later slot — overruled).
3. **Real data wins over imagined schema.** The source catalog has
   per-listing **size variants** (90 across 19 listings), exactly one photo
   per listing, zero documents, and origin-only provenance. The schema below
   is DESIGN §2 adjusted to that reality.
4. Current design system is **light-mode** (Inter/JetBrains Mono, rounded
   corners) per RECON-lanthanodes §2 — not the stale dark-terminal baseline
   in CLAUDE.md. Builders follow RECON-lanthanodes.
5. No fabricated data anywhere: no invented provenance, dates, documents, or
   processor claims ("PayPal-backed" is NOT true for this seller — the store
   runs Stripe; buyer-protection copy describes only what exists).

## Schema deltas vs DESIGN §2 (driven by real data)

- **`variants` replaces single `quantity_g`/`price_usd_cents`.** Listing
  front matter carries `variants: [{ legacy_sku, label, mass_g,
  price_usd_cents, note? }]` (≥1, sorted by mass ascending, unique legacy_sku,
  positive integers; `note` only for real source caveats — the two price
  inversions). Derived: `priceFromCents` = min variant price, `massRangeG`,
  per-variant per-gram.
- **Category enum gains `alloy`**: `pure-metal | oxide | mineral-ore | alloy
  | high-tech | equipment`. The source has 3 genuine alloys; calling them
  "pure metal" would be false, "high-tech" a stretch. Mapping: Rare Earth →
  `pure-metal`, Ultra Pure → `pure-metal`, Alloy → `alloy`.
- **Form**: `metal` for all 16 elemental listings, `alloy` for the 3 alloys
  (the ledger's oxide/metal axis, not the shape). **Shape** vocabulary
  extended to the values actually present: `granule, ingot, piece, wool,
  chip, rod, powder, foil, wire, crystal, target, ampoule, specimen,
  assembly` (display-only, never a statistics axis).
- **`elements` may contain any real element symbol** (the store sells Cd, W,
  V, Bi, Te… beyond the site's 31-element catalog). Validation is against a
  full periodic-table symbol list; a derived `catalogElements` intersection
  drives `/elements/<Sym>/` cross-links and the regulatory badge (only for
  symbols the site actually covers).
- **Provenance `country` is nullable.** 16 listings state
  `Origin: Kazakhstan` (→ `country: KZ`, seller-declared); the 3 alloys state
  nothing (→ `country: null`, renders "Not stated"). We do not extend the
  seller's KZ claim to listings that never made it. All 19 records:
  `source_type: private-collection` (the seller's own retail stock — the only
  thing we actually know), `verification_status: seller-declared` (renders
  "Verification pending"), `chain`: the real, minimal 2-step history
  (periodictech.com retail catalog → imported here), `documents: null`
  (none exist — never fabricate a COA).
- **Dates.** Source has none. `listed_on` = the listing slug's first
  appearance in periodictech git history (real, deterministic, per listing);
  `updated_at` = `listed_on` (we cannot honestly claim per-listing updates).
  Seller `member_since` = 2026-03-11 (periodictech first commit, per the
  brief), with the earlier 2026-01-06 migration date noted in the bio as
  context and the "~6 years / ~10,000 transactions" history strictly under
  seller-declared claims.
- **`catalog_average` operates on variants** within an (element × form)
  cell: `sample_size` = contributing variants, `listing_count` = distinct
  listings. The detail-page comparison hint keeps DESIGN's leave-one-out **at
  the listing level** with `min_sample = 5` — which, with one listing per
  cell today, means **the hint renders nowhere** (correct and honest; the
  computation + API still exist and say so). API cells carry both counts, the
  `seller_catalog` basis, and the §4.7 disclaimer verbatim. Naming law: never
  "reference price"/"market price" on marketplace surfaces; the site's ledger
  reference prices are never rendered next to marketplace prices.
- Images: exactly one per listing today (schema keeps the ≥1 list; alt hard
  rule relaxed to non-empty, soft-warn <12 chars, since source alts are
  short-but-honest). Dimensions measured at import (`sips`) and stored.
- `source` block (reviewer-only, never rendered): `{ store: periodictech,
  slug, category }` — import provenance for auditors.

## File layout (DESIGN §1, simplified to what exists)

```
_marketplace/
  settings.yml          # labels + thresholds
  sellers.yml           # kazakhelements (verified: true, basis stated)
  sellers/kazakhelements.md   # bio body (seller voice)
  listings/<slug>.md    # 19 files; front matter + verbatim description body
public/assets/marketplace/
  listings/<slug>/01.jpg      # copied per-slug (cadmium.jpg copied twice)
  sellers/kazakhelements/avatar.svg   # monogram, design-system colors
lib/marketplace/
  types.ts  load.ts  validate.ts  verify.ts  index.ts  catalog-average.ts  serialize.ts
scripts/import-periodictech.mjs      # idempotent; writes _marketplace/ + public/
scripts/verify-marketplace.mjs       # post-build output checks
tests/marketplace/*.test.ts          # vitest suite
```

## Phase task list

- **P0** ✅ quarantine (`.gitignore` + verified untracked) → agents committed
  → recon ×3 → this plan. Baseline `npm run build` green.
- **P1 — data layer**: `lib/marketplace/*` per schema above; loader throws
  with `[lib/marketplace]`-prefixed messages on every DESIGN §3.1 hard rule
  (adjusted for variants); soft flags per §3.3; accessors per §3.4 +
  `getListingsByElement`. Quarantine hardening: add `periodictech` to
  `tsconfig.exclude` + ESLint `ignorePatterns`. Temporary fixture listing to
  prove the loader; removed once the real import lands.
- **P2 — seed seller**: `sellers.yml` + bio md + monogram SVG avatar.
  Contact = `support@periodictech.com` (the store's real support address).
- **P3 — import**: `scripts/import-periodictech.mjs` — inventory manifest →
  evaluate `products.ts` (strip types, `node:vm`, re-declare `desc`) → map →
  copy images per-slug (+`sips` dims) → emit 19 listing files → idempotent
  (stable output, re-run produces zero diff) → `IMPORT_REPORT.md` with
  manifest vs imported reconciliation, per-category counts, provenance
  fallback count (3), the 2 price inversions, exclusions (eBay-marked
  `metals.jpeg`, hero art, logo, Shopify comment).
- **P4 — API** (`api-builder` agent): 4 read-only GET routes per DESIGN §5
  with variant adjustments (`min_price`/`max_price`/`sort` on
  `price_from_cents`; listing payload carries `variants[]`).
  `/api/marketplace/listings` = force-dynamic; slug/handle/price-reference =
  force-static. Snake_case JSON via `serialize.ts`.
- **P5 — frontend** (`frontend-builder` agent): nav insertion (second,
  badge) + `/marketplace/` (trust strip, filter island over server-rendered
  grid, sort, cards) + `/marketplace/[slug]/` (gallery, variant price table,
  spec table, PROMINENT provenance panel with "Verification pending", seller
  card, honest buyer-protection callout, mailto CTA) +
  `/marketplace/sellers/kazakhelements/` (profile, derived stats,
  seller-declared card, listings grid). Metadata + BreadcrumbJsonLd +
  Product-without-Offer JSON-LD (DESIGN §6.2) + CollectionPage/ItemList.
  Main loop: sitemap entries.
- **P6 — verification**: vitest (loader validation, import idempotency,
  manifest count = 19, every listing ≥1 existing image + provenance, nav
  second + badge, API handler integration tests); `verify-marketplace.mjs`
  over built output (nav order in HTML, provenance section on detail pages,
  quarantine `git ls-files`); `qa-fidelity` agent samples 10 listings vs
  source; headless-Chrome screenshots → `docs/marketplace/screenshots/`;
  full build + lint green.
- **P7 — handoff**: `HANDOFF.md`; push + draft PR only if remote+creds work.

## Ownership map (parallel phase)

- `api-builder`: `app/api/marketplace/**` only.
- `frontend-builder`: `app/marketplace/**`, `components/marketplace/**`,
  `components/layout/nav.ts` + `SiteNav.tsx` badge render (minimal).
- Main loop: everything else (lib, data files, scripts, docs, sitemap,
  tests, commits, builds). Builders never build (`tsc --noEmit` only), never
  run git, never add dependencies.
