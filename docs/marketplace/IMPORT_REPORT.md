# IMPORT REPORT — periodictech → `_marketplace/`

Produced by `scripts/import-periodictech.mjs` (import date constant
`2026-07-28`; the script is idempotent and this report reflects its most
recent run). Every count below was measured from the real files during the
run, not estimated. Source of truth: `periodictech/src/lib/products.ts`
(evaluated in `node:vm`, never regex-scraped) at periodictech HEAD
`77cd02d`.

## 1. Source manifest (measured)

| Metric | Count |
|---|---|
| Listings (unique slug: keys in products.ts) | 19 |
| Variants (sku: keys in products.ts) | 90 |
| Categories | Ultra Pure 12 / Rare Earth 4 / Alloy 3 |
| Image references (image.src) | 19 |
| Image files on disk (public/images/products) | 18 |
| Image bytes on disk | 1,827,423 |
| Documents (COA/PDF/DOC/DOCX anywhere in repo) | 0 |

Excluded non-catalog assets verified present in the source (see §6):
`metals.jpeg` yes,
hero PNGs 4,
`storelogo.png` yes,
`specimen-kit.zip` yes.

## 2. Manifest vs imported — reconciliation

| Check | Source | Imported | Match |
|---|---|---|---|
| Listings | 19 | 19 loaded by `lib/marketplace` | YES |
| Variants | 90 | 90 across the loaded listings | YES |
| Photos | 19 refs to 18 unique files | 19 per-slug copies (18 unique + 1 shared duplicate: `cadmium.jpg` serves both `cadmium-6n` and `cadmium-ingot-996`) | YES |
| Documents (COA/PDF) | 0 | 0 imported; every `provenance.documents` is null | YES |
| Price range | $22.00 - $7,540.00 (RECON §6) | $22.00 - $7,540.00 (measured) | YES |

Copies are byte-identical (no re-encode); image dimensions were measured with
`sips` and stored in each listing's front matter.

## 3. Per-category counts

| Source category | Count | → Marketplace category |
|---|---|---|
| Ultra Pure | 12 | pure-metal |
| Rare Earth | 4 | pure-metal |
| Alloy | 3 | alloy |

Imported: **pure-metal 16, alloy 3**. Form: `metal` for the 16
elemental listings, `alloy` for the 3 alloys. The source taxonomy value is
preserved verbatim in each listing's reviewer-only `source.category`.

## 4. Coverage gaps (measured)

- **Listings missing a photo: 0 / 19.**
- **Listings missing a price: 0 / 19** (all 90 variants priced, none zero).
- **Listings missing explicit provenance: 3 / 19** — `rose-453`, `woods-metal`, `devardas-alloy` (the three alloys; no `Origin:` bullet in the source). Each gets the honest fallback: `country: null` (renders "Not stated"), `source_type: private-collection`, `verification_status: seller-declared`, and the note *"No origin stated in the source catalog. Imported from the periodictech catalog; provenance verification pending."* The seller's Kazakhstan claim was **not** extended to them (ASSUMPTIONS #5).
- The 16 elemental listings all carry a literal `Origin: Kazakhstan` bullet (asserted during the run) → `country: "KZ"`, still `seller-declared` with a verification-pending note. No COA/certificate exists anywhere in the source, so `documents: null` on all 19.

## 5. Price inversions (imported verbatim, flagged)

The mass-ascending price scan found exactly the two inversions the source's own
comments flag as pending owner review — no others:

| Listing | Lighter pack | Heavier pack (cheaper) | Flag |
|---|---|---|---|
| terbium | 90 g at $539.00 | 150 g at $534.00 | `90 g` variant carries the note |
| devardas-alloy | 250 g at $51.00 | 450 g at $49.00 | `450 g` variant carries the note |

Both anomalous variants carry the note: *"Price flagged for review in the source catalog (heavier pack priced below a lighter one); imported verbatim."* Prices were not
"fixed" — that would fabricate data.

## 6. Exclusions (third-party marks / non-catalog, ASSUMPTIONS #14)

| Item | Why excluded |
|---|---|
| `metals.jpeg` (repo root) | eBay-processed (EXIF "Processed By eBay with ImageMagick") — third-party mark |
| `public/images/hero/*.png` (4 files) | decorative hero art, not listing photos |
| `public/storelogo.png` | Periodic Tech first-party brand, not the marketplace seller identity |
| "Source of truth: Shopify …" comment (`products.ts:2`) | Shopify lineage stripped; SKUs kept only as opaque `legacy_sku` |
| `specimen-kit.zip` | exportable UI kit, contains no listing data |
| `image.bg` gradient classes | presentation-only Tailwind classes, not data |
| COA/"full provenance" marketing prose | page copy with zero files behind it — importing it would fabricate certificates |

## 7. Date derivation (real, deterministic)

