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
| Price range | $22.00 - $7,540.00 (RECON §6) | $19.00 - $10,850.00 (measured) | CHECK |

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

## 5. Owner price adjustments (ledger alignment) and inversions

Owner-directed reprice (2026-07-28): the listings below are scaled by a fixed
per-listing factor so their median-pack price sits at (or, for the two cheap
base metals, much nearer) the site's sourced reference band. Factors were
computed once from the price-gauge band and are baked into the script, so
imports stay deterministic. Rounding: whole dollars; scaled-down listings add a flat $14 per-pack handling base so small lots stay commercially sane; then a
non-decreasing repair by mass. All other listings keep their source prices
verbatim.

| Listing | Factor | From-price now |
|---|---|---|
| bismuth-6n | ×0.25 | $21.00 |
| selenium | ×0.25 | $20.00 |
| tungsten-100 | ×0.193 | $19.00 |
| zirconium | ×0.307 | $22.00 |
| indium-25450 | ×0.448 | $29.00 |
| scandium-1900 | ×1.439 | $35.00 |
| terbium | ×1.457 | $32.00 |
| holmium | ×2.104 | $50.00 |
| thulium | ×1.358 | $33.00 |

The repricing repaired terbium's source inversion (90 g had been priced above
150 g). The remaining, untouched inversion is flagged, not fixed:

| Listing | Lighter pack | Heavier pack (cheaper) | Flag |
|---|---|---|---|
| devardas-alloy | 250 g at $51.00 | 450 g at $49.00 | `450 g` variant carries the note |

The flagged variant carries the note: *"Price flagged for review in the source catalog (heavier pack priced below a lighter one); imported verbatim."*

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
| Bi | metal | 5 | 1 | 13.5 |
| Cd | metal | 5 | 2 | 28 |
| Co | metal | 3 | 1 | 15.6 |
| Ho | metal | 8 | 1 | 291.7 |
| In | metal | 6 | 1 | 44 |
| Pb | metal | 5 | 1 | 25 |
| Sc | metal | 10 | 1 | 1207 |
| Se | metal | 5 | 1 | 31.1 |
| Tb | metal | 8 | 1 | 642.7 |
| Te | metal | 10 | 1 | 55 |
| Tm | metal | 4 | 1 | 497 |
| V | metal | 10 | 2 | 145.7 |
| Zr | metal | 5 | 1 | 20.4 |

13 cells will appear in the price-reference API. Both V and Cd
cells pool two listings each; every other cell is a single listing.

## 10. Loader validation (the real `lib/marketplace`, compiled with the repo tsc)

- `assertMarketplaceIntegrity()`: **PASS** (zero throws; `expected_listings` gate = 23).
- `getListings()` via `index.ts` (including the `../data` decoration join): **19 listings**, 90 variants, 3 seller.
- Field-level reconcile against the parsed source (title/summary/body verbatim, category, form, shape, purity, country, SKUs, prices, dates, specs, image, provenance): **0 mismatches**.
- Soft data-quality flags (DESIGN §3.3 — surfaced, never fatal):

| Flag | Listings |
|---|---|
| `acquisition_date_unknown` | 20 |
| `no_documents` | 20 |
| `origin_unstated` | 3 |
| `source_name_withheld` | 23 |
| `verification_pending` | 20 |

## 11. Idempotency (this run)

- Listing files: 0 created, 0 updated, 19 byte-identical.
- Photos: 0 created, 0 updated, 19 byte-identical.
- `settings.yml`: already `expected_listings: 23` (untouched).
- **PASS — every output byte-identical to the previous run.**

## Data-fidelity audit (sampled)

**Scope note:** this audit covered the **19 periodictech-imported listings**
as they stood at audit time. The 4 demonstration listings added afterwards
(`scandium-dendritic-4n`, `strategic-metals-specimen-set`,
`tellurium-chunks-5n`, `thulium-dendritic` — all `status: "placeholder"`,
all variants on `DEMO-` SKUs) are out of its scope by design; the "all 19"
global checks below apply to the periodictech-imported set only.

Independent verification by the `qa-fidelity` agent, 2026-07-28 — recomputed
from scratch, not from the importer's own logs. Method: evaluated
`periodictech/src/lib/products.ts` at HEAD via TypeScript transpile +
`node:vm` (never regex-scraped); split each listing's front matter manually
and byte-compared the raw body; re-parsed the `• label: value` bullets /
alloy composition sentences from the raw source `description` string;
compared every variant field integer-for-integer; `sha256` on every photo
pair. Audit script: session scratchpad `audit.mjs` (not committed).

**Sampling rule:** the 19 slugs sorted alphabetically, every 2nd starting
from the first → 10 listings:

`bismuth-6n`, `cadmium-ingot-996`, `devardas-alloy`, `indium-25450`,
`rose-453`, `selenium`, `terbium`, `tungsten-100`, `vanadium-wool`,
`zirconium`

### Per-listing results

Checks: (1) title verbatim vs `name`; (2) body byte-equal to source
`description`; (3) specs rows equal the independently recomputed parse of
the description's bullets / composition sentences (plus the derived
`Element(s)` row = `symbol`); (4) every variant `legacy_sku`/`label`/
`mass_g`/`price_usd_cents` === source `sku`/`label`/`massGrams`/
`unitAmount` (integer cents, order preserved); (5) copied photo
byte-identical (sha256) to the mapped source file; (6) provenance honesty —
`country` KZ iff the source has an `Origin:` bullet else null, `documents`
null, no invented specifics, `purity_pct` numerically equal to the source
purity string.

| Slug | 1 Title | 2 Body | 3 Specs | 4 Variants (n) | 5 Photo (source file) | 6 Provenance |
|---|---|---|---|---|---|---|
| bismuth-6n | PASS | PASS | PASS | PASS (5) | PASS (bismuth.jpg) | PASS |
| cadmium-ingot-996 | PASS | PASS | PASS | PASS (1) | PASS (cadmium.jpg, shared) | PASS |
| devardas-alloy | PASS | PASS | PASS | PASS (2) | PASS (devarda.jpg) | PASS |
| indium-25450 | PASS | PASS | PASS | PASS (6) | PASS (indium.jpg) | PASS |
| rose-453 | PASS | PASS | PASS | PASS (1) | PASS (rose.jpg) | PASS |
| selenium | PASS | PASS | PASS | PASS (5) | PASS (selenium.jpg) | PASS |
| terbium | PASS | PASS | PASS | PASS (8) | PASS (terbium.jpg) | PASS |
| tungsten-100 | PASS | PASS | PASS | PASS (1) | PASS (tungsten.jpg) | PASS |
| vanadium-wool | PASS | PASS | PASS | PASS (5) | PASS (vanadiumshavings.jpg) | PASS |
| zirconium | PASS | PASS | PASS | PASS (5) | PASS (zirconium.jpg) | PASS |

**Discrepancies found: none** (60/60 checks). One uniform framing note, not
a drift: every body is exactly `description + "\n"` — the single POSIX
trailing newline at EOF, identical across all 10 samples; zero other byte
differences (whitespace included). The provenance free text on every sample
contains only the honest negations ("No supporting document on file", "No
independent assay on file") — no mines, certificates, regions, acquisition
dates, or source names appear anywhere; `source_name`/`region`/
`acquired_on` are null and `verification_status` is `seller-declared` on
all 10.

### Global checks (all 19)

| Check | Result |
|---|---|
| Title set equality (19 imported titles vs 19 source `name`s, byte-level incl. U+2019) | **PASS** — sets identical, 0 only-source, 0 only-imported; slug sets identical too |
| Variant grand total | **PASS** — source 90 = imported 90 |
| Price-inversion notes | **PASS** — non-null variant notes exist on exactly 2 of 90 variants: `terbium` 90 g and `devardas-alloy` 450 g, both with the exact review sentence; nowhere else. (Placement matches §5: terbium flags the overpriced lighter pack, devardas the cheaper heavier pack.) |
| Photo byte-identity, all 19 | **PASS** — every `public/assets/marketplace/listings/<slug>/01.jpg` sha256-equal to its mapped `periodictech/public/images/products/*` file, incl. all 6 filename≠slug mappings and `cadmium.jpg` correctly shared by both cadmium listings |
| `documents: null` on all 19 | **PASS** — 0 non-null |
| Country partition | **PASS** — `KZ` on the 16 listings whose source carries `• Origin: Kazakhstan`; `null` on exactly `rose-453`, `woods-metal`, `devardas-alloy` (the 3 alloys with no Origin bullet) |

### Verdict

The sampled import is faithful to the byte. Across 10 of 19 listings
(53% of the catalog, deterministic every-2nd sample) every title, body,
spec row, variant SKU/label/mass/price-in-cents, and photo checksum matches
the periodictech source exactly, with the sole systematic difference being
a single POSIX trailing newline at end of body — a file-format convention,
uniform everywhere, not data drift. The global invariants hold on all 19:
title and slug sets are identical, the 90-variant total reconciles, the two
known price inversions are flagged verbatim on exactly terbium and
devardas-alloy and nowhere else, all 19 photos are byte-identical copies
(shared cadmium image handled correctly), and provenance stays honest —
KZ only where the source literally states Kazakhstan, null for the three
alloys, no documents, certificates, mines, dates, or source names invented
anywhere. No corrective action required.

### Amendment (2026-07-28, post-audit)

The audit above verified prices against the source **before** the
owner-directed ledger reprice (report §5, ASSUMPTIONS #23). For the nine
repriced listings, marketplace prices now intentionally differ from the
source catalog by the documented fixed factors; titles, bodies, specs,
photos, and provenance remain as audited.