`listed_on` = author date of the **first periodictech commit whose diff
introduces `slug: "<slug>"`** in `src/lib/products.ts`
(`git -C periodictech log --reverse --format=%aI -S 'slug: "<slug>"' -- src/lib/products.ts`,
first line, `YYYY-MM-DD`). `updated_at = listed_on` — per-listing update
times are not honestly recoverable from the source (ASSUMPTIONS #6; the file's
last revision, 2026-07-06, is noted here only). Results are cached per
periodictech HEAD sha, so re-runs are stable. The import-step chain date is the
fixed constant `2026-07-28`.

All 19 slugs first appear in the initial import commit:

| Slug | listed_on | Introducing commit |
|---|---|---|
| scandium-1900 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| thulium | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| terbium | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| holmium | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| vanadium-pieces | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| vanadium-wool | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| zirconium | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| tungsten-100 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| lead-6n | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| bismuth-6n | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| cadmium-6n | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| cadmium-ingot-996 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| selenium | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| tellurium-1004900 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| indium-25450 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| cobalt | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| rose-453 | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| woods-metal | 2026-03-11 | 3206bc9 Initial import from Hetzner server |
| devardas-alloy | 2026-03-11 | 3206bc9 Initial import from Hetzner server |

## 8. Shape mapping log

Shape is display-only (never a statistics axis). Mapped from the `Form:`
bullet: compound "a / b (varies by size)" values map from the leading segment;
a segment with no vocabulary token stays null (logged below, never guessed).
`crystals → crystal` follows PLAN's shape vocabulary, which was extended to
the values actually present in this catalog.

| Slug | Form bullet | shape | Note |
|---|---|---|---|
| scandium-1900 | `granules` | granule |  |
| thulium | `dendritic crystals` | crystal |  |
| terbium | `chunks` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| holmium | `lumps` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| vanadium-pieces | `pieces / chunks` | piece | compound value; mapped from the leading segment |
| vanadium-wool | `lathe shavings (wool)` | wool |  |
| zirconium | `pieces` | piece |  |
| tungsten-100 | `pieces` | piece |  |
| lead-6n | `pieces / ingot (varies by size)` | piece | compound value; mapped from the leading segment |
| bismuth-6n | `chunks / ingot (varies by size)` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| cadmium-6n | `pieces` | piece |  |
| cadmium-ingot-996 | `ingot` | ingot |  |
| selenium | `crystalline pieces` | piece |  |
| tellurium-1004900 | `polycrystalline chunks` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| indium-25450 | `chunks` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| cobalt | `chunks` | null | unmappable — no vocabulary token in the leading segment; shape left null |
| rose-453 | (none) | null | no Form bullet (alloy) |
| woods-metal | (none) | null | no Form bullet (alloy) |
| devardas-alloy | (none) | null | no Form bullet (alloy) |

## 9. Catalog-average preview (measured through `lib/marketplace`)

Cells computed by the real `getCatalogAverages()` over the imported files
(per element x form, min 3 variants per cell per `settings.yml`; median is
per-gram cents, rounded to 0.1 here for display). The three alloys are
multi-element (no per-gram statistics key) and `tungsten-100` has a single
variant (below the 3-variant floor), so they appear in no cell:

| Element | Form | Variants | Listings | Median ¢/g |
|---|---|---|---|---|
| Bi | metal | 5 | 1 | 37 |
| Cd | metal | 5 | 2 | 28 |
| Co | metal | 3 | 1 | 15.6 |
| Ho | metal | 8 | 1 | 138.7 |
| In | metal | 6 | 1 | 73.3 |
| Pb | metal | 5 | 1 | 25 |
| Sc | metal | 10 | 1 | 838.8 |
| Se | metal | 5 | 1 | 60 |
| Tb | metal | 8 | 1 | 407 |
| Te | metal | 10 | 1 | 55 |
| Tm | metal | 4 | 1 | 366 |
| V | metal | 10 | 2 | 145.7 |
| Zr | metal | 5 | 1 | 48.8 |

13 cells will appear in the price-reference API. Both V and Cd
cells pool two listings each; every other cell is a single listing.

## 10. Loader validation (the real `lib/marketplace`, compiled with the repo tsc)

- `assertMarketplaceIntegrity()`: **PASS** (zero throws; `expected_listings` gate = 19).
- `getListings()` via `index.ts` (including the `../data` decoration join): **19 listings**, 90 variants, 1 seller.
- Field-level reconcile against the parsed source (title/summary/body verbatim, category, form, shape, purity, country, SKUs, prices, dates, specs, image, provenance): **0 mismatches**.
- Soft data-quality flags (DESIGN §3.3 — surfaced, never fatal):

| Flag | Listings |
|---|---|
| `acquisition_date_unknown` | 19 |
| `no_documents` | 19 |
| `origin_unstated` | 3 |
| `source_name_withheld` | 19 |
| `verification_pending` | 19 |

## 11. Idempotency (this run)

- Listing files: 0 created, 0 updated, 19 byte-identical.
- Photos: 0 created, 0 updated, 19 byte-identical.
- `settings.yml`: already `expected_listings: 19` (untouched).
- **PASS — every output byte-identical to the previous run.**
