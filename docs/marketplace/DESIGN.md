# DESIGN — Lanthanides Marketplace (Preliminary)

**Status:** design only. Nothing here is built yet. Written against the repo as of 2026-07-28.

**Scope:** a read-only, build-time-rendered marketplace surface. No checkout, no auth, no database. Purchase is a stubbed inquiry CTA. The seed catalog is the founder's existing retail business (seller handle `kazakhelements`), imported as reviewed git diffs.

**Grounding.** Every convention below is lifted from something already in this repo, not invented:

| Convention | Existing precedent |
| --- | --- |
| Markdown collection: front matter + body via `gray-matter`, per-process memoisation, path-traversal regex guard | `lib/content.ts` (`_elements/*.md`, `_articles/*.md`) |
| Snake_case YAML in a repo-root underscore dir, typed loader that throws at build | `lib/data/load.ts` over `_data/*.yml` |
| Loader failure prefix + `once()` memoisation + `requireFields()` | `lib/data/load.ts` |
| Cross-file integrity assertion run once on first accessor, throws → `npm run build` fails | `lib/data/verify.ts` (`assertDataIntegrity`) |
| API JSON is snake_case, emitted verbatim from the typed accessor | `app/api/export/[format]/route.ts` |
| Static API route: `force-static` + `generateStaticParams` + `dynamicParams = false` | `app/api/export/[format]/route.ts` |
| Dynamic API route: `force-dynamic` + `runtime = 'nodejs'` + CORS block + `{ error, allowed }` bodies | `app/api/price-gauge/route.ts` |
| Client filter island SSR'd with filters cleared so the full list ships in the initial HTML | `components/regulatory/RegulatoryView.tsx` |
| Per-element detail page: `generateStaticParams` + `dynamicParams = false`, case-sensitive | `app/elements/[symbol]/page.tsx` |
| Images under `public/assets/…`, referenced `/assets/…`, `next/image` with explicit intrinsic w/h | `components/news/ArticleCard.tsx`, `_articles` front matter `image_w`/`image_h` |
| `.numeric` / `font-mono` + `tabular-nums` for every figure | `app/globals.css` |

**Naming hazard, resolved up front.** The site already owns the phrase *reference price*: `_data/elements/*.yml` carries `retail_reference` and `bulk_benchmark`, and `getReferencePrices()` in `lib/data/index.ts` returns them. Those are sourced, cited, methodology-backed figures. The marketplace statistic in §4 is **the seller's own catalog average** and is a different population entirely (retail specimen pricing vs industrial quotes — often an order of magnitude apart). It is named `catalog_average` in every type, field, and UI string. The words "reference price", "benchmark", and "market price" are forbidden on marketplace surfaces. The only place the string `price-reference` survives is the API path, which is fixed by the brief; its payload leads with a `basis` and a `disclaimer` field.

---

## 1. File-store layout

```
_marketplace/
  settings.yml                 # thresholds + display labels (mirrors _data/site_settings.yml)
  sellers.yml                  # top-level LIST of sellers (mirrors _data/element_catalog.yml)
  sellers/
    kazakhelements.md          # optional long bio: front matter is ignored, body is the bio
  listings/
    dy-metal-dendritic-5g.md   # one file per listing; filename === slug
    nd2o3-powder-99-9-50g.md
    ...
public/assets/marketplace/
  listings/<slug>/01.jpg 02.jpg …          # listing photos
  listings/<slug>/docs/invoice-2024-08.jpg # provenance documents (images or PDFs)
  sellers/<handle>/avatar.jpg
```

Rationale for the split: structured, cross-listing facts that need to be diffed as a table go in YAML (`sellers.yml`, `settings.yml`), exactly as `element_catalog.yml` does. Per-item prose that a human writes and reviews goes in markdown with front matter, exactly as `_elements/*.md` does. Nothing derived is committed — `catalog_average` is computed at build from `listings/` so it cannot drift from its inputs (§4).

`_marketplace/` sits at the repo root beside `_data/`, `_elements/`, `_articles/`. It is **writable by humans and agents** — unlike `_data/`, which CLAUDE.md reserves for the Python pipeline. Every change is a reviewed PR diff; that is the entire "migration" story (§3.6).

### 1.1 Full example listing file

`_marketplace/listings/dy-metal-dendritic-5g.md`

```markdown
---
# NOTE: template values. Real numbers come from the catalog import PR; nothing
# in this file is a published figure until a maintainer has reviewed the diff.
slug: dy-metal-dendritic-5g
title: "Dysprosium Metal, Dendritic Pieces — 5 g, 99.9%"
status: preliminary
category: pure-metal
seller: kazakhelements

elements: [Dy]
primary_element: Dy
form: metal
shape: piece
purity_pct: 99.9
purity_basis: "Seller-declared, 3N (99.9%) metals basis. No third-party assay on file."

quantity_g: 5.0
quantity_note: "Nominal 5 g; individual pieces vary ±0.15 g."
price_usd_cents: 2800
price_note: null
moq_units: 1
stock_units: 6
condition: null
currency: USD
exclude_from_catalog_average: false

listed_on: "2026-07-14"
updated_at: "2026-07-22"
source_listing_url: null

specs:
  - { label: "Element", value: "Dysprosium (Dy), Z=66" }
  - { label: "Form", value: "Metal, dendritic pieces" }
  - { label: "Purity", value: "99.9", unit: "%" }
  - { label: "Net weight", value: "5.0", unit: "g" }
  - { label: "Packaging", value: "Argon-flushed glass vial, heat-sealed" }
  - { label: "Storage", value: "Dry, sealed; oxidises slowly in humid air" }
  - { label: "CAS", value: "7429-91-6" }
  - { label: "HS code", value: "2805.30" }

images:
  - path: /assets/marketplace/listings/dy-metal-dendritic-5g/01.jpg
    alt: "Dendritic dysprosium metal pieces in an argon-flushed glass vial, metric scale alongside"
    width: 1600
    height: 1200
    is_primary: true
    sort_order: 0
    caption: "As shipped: sealed vial, 5 g net."
  - path: /assets/marketplace/listings/dy-metal-dendritic-5g/02.jpg
    alt: "Close-up of a single dysprosium dendrite showing bright metallic fracture surfaces"
    width: 1600
    height: 1200
    is_primary: false
    sort_order: 1
    caption: "Fresh fracture surface, no visible oxide bloom."
  - path: /assets/marketplace/listings/dy-metal-dendritic-5g/03.jpg
    alt: "The vial on a digital balance reading 5.02 grams"
    width: 1600
    height: 1200
    is_primary: false
    sort_order: 2
    caption: "Weight check on receipt: 5.02 g gross of contents."

provenance:
  source_type: refinery
  source_name: "Undisclosed CIS distributor (name withheld at supplier's request)"
  country: KZ
  region: "Almaty region"
  acquired_on: "2024-08-19"
  verification_status: document-on-file
  declared_by: kazakhelements
  chain:
    - { step: 1, actor: "Refinery lot 24-DY-113", date: "2024-06", note: "Distillation-refined metal, lot certificate seen." }
    - { step: 2, actor: "CIS distributor", date: "2024-08", note: "Bulk purchase, 2 kg lot." }
    - { step: 3, actor: "Kazakh Elements", date: "2024-08-19", note: "Repackaged into 5 g argon-sealed vials." }
  documents:
    - { kind: invoice, label: "Purchase invoice, 2 kg lot (personal data redacted)", path: /assets/marketplace/listings/dy-metal-dendritic-5g/docs/invoice-2024-08.jpg, issued_on: "2024-08-19" }
    - { kind: coa, label: "Supplier certificate of analysis, lot 24-DY-113", path: /assets/marketplace/listings/dy-metal-dendritic-5g/docs/coa-24-dy-113.jpg, issued_on: "2024-06-11" }
  notes: >-
    The refinery lot certificate is the supplier's own document, not an
    independent assay. Purity is seller-declared on that basis.

tags: [collector-grade, sealed, heavy-rare-earth]
---

Dendritic dysprosium metal, distillation-refined, supplied in an argon-flushed
and heat-sealed glass vial. The dendrites show the bright, faceted fracture
surfaces typical of vapour-deposited metal; there is no visible oxide bloom on
any piece in this lot.

Dysprosium oxidises slowly in humid air and will dull within weeks if the vial
is opened and left unsealed. Keep it sealed unless you are assaying it.

**What this is suited for.** Reference specimens, element collections, teaching
sets, and small-scale alloying or diffusion experiments where a documented,
sealed 5 g quantity is more useful than a bulk purchase.

**What this is not.** This is not an industrially certified feedstock. The
purity figure comes from the supplier's lot certificate, not from an
independent assay commissioned by the seller. If you need certified material for
production, buy from a refinery with a current CoA in your name.

Dysprosium is controlled under MOFCOM/GAC Announcement No. 18/2025 in its
metal, oxide, alloy, and compound forms. Cross-border purchases may require
an export licence in the origin jurisdiction; that is the buyer's
responsibility.
```

### 1.2 `_marketplace/sellers.yml`

```yaml
# Marketplace sellers. Top-level list, mirroring _data/element_catalog.yml.
- handle: kazakhelements
  display_name: "Kazakh Elements"
  country: KZ
  member_since: "2020-03"
  verified: true
  verification_basis: "Identity and business registration confirmed by the site operator; trading history reviewed."
  verified_on: "2026-07-10"
  contact_email: "marketplace@lanthanides.io"
  avatar:
    path: /assets/marketplace/sellers/kazakhelements/avatar.jpg
    alt: "Kazakh Elements shop mark"
    width: 512
    height: 512
  tagline: "Rare-earth and strategic-metal specimens from Kazakhstan since 2020."
  declared_claims:
    - { label: "Years trading", value: "~6", basis: seller-declared }
    - { label: "Transactions to date", value: "~10,000", basis: seller-declared }
```

`declared_claims` exists so the founder's trading history can be shown **without** the site appearing to certify it. Every entry carries `basis`, and the only permitted value today is `seller-declared`; the UI renders these in a muted list under a literal "Seller-declared" heading, never as a `<Stat>` (§6.3).

### 1.3 `_marketplace/settings.yml`

```yaml
# Marketplace thresholds and display labels. Mirrors _data/site_settings.yml.
currency: USD

# Catalog-average gating (see DESIGN §4).
catalog_average_min_sample: 5      # leave-one-out sample needed for a comparison hint
catalog_average_show_bare_min: 3   # below this, no figure at all

stale_listing_days: 180            # matches _data/site_settings.yml stale_threshold_days

category_labels:
  pure-metal: "Pure Metal"
  oxide: "Oxide"
  mineral-ore: "Mineral / Ore"
  high-tech: "High-Tech Material"
  equipment: "Equipment"

form_labels:
  metal: "Metal"
  oxide: "Oxide"
  alloy: "Alloy"
  salt: "Salt / Compound"
  mineral: "Mineral"

source_type_labels:
  mine: "Mine"
  refinery: "Refinery"
  lab: "Laboratory"
  private-collection: "Private Collection"
  recycled: "Recycled / Reclaimed"

verification_labels:
  seller-declared: "Verification pending"
  document-on-file: "Documents on file"
  site-verified: "Site-verified"
```

---

## 2. Schema: front matter (snake_case) → TS contracts (camelCase)

Boundary rule, matching the repo: **files and API JSON are snake_case; TypeScript is camelCase.** `lib/content.ts` keeps front-matter keys verbatim in its interfaces; `lib/data/types.ts` does the same for `_data`. The marketplace deliberately does *not* — it maps snake→camel in the loader and camel→snake in `lib/marketplace/serialize.ts`, because listings are authored by hand and the API needs a stable contract independent of the file format. That is one mapping table in one file, not a per-page concern.

### 2.1 Listing front matter

| Front matter (snake) | TS (camel) | Type | Null? | Rules |
| --- | --- | --- | --- | --- |
| `slug` | `slug` | `string` | required | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3–80 chars, **must equal the filename** without `.md`, must not be a reserved segment (§2.4) |
| `title` | `title` | `string` | required | 8–120 chars, no trailing period |
| `status` | `status` | `'preliminary' \| 'placeholder'` | required | `placeholder` = shape-only stub; renders `noindex`, excluded from averages, excluded from the index grid unless `?include=placeholder` |
| `category` | `category` | `ListingCategory` | required | `pure-metal \| oxide \| mineral-ore \| high-tech \| equipment` |
| `seller` | `sellerHandle` | `string` | required | must resolve in `sellers.yml` |
| `elements` | `elements` | `string[]` | required (may be `[]`) | each must be a catalog symbol, **case-sensitive** (`Dy`, not `dy`), no duplicates |
| `primary_element` | `primaryElement` | `string \| null` | required key, value nullable | non-null iff `elements.length >= 1`; must be a member of `elements` |
| `form` | `form` | `MaterialForm \| null` | required key, value nullable | `metal \| oxide \| alloy \| salt \| mineral`; **must be non-null** for `pure-metal`/`oxide`/`mineral-ore`, **must be null** for `high-tech`/`equipment` |
| `shape` | `shape` | `ListingShape \| null` | required key, nullable | `ingot \| powder \| foil \| wire \| rod \| piece \| crystal \| target \| ampoule \| specimen \| assembly`. **Display only — never a statistics axis** |
| `purity_pct` | `purityPct` | `number \| null` | required key, nullable | `0 < p <= 100`; non-null required for `pure-metal`/`oxide`; N-notation (`4N`) is rejected — put it in `purity_basis` |
| `purity_basis` | `purityBasis` | `string \| null` | required key, nullable | free text; soft-warns if null while `purity_pct` is set |
| `quantity_g` | `quantityG` | `number \| null` | required key, nullable | `> 0`; required when `price_usd_cents` is non-null on a material category |
| `quantity_note` | `quantityNote` | `string \| null` | required key, nullable | |
| `price_usd_cents` | `priceUsdCents` | `number \| null` | required key, nullable | positive integer; `null` = inquiry-only (no price shown, sorts last) |
| `price_note` | `priceNote` | `string \| null` | required key, nullable | |
| `currency` | `currency` | `'USD'` | required | pinned to `USD`; any other value fails the build (see §7 Q8) |
| `moq_units` | `moqUnits` | `number \| null` | required key, nullable | positive integer |
| `stock_units` | `stockUnits` | `number \| null` | required key, nullable | non-negative integer; `0` renders "Sold / out of stock" |
| `condition` | `condition` | `'new' \| 'used' \| 'refurbished' \| 'specimen' \| null` | required key, nullable | non-null required for `high-tech`/`equipment` |
| `exclude_from_catalog_average` | `excludeFromCatalogAverage` | `boolean` | required (default `false` accepted) | author escape hatch for mixed lots / bundles |
| `listed_on` | `listedOn` | `string` (ISO `YYYY-MM-DD`) | required | **quote it** — see §2.5 |
| `updated_at` | `updatedAt` | `string` (ISO `YYYY-MM-DD`) | required | `>= listed_on`, not in the future |
| `source_listing_url` | `sourceListingUrl` | `string \| null` | required key, nullable | provenance of the *import*, for reviewers; never rendered |
| `specs` | `specs` | `SpecRow[]` | required, ≥1 | ordered; `{ label: string; value: string; unit?: string \| null }` |
| `images` | `images` | `ListingImage[]` | required, ≥1 | §2.2 |
| `provenance` | `provenance` | `ProvenanceRecord` | required, exactly one | §2.3 |
| `tags` | `tags` | `string[] \| null` | required key, nullable | kebab-case; free-text filter only, no colour, no taxonomy claims |
| *(markdown body)* | `body` | `string` | required, non-empty | rendered with `react-markdown` + `remark-gfm`, matching `app/news/[slug]/page.tsx`. **No `rehype-raw`** — marketplace bodies are plain markdown, no inline HTML, no Liquid |

Derived (never authored, computed in the loader — so they cannot drift):

| TS field | Type | Rule |
| --- | --- | --- |
| `pricePerGramCents` | `number \| null` | `priceUsdCents / quantityG`, unrounded float; `null` when either input is null. Rounded only at render/serialise |
| `primaryImage` | `ListingImage` | the one `isPrimary: true` entry |
| `dataQualityFlags` | `DataQualityFlag[]` | soft warnings, §3.3 |
| `url` | `string` | `/marketplace/${slug}/` |

### 2.2 `images` (embedded list, ≥1)

| Front matter | TS | Type | Null? | Rules |
| --- | --- | --- | --- | --- |
| `path` | `path` | `string` | required | must start `/assets/marketplace/listings/<slug>/`; the file must exist at `public${path}`; extension in `.jpg .jpeg .png .webp` |
| `alt` | `alt` | `string` | required | non-empty, ≥12 chars; describes the photo, not the product name |
| `width` | `width` | `number` | required | positive integer, intrinsic pixels (feeds `next/image`, prevents CLS — same contract as `_articles` `image_w`) |
| `height` | `height` | `number` | required | positive integer |
| `is_primary` | `isPrimary` | `boolean` | required | **exactly one** `true` per listing |
| `sort_order` | `sortOrder` | `number` | required | non-negative integer, unique within the listing; gallery order |
| `caption` | `caption` | `string \| null` | required key, nullable | rendered under the photo in the gallery |

The primary image is rendered first in the gallery regardless of `sortOrder`, and is the OG image (§6.2). Everything else follows `sortOrder` ascending.

### 2.3 `provenance` (embedded mapping, exactly one per listing)

| Front matter | TS | Type | Null? | Rules |
| --- | --- | --- | --- | --- |
| `source_type` | `sourceType` | `ProvenanceSourceType` | required | `mine \| refinery \| lab \| private-collection \| recycled` |
| `source_name` | `sourceName` | `string \| null` | required key, nullable | null is legitimate (supplier confidentiality) and surfaces as a soft flag |
| `country` | `country` | `string` | required | ISO-3166-1 alpha-2, uppercase, validated against a static list |
| `region` | `region` | `string \| null` | required key, nullable | |
| `acquired_on` | `acquiredOn` | `string \| null` | required key, nullable | ISO date or `YYYY-MM`; not in the future |
| `verification_status` | `verificationStatus` | `'seller-declared' \| 'document-on-file' \| 'site-verified'` | required | `site-verified` may only be authored by a maintainer; the build warns loudly if it appears in a PR that also adds the listing |
| `declared_by` | `declaredBy` | `string` | required | must equal the listing's `seller` |
| `chain` | `chain` | `ProvenanceStep[] \| null` | required key, nullable | `{ step: number; actor: string; date: string \| null; note: string \| null }`; `step` values must be `1..n` contiguous |
| `documents` | `documents` | `ProvenanceDocument[] \| null` | required key, nullable | `{ kind: 'invoice' \| 'assay' \| 'coa' \| 'photo' \| 'customs' \| 'other'; label: string; path?: string; url?: string; issued_on: string \| null }`; exactly one of `path`/`url`; `path` must exist under `public/` |
| `notes` | `notes` | `string \| null` | required key, nullable | |

One provenance record per listing, embedded rather than a side table. Reason: a listing without provenance is not publishable on this site, so a foreign key that can dangle is the wrong shape — colocating it makes "missing provenance" a parse error rather than a join miss, and keeps the whole trust story visible in one reviewed diff.

`verification_status` drives the badge in §6.2. `seller-declared` (the default state for the seed catalog) renders **"Verification pending"**, always, with no exception.

### 2.4 Slug rules

1. `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3–80 characters. Lowercase only — **not** merely a style rule: `Dy-metal.md` and `dy-metal.md` are the same file on macOS's case-insensitive default filesystem and would silently clobber each other in a PR while both resolving in CI on Linux.
2. `slug` front matter must equal the filename stem. The loader checks both directions.
3. Recommended shape: `<element-lower>-<form>-<distinguisher>-<quantity>`, e.g. `dy-metal-dendritic-5g`, `nd2o3-powder-99-9-50g`, `sc-sputtering-target-2in`. Not enforced — enforcing it would break for equipment and multi-element listings.
4. **Reserved segments** that fail the build: `sellers`, `page`, `index`, `api`, `new`, `search`, `all`. `sellers` is the load-bearing one — `/marketplace/sellers/` is a static route segment that Next resolves ahead of `/marketplace/[slug]/`, so a listing slugged `sellers` would be permanently unreachable.
5. Slugs are immutable once merged. Renaming a listing requires a redirect entry in `next.config.mjs` in the same PR (the repo already treats URLs as a hard contract — see the redirect block).
6. Seller handles use the same regex, 2–32 chars, and are also filenames (`_marketplace/sellers/<handle>.md`).

### 2.5 Two parsing gotchas the loader must handle

- **Dates.** `gray-matter` parses an unquoted YAML `2026-07-14` into a JS `Date`, which then serialises to an ISO *timestamp* and can shift a day across timezones. `lib/content.ts` already fixes this with `toISODate()`. The marketplace loader reuses that normalisation and *additionally* fails the build if the raw value was not a quoted string — the pattern is easy to get wrong and cheap to check.
- **Numbers.** `purity_pct: 99.90` and `price_usd_cents: 2800` must be YAML numbers, not strings. The loader type-checks rather than coercing; `"2800"` fails.

---

## 3. `lib/marketplace` — loaders, validation, and what fails the build

```
lib/marketplace/
  types.ts            # camelCase TS contracts (§2). The schema source of truth.
  load.ts             # fs + gray-matter + yaml readers, once()-memoised, throw on malformed
  validate.ts         # pure predicates: enums, slug, ISO dates, ISO-2 country, purity range
  index.ts            # public accessors; runs assertMarketplaceIntegrity() on first call
  verify.ts           # cross-file integrity (dup slugs, FKs, counts) — mirrors lib/data/verify.ts
  catalog-average.ts  # §4 derivation
  serialize.ts        # camelCase TS -> snake_case API JSON
```

Everything here touches `fs` and is therefore **server-only by construction**. Import from Server Components and route handlers; never from a Client Component. The client filter island receives plain serialised summaries as props — the exact arrangement `RegulatoryView` uses.

Error message prefix, matching `lib/data/load.ts`:

```
[lib/marketplace] malformed _marketplace/listings/dy-metal-dendritic-5g.md: images[1] "path" points at a file that does not exist: public/assets/marketplace/listings/dy-metal-dendritic-5g/02.jpg
```

Every message names the file, the field path (`images[1].path`), and what was expected. A malformed listing must be fixable from the CI log alone.

### 3.1 Hard failures — these throw and break `npm run build`

**Structure and identity**
1. `_marketplace/listings/` unreadable, or zero `.md` files.
2. Front matter missing a required key, or a key with the wrong type (`requireFields`-style, extended with type checks).
3. `slug` absent, malformed, longer than 80 chars, reserved (§2.4), or not equal to the filename stem.
4. **Duplicate slug** across two files (only reachable via case variance or a stale front-matter slug — check anyway).
5. Empty markdown body.
6. Unknown front-matter key not in the schema — fails rather than being ignored, so a typo'd `purity_percent` cannot silently drop a trust field.

**Enums**
7. `category`, `status`, `form`, `shape`, `condition`, `provenance.source_type`, `provenance.verification_status`, or any `documents[].kind` outside its vocabulary. The message lists the allowed set (mirrors `/api/price-gauge`'s `{ error, allowed }` habit).
8. `currency !== 'USD'`.

**Referential integrity**
9. `seller` not present in `sellers.yml` (unknown seller handle).
10. Any symbol in `elements` absent from `getElements()`, or present with the wrong case.
11. `primary_element` not a member of `elements`, or null while `elements` is non-empty.
12. `provenance.declared_by !== seller`.

**Provenance**
13. `provenance` block missing entirely.
14. `provenance.country` missing or not a valid ISO-3166-1 alpha-2 code.
15. `documents[]` entry with neither `path` nor `url`, or with both.
16. `documents[].path` set but the file is absent under `public/`.
17. `chain[].step` values not contiguous from 1.

**Images**
18. `images` empty.
19. Not exactly one `is_primary: true`.
20. Duplicate `sort_order` within a listing.
21. `width`/`height` missing, non-integer, or ≤ 0.
22. `alt` missing or under 12 characters.
23. `path` outside `/assets/marketplace/listings/<slug>/`, or with a disallowed extension.
24. **Missing image file on disk** — `existsSync(join(process.cwd(), 'public', path))`.

**Numeric domains**
25. `purity_pct` outside `(0, 100]`, or null on a `pure-metal`/`oxide` listing.
26. `price_usd_cents` non-integer or ≤ 0 (use `null` for inquiry-only).
27. `quantity_g` ≤ 0, or null while `price_usd_cents` is set on a material category (a per-gram figure would be underivable and the listing would be silently invisible to the statistics layer).
28. `moq_units`/`stock_units` negative or non-integer.

**Category coherence**
29. `form` null on `pure-metal`/`oxide`/`mineral-ore`, or non-null on `high-tech`/`equipment`. This is the guard that keeps a sputtering target out of the per-gram metal average.
30. `condition` null on `high-tech`/`equipment`.

**Dates**
31. Any date not a quoted ISO `YYYY-MM-DD` string (or `YYYY-MM` where permitted).
32. `updated_at < listed_on`.
33. Any date in the future relative to build time — a future date makes the build non-deterministic (a listing would appear on its own without a diff).

**Cross-file (in `verify.ts`, mirroring `assertDataIntegrity`)**
34. `sellers.yml` malformed, duplicate handle, or a seller with `verified: true` and no `verification_basis`.
35. `settings.yml` missing a threshold or a label for any enum member (so adding a category without a label fails loudly).
36. `EXPECTED_LISTINGS` mismatch. `lib/data/verify.ts` asserts exact counts (31 elements, 238 price records); the marketplace mirrors it. Cost: one constant bumped per import PR. Benefit: a file dropped by a bad merge fails CI instead of silently shrinking the catalog. (See §7 Q5 for the floor-vs-exact tradeoff.)
37. A seller in `sellers.yml` with zero listings — warn, don't fail; a seller page with an empty grid is a legitimate state.

### 3.2 Why "unknown key fails" is worth the friction

The seed catalog is imported in bulk from an existing retail business. Bulk imports are exactly where a field gets renamed halfway through and the second half of the batch silently loses its purity, its provenance date, or its primary image. Rejecting unknown keys converts that class of error from "shipped wrong" to "CI red on the import PR". The cost is that adding a field means touching `types.ts` — which is the point: `types.ts` is the schema, and a schema change should be a reviewed diff.

### 3.3 Soft warnings — surfaced, never fatal

Collected per listing into `dataQualityFlags: DataQualityFlag[]`, and simultaneously `console.warn`ed with the `[lib/marketplace]` prefix during the build.

| Flag | Condition | UI treatment |
| --- | --- | --- |
| `verification_pending` | `verificationStatus === 'seller-declared'` | **"Verification pending"** chip on the card and a prominent line in the provenance panel |
| `no_documents` | `documents` null or empty | "No supporting documents on file" inside the provenance panel |
| `acquisition_date_unknown` | `acquiredOn === null` | Provenance row renders "Not stated" |
| `source_name_withheld` | `sourceName === null` | Provenance row renders "Not disclosed by seller" |
| `stale_listing` | `updatedAt` older than `stale_listing_days` (180) | Muted "Last updated <date>" line on the detail page |
| `no_per_gram_basis` | material listing with a price but `quantityG === null` | Per-gram row omitted; excluded from averages |
| `insufficient_catalog_sample` | leave-one-out sample < `catalog_average_min_sample` | Comparison hint is **not rendered** (§4) |
| `purity_basis_unstated` | `purityPct` set, `purityBasis` null | Purity row footnoted "Basis not stated" |
| `out_of_stock` | `stockUnits === 0` | "Sold" chip; CTA copy changes to "Ask about restock" |

Build-log-only (never rendered, since surfacing them would be self-flagellation rather than buyer information): `thin_description` (body < 200 chars), `few_photos` (< 3 images), `duplicate_alt_text` (two images share `alt`), `spec_table_thin` (< 4 spec rows).

The distinction is a single question: **does this tell the buyer something they should weigh before inquiring?** If yes, it renders. If it only tells the maintainer to do better work, it stays in the log.

### 3.4 Accessors (`lib/marketplace/index.ts`)

```ts
getListings(): Listing[]                              // all, sorted newest-first, integrity-checked
getListing(slug: string): Listing | null              // null on unknown slug (mirrors getArticleContent)
getListingSlugs(): string[]                           // for generateStaticParams
getSellers(): Seller[]
getSeller(handle: string): Seller | null
getSellerListings(handle: string): Listing[]
getCatalogAverages(): CatalogAverageCell[]            // §4
getCatalogAverageFor(el, form, excludeSlug?): CatalogAverageCell | null
getMarketplaceFacets(): { elements, categories, forms, priceRangeCents }  // filter options, derived
```

`assertMarketplaceIntegrity()` is `once()`-memoised and called at the top of every accessor, exactly as `ensureVerified()` is in `lib/data/index.ts`.

### 3.5 "Migrations", without a database

There is no migration runner because there is no database. The equivalent guarantees are:

- **Schema** = `lib/marketplace/types.ts` plus the validators in `validate.ts`.
- **Migration** = a PR that changes `types.ts` *and* every affected file under `_marketplace/`, in one diff. If the two disagree, `npm run build` fails — so a half-applied migration cannot merge.
- **Rollback** = `git revert`.
- **Audit log** = `git log -p _marketplace/`. Every price change, every provenance edit, every photo swap has an author, a timestamp, and a reviewer. This is strictly better than a mutable `listings` table for a product whose thesis is trust.
- **Backfill** = a script under `scripts/` that *prints* proposed front matter to stdout for a human to commit. Nothing under `lib/` ever writes to `_marketplace/`, mirroring the existing hard rule that `lib/data` never writes `_data/`.

---

## 4. `catalog_average`: derivation, gating, and honest naming

### 4.1 What it is

For each `(primary_element × form)` cell, the average and median **per-gram price in USD cents** across this marketplace's own listings. Derived at build in `lib/marketplace/catalog-average.ts` from `getListings()`. Not committed — a committed copy could drift from the listings it summarises, and the whole point is that it cannot.

### 4.2 Eligibility — a listing feeds a cell only if all hold

1. `status === 'preliminary'` (placeholders never count).
2. `elements.length === 1` and `primaryElement !== null`. A multi-element listing has no single per-gram meaning.
3. `form !== null` — which by rule 29 means the category is `pure-metal`, `oxide`, or `mineral-ore`. **`high-tech` and `equipment` never enter any average.**
4. `priceUsdCents !== null` and `quantityG !== null && quantityG > 0`.
5. `excludeFromCatalogAverage === false`.
6. `stockUnits !== 0` — a sold-out price is a historical price, not an offer.

### 4.3 The statistics law, restated for this surface

The cell key is `(element, form)` and **nothing is ever pooled across it**:

- Never pool forms. Dy metal and Dy₂O₃ differ by roughly an order of magnitude on a per-gram basis; an "average Dy price" is a number that describes nothing.
- Never pool elements.
- Never pool `shape`. `shape` is display metadata; a per-shape average would shred sample sizes for no analytic gain. Powder and dendrite of the same metal are the same market.
- Never pool categories, because rule 29 already makes `form` and category co-determined for eligible listings.
- Never compare a marketplace cell to `_data/elements/*.yml`'s `retail_reference` or `bulk_benchmark`. Those are industrial quotes in USD/kg from a sourced ledger; these are retail specimen prices in cents/g from one seller's catalog. The unit conversion is trivial and the comparison is meaningless. **This is a UI prohibition, not a preference** — no marketplace surface may render both figures adjacent.

### 4.4 The computation

```ts
interface CatalogAverageCell {
  elementSymbol: string;          // e.g. 'Dy'
  form: MaterialForm;             // e.g. 'metal'
  avgPerGramCents: number;        // arithmetic mean, 2dp at serialise
  medianPerGramCents: number;     // headline figure — robust to one showpiece specimen
  minPerGramCents: number;
  maxPerGramCents: number;
  sampleSize: number;             // number of eligible listings in the cell
  updatedAt: string;              // max(updatedAt) across contributing listings
  sufficient: boolean;            // sampleSize >= catalog_average_min_sample
}
```

Both mean and median are computed. The **median is the headline** the UI shows; the mean is exposed in the API for anyone who wants it. With sample sizes in the 5–20 range and a long right tail (one museum-grade specimen at 4× the others), a mean is the wrong summary and a median is not.

### 4.5 Leave-one-out — the detail that makes the hint honest

A listing must never be compared to an average it is a member of. With `n = 5`, a listing contributes 20% of its own benchmark, and a listing that is 50% above the others will appear only ~40% above "the average" — the statistic apologises for the outlier it contains.

So the detail-page hint calls `getCatalogAverageFor(element, form, excludeSlug: thisSlug)`, which recomputes the cell **without** the listing being viewed. The hint therefore requires **`catalog_average_min_sample` (5) other listings**, i.e. 6 in the cell total.

### 4.6 Thresholds — recommendation

| Leave-one-out n | Behaviour |
| --- | --- |
| `n >= 5` | Show the comparison hint: `$5.60/g — seller catalog median for Dy metal is $5.10/g (n=5 other listings)` |
| `3 <= n <= 4` | Show the listing's own per-gram figure only. **No comparison, no "vs.", no arrow, no colour.** Optionally the bare cell median with a literal `n=4` and no comparative phrasing |
| `n <= 2` | Nothing. No figure, no cell, no hint |

**Recommended threshold: 5.** Below 5, a single listing moves the median by more than 20% and the hint would be a rhetorical device rather than information. 5 also keeps most seed cells live: the catalog is deep in a handful of elements and thin everywhere else, and a threshold of 10 would silence the hint almost everywhere — an invisible feature is worse than a gated one, but a misleading one is worse than both.

### 4.7 Naming and labelling — hard rules

**Permitted UI strings:** "Seller catalog median", "Seller catalog average", "Kazakh Elements catalog median (n=7)", "Across this seller's Dy metal listings".

**Forbidden UI strings:** "reference price", "market price", "benchmark", "fair price", "below market", "market value", "appraised", any percentage framed as a discount.

**Required adjacent disclosure** wherever the hint appears (a `<Tooltip>` on the card grid, an explicit line on the detail page):

> Averaged across this seller's own listings for this element and form. It is a catalog statistic, not a market price, and not the site's sourced reference prices — those are industrial quotes in USD/kg and are not comparable.

The API mirrors this: the `/api/marketplace/price-reference` payload leads with `basis: "seller_catalog"` and carries a `disclaimer` string, so a consumer who reads only the JSON cannot mistake it for the export dataset.

---

## 5. API surface — four read-only GET endpoints

**Conventions inherited verbatim:** response JSON is **snake_case** (the export route emits `PriceRecord` verbatim, and those fields are `element_symbol`, `normalized_usd_per_kg`, `quote_date` — so snake_case is the house API dialect). Bodies are `JSON.stringify(body, null, 2)` like `/api/price-gauge`. CORS `Access-Control-Allow-Origin: *` and `X-License` / `Link: rel="license"` headers like the export. Error bodies are `{ error, ...hints }` like `/api/price-gauge` — never `{ ok: false }`, which is the contributions *write* path's shape and shouldn't be borrowed for reads.

Query parameters are lowercase snake_case (`per_page`, `min_price`). `/api/price-gauge` uses `quantityKg`, but it also accepts a `quantity` alias — the lesson is that its camelCase was a slip, not a contract. New read endpoints match their own payload dialect.

**Licence note.** These endpoints ship `X-License: CC-BY-4.0` only for the *structural* fields. Photos are the seller's and are **not** CC-BY. The `images[].path` values are links, not licensed content, and the payload carries `"image_license": "All rights reserved by the seller"`.

### 5.1 `GET /api/marketplace/listings`

**Rendering: `force-dynamic` + `runtime = 'nodejs'`.** It reads `searchParams`, so it cannot be statically optimised, and it transitively touches `fs` via `lib/marketplace`, so it cannot run on the edge. Identical reasoning and identical directives to `/api/price-gauge`. `Cache-Control: public, max-age=300` — the underlying files only change on a rebuild, so a 5-minute public cache is honest and cheap. `OPTIONS` returns 204 + CORS, matching price-gauge.

| Param | Type | Default | Rules |
| --- | --- | --- | --- |
| `element` | string | — | Catalog symbol. Case-insensitively resolved to the canonical case via the same `resolveSymbol` trick price-gauge uses; unknown → **404** |
| `category` | string | — | one of the five; unknown → 400 with `allowed` |
| `form` | string | — | `metal\|oxide\|alloy\|salt\|mineral`; unknown → 400 with `allowed` |
| `min_price` | number | — | USD decimal (e.g. `12.50`), converted `Math.round(v * 100)`; negative/NaN → 400 |
| `max_price` | number | — | as above; `max_price < min_price` → 400 |
| `q` | string | — | free text, case-insensitive substring over `title`, `body`, `tags`, `specs[].label`, `specs[].value`, `primary_element`. Trimmed; > 120 chars → 400. No fuzzy matching, no ranking — a deterministic substring filter is honest about what it does |
| `sort` | enum | `newest` | `newest \| price-asc \| price-desc`; unknown → 400 with `allowed` |
| `page` | integer | `1` | ≥ 1; non-integer or < 1 → 400 |
| `per_page` | integer | `24` | 1–100; out of range → 400 |
| `include` | enum | — | `placeholder` to include placeholder-status listings; anything else → 400 |

**Sorting semantics** (documented in the response, because "price" is ambiguous here): `price-asc`/`price-desc` sort on **`price_usd_cents`** — the actual amount a buyer pays — not on per-gram. Inquiry-only listings (`price_usd_cents: null`) always sort **last** in both directions. Ties break on `slug` ascending so output is deterministic across builds. `newest` sorts on `updated_at` desc, tie-broken by `listed_on` desc then `slug`.

**200:**

```json
{
  "query": {
    "element": "Dy", "category": "pure-metal", "form": "metal",
    "min_price_cents": 1000, "max_price_cents": 10000,
    "q": "dendritic", "sort": "price-asc", "page": 1, "per_page": 24,
    "include_placeholder": false
  },
  "pagination": { "page": 1, "per_page": 24, "total": 3, "total_pages": 1 },
  "results": [
    {
      "slug": "dy-metal-dendritic-5g",
      "url": "/marketplace/dy-metal-dendritic-5g/",
      "title": "Dysprosium Metal, Dendritic Pieces — 5 g, 99.9%",
      "status": "preliminary",
      "category": "pure-metal",
      "form": "metal",
      "shape": "piece",
      "primary_element": "Dy",
      "elements": ["Dy"],
      "purity_pct": 99.9,
      "quantity_g": 5.0,
      "price_usd_cents": 2800,
      "price_per_gram_cents": 560.0,
      "currency": "USD",
      "stock_units": 6,
      "seller_handle": "kazakhelements",
      "listed_on": "2026-07-14",
      "updated_at": "2026-07-22",
      "primary_image": {
        "path": "/assets/marketplace/listings/dy-metal-dendritic-5g/01.jpg",
        "alt": "Dendritic dysprosium metal pieces in an argon-flushed glass vial, metric scale alongside",
        "width": 1600, "height": 1200
      },
      "provenance_summary": {
        "source_type": "refinery",
        "country": "KZ",
        "verification_status": "document-on-file",
        "document_count": 2
      },
      "data_quality_flags": []
    }
  ]
}
```

Echoing `query` back mirrors `/api/price-gauge`'s `{ query, ...result }`. An empty result set is **200 with `results: []`**, never 404 — "no listings match this filter" is a valid answer to a valid question.

**Errors:**

```json
400 { "error": "Unknown category \"metals\".", "allowed": ["pure-metal","oxide","mineral-ore","high-tech","equipment"] }
400 { "error": "Invalid per_page \"500\". Expected an integer between 1 and 100." }
400 { "error": "max_price (10) is below min_price (50)." }
404 { "error": "Unknown element \"Xx\"." }
```

Plus, on a bare request with no params, nothing special — it returns page 1 of everything. A `usage`/`parameters` self-documenting block is emitted **only** in 400 bodies, matching price-gauge's behaviour on a missing required param.

### 5.2 `GET /api/marketplace/listings/[slug]`

**Rendering: `force-static` + `generateStaticParams()` over `getListingSlugs()` + `dynamicParams = false`.** Exactly the export route's pattern. Every listing's JSON is a file on the CDN; no runtime `fs`, no cold start, no way for the API to disagree with the page. `Cache-Control: public, max-age=3600` matching the export.

Consequence to accept knowingly: with `dynamicParams = false`, an unknown slug returns Next's **HTML 404**, not a JSON error body. The handler still contains an explicit JSON 404 return for the unreachable case, exactly as the export route keeps its unreachable "Unsupported export format" branch. See §7 Q10 for the alternative.

**200** — the summary shape above, plus:

```json
{
  "body_md": "Dendritic dysprosium metal, distillation-refined, …",
  "purity_basis": "Seller-declared, 3N (99.9%) metals basis. No third-party assay on file.",
  "quantity_note": "Nominal 5 g; individual pieces vary ±0.15 g.",
  "price_note": null,
  "moq_units": 1,
  "condition": null,
  "tags": ["collector-grade","sealed","heavy-rare-earth"],
  "specs": [{ "label": "Element", "value": "Dysprosium (Dy), Z=66", "unit": null }],
  "images": [
    { "path": "…/01.jpg", "alt": "…", "width": 1600, "height": 1200, "is_primary": true, "sort_order": 0, "caption": "As shipped: sealed vial, 5 g net." }
  ],
  "image_license": "All rights reserved by the seller",
  "provenance": {
    "source_type": "refinery",
    "source_name": "Undisclosed CIS distributor (name withheld at supplier's request)",
    "country": "KZ", "region": "Almaty region",
    "acquired_on": "2024-08-19",
    "verification_status": "document-on-file",
    "declared_by": "kazakhelements",
    "chain": [{ "step": 1, "actor": "Refinery lot 24-DY-113", "date": "2024-06", "note": "…" }],
    "documents": [{ "kind": "invoice", "label": "…", "path": "…/docs/invoice-2024-08.jpg", "url": null, "issued_on": "2024-08-19" }],
    "notes": "…"
  },
  "seller": { "handle": "kazakhelements", "display_name": "Kazakh Elements", "country": "KZ", "verified": true, "member_since": "2020-03", "url": "/marketplace/sellers/kazakhelements/" },
  "catalog_average": {
    "basis": "seller_catalog",
    "element_symbol": "Dy", "form": "metal",
    "median_per_gram_cents": 510.0, "avg_per_gram_cents": 528.4,
    "sample_size": 7, "leave_one_out": true, "sufficient": true,
    "disclaimer": "Averaged across this seller's own listings for Dy metal. Not a market price and not the site's sourced reference prices."
  }
}
```

`catalog_average` is `null` when the listing is ineligible (§4.2) and carries `"sufficient": false` with no figures when the leave-one-out sample is below threshold.

### 5.3 `GET /api/marketplace/sellers/[handle]`

**Rendering: `force-static` + `generateStaticParams()` over seller handles + `dynamicParams = false`.** One handle today; the set only changes on a rebuild. `Cache-Control: public, max-age=3600`.

**200:**

```json
{
  "handle": "kazakhelements",
  "url": "/marketplace/sellers/kazakhelements/",
  "display_name": "Kazakh Elements",
  "country": "KZ",
  "member_since": "2020-03",
  "verified": true,
  "verification_basis": "Identity and business registration confirmed by the site operator; trading history reviewed.",
  "verified_on": "2026-07-10",
  "tagline": "Rare-earth and strategic-metal specimens from Kazakhstan since 2020.",
  "bio_md": "…",
  "avatar": { "path": "/assets/marketplace/sellers/kazakhelements/avatar.jpg", "alt": "Kazakh Elements shop mark", "width": 512, "height": 512 },
  "declared_claims": [
    { "label": "Years trading", "value": "~6", "basis": "seller-declared" },
    { "label": "Transactions to date", "value": "~10,000", "basis": "seller-declared" }
  ],
  "stats": {
    "listing_count": 42,
    "element_count": 17,
    "categories": { "pure-metal": 28, "oxide": 9, "mineral-ore": 3, "high-tech": 2, "equipment": 0 },
    "documented_provenance_count": 31,
    "documented_provenance_share": 0.738,
    "earliest_listed_on": "2026-07-02",
    "latest_updated_at": "2026-07-22"
  },
  "listings": [ /* listing summaries, newest first */ ]
}
```

`stats` are **derived and true by construction** — counts over files in the repo. `declared_claims` are **not** stats and are structurally separated so no consumer can accidentally render "10,000" next to a computed figure with the same visual weight.

### 5.4 `GET /api/marketplace/price-reference`

**Rendering: `force-static`.** No parameters, no request input; it is a single derived document. Same headers as the export (`X-License: CC-BY-4.0`, `Link: rel="license"`, `Cache-Control: public, max-age=3600`, CORS `*`). This one *is* CC-BY in full — it contains no seller photographs.

Optional `?element=Dy` was considered and **rejected**: adding one param would force `force-dynamic` and lose the static guarantee for a payload of a few dozen rows that a consumer can filter client-side.

**200:**

```json
{
  "basis": "seller_catalog",
  "scope": "Averages computed from listings published on the lanthanides.io marketplace. Currently one seller: kazakhelements.",
  "disclaimer": "These are averages of this marketplace's own listing prices — the seller's catalog, not a market survey. They are NOT the site's sourced reference prices (see /api/export/json/ and /methodology/). Retail specimen prices and industrial ledger quotes are different populations and must not be compared or converted into one another.",
  "unit": "usd_cents_per_gram",
  "statistic": "median (headline) and arithmetic mean, per element × form",
  "min_sample_size": 5,
  "generated_at": "2026-07-28",
  "cells": [
    {
      "element_symbol": "Dy",
      "form": "metal",
      "median_per_gram_cents": 510.0,
      "avg_per_gram_cents": 528.4,
      "min_per_gram_cents": 402.0,
      "max_per_gram_cents": 890.0,
      "sample_size": 8,
      "sufficient": true,
      "updated_at": "2026-07-22"
    }
  ]
}
```

Cells with `sample_size < 3` are **omitted entirely** rather than shipped with `sufficient: false`, so a careless consumer cannot render a 2-sample "average" from our own API.

### 5.5 Route summary

| Route | Rendering | Cache-Control | Rationale |
| --- | --- | --- | --- |
| `/api/marketplace/listings` | `force-dynamic`, `runtime: 'nodejs'` | `public, max-age=300` | reads `searchParams`; touches `fs` |
| `/api/marketplace/listings/[slug]` | `force-static`, `dynamicParams=false` | `public, max-age=3600` | finite known set; mirrors the export route |
| `/api/marketplace/sellers/[handle]` | `force-static`, `dynamicParams=false` | `public, max-age=3600` | finite known set |
| `/api/marketplace/price-reference` | `force-static` | `public, max-age=3600` | no input; one derived document |

Three of four are fully static files on the CDN. The `trailingSlash: true` config means all four also resolve with a trailing slash; document the canonical form **with** the slash (`/api/marketplace/price-reference/`), matching how `nav.ts` already links `/api/export/json/`.

---

## 6. Page IA

New routes: `/marketplace/`, `/marketplace/[slug]/`, `/marketplace/sellers/[handle]/`. All SSG, `dynamicParams = false` on both detail routes.

**Colour discipline.** `Badge` variants are the site's meaning vocabulary and nothing else. The marketplace adds **no new colour axis**:

- The five listing categories render as neutral `<Chip>` — they are taxonomy, not risk.
- The **element** category (`rare_earth_heavy` etc.) reuses the existing `Badge` variant and `CATEGORY_STYLE` from `components/elements/categories.ts`, unchanged.
- Export-control state reuses `REGULATORY_BADGE` and links to `/regulatory/`. This is the single most valuable colour on the page — a buyer looking at Dy should see that it is under MOFCOM No. 18/2025 — and it costs nothing new.
- Verification: `seller-declared` → neutral `<Chip>` reading **"Verification pending"**; `document-on-file` / `site-verified` → `<Badge variant="accent">`. Accent is the existing "confirmed / emphasised" colour; reusing it for "a document exists" keeps colour meaning-bearing. A missing document is the absence of colour, which is precisely the right signal.

All figures use `.numeric` / `font-mono` + `tabular-nums`. Sharp corners come from the existing `Card`/`Panel` primitives; nothing bespoke.

Also required, in the same PR: add `{ href: '/marketplace/', label: 'Marketplace' }` to `NAV_LINKS` and `FOOTER_LINKS` in `components/layout/nav.ts`, and add the index + per-listing + per-seller URLs to `app/sitemap.ts` (`lastModified` = the listing's `updated_at`, which is a real value — no fabrication, matching the sitemap's stated rule).

### 6.1 `/marketplace/` — index

Sections, in order:

1. **`<Breadcrumbs>`** — `[{ label: 'Marketplace' }]`.
2. **`<PageHeader>`** (`components/layout`) — title "Marketplace", eyebrow "PRELIMINARY", one-line subtitle: *"Rare-earth metals, specialised materials, and high-tech equipment — every listing with visible provenance."*
3. **Trust strip** — `<StatGrid>` of four `<Stat>`s, all derived and true: `Listings`, `Elements represented`, `Listings with documents on file` (as `31 / 42`), `Verified sellers`. Nothing here is seller-declared. `<Stat hint>` carries the qualifier.
4. **Preliminary notice** — `<Callout tone="info">`: *"This marketplace is preliminary. There is no checkout: every listing links to a direct inquiry with the seller. Specifications and provenance are published as the seller declared them; items marked 'Verification pending' have no supporting document on file yet."*
5. **`<MarketplaceView>`** — the client island (`'use client'`), which owns:
   - `<FilterChips label="Element">` — symbols present in the catalog, from `getMarketplaceFacets()`.
   - `<FilterChips label="Category">` — the five labels from `settings.yml`.
   - `<FilterChips label="Form">` — the material forms actually present.
   - **Price range** — two number inputs (min/max USD) rather than a slider: a slider on a range spanning $3 to $4,000 is unusable, and typed bounds are keyboard- and screen-reader-native.
   - **Free text** `q` — a plain `<input type="search">`, debounced, substring match over the same fields the API searches so the island and the endpoint never disagree.
   - **Sort** — a native `<select>` (`Newest`, `Price: low to high`, `Price: high to low`).
   - `<SectionHeading title="Listings" count={visible.length} />`.
   - The card grid: `[grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]`, matching the RegulatoryView grid idiom.
   - Empty state: the dashed-border `EmptyHint` pattern lifted from `RegulatoryView` — *"No listings match these filters."* plus a "Clear filters" button.

   **The RegulatoryView contract, preserved exactly:** `MarketplaceView` is SSR'd with all filters cleared, so the complete grid ships in the initial HTML and the page reads, crawls, and works with JavaScript disabled. Filtering is pure progressive enhancement. It receives plain serialised listing summaries as props — no `fs`, no `lib/marketplace` import from the client boundary.

6. **`<ListingCard>`** (presentational, no server imports so it can live under the client island): primary photo via `next/image` with intrinsic `width`/`height` and `sizes`; title (2-line clamp); element `<Badge>` + regulatory `<Badge>` if controlled; neutral category `<Chip>`; price in `.numeric` with the per-gram figure beneath in `text-fg-dim`; provenance one-liner (`Refinery · KZ`); verification chip when `verification_pending`; `<Card interactive>` wrapping a `next/link` to the detail page.
7. **Methodology footer** — one paragraph linking `/methodology/` and `/about/`, plus the explicit sentence that marketplace prices are not ledger data and do not feed the price records.

**Metadata:** `buildMetadata({ title: 'Marketplace', description: …, path: '/marketplace/' })`. **JSON-LD:** `CollectionPage` + `ItemList` whose `itemListElement` entries are `{ '@type': 'ListItem', position, url }` — honest, because it is literally a list of pages. `BreadcrumbJsonLd` alongside it.

### 6.2 `/marketplace/[slug]/` — listing detail

`generateStaticParams()` over `getListingSlugs()`, `dynamicParams = false`, `notFound()` retained for the unreachable branch (mirroring `app/elements/[symbol]/page.tsx`).

Sections, in order:

1. **`<Breadcrumbs>`** — `Marketplace → <title>`.
2. **Header** — `<h1>` title; badge row: element `<Badge>` (linked to `/elements/<Sym>/`), regulatory `<Badge>` (linked to `/regulatory/`) when controlled, category `<Chip>`, condition `<Chip>` for equipment, `Sold` `<Chip>` when `stock_units === 0`.
3. **Gallery** — **all** photos, primary first then `sort_order`. `next/image` with intrinsic dimensions; captions beneath in `text-xs text-fg-dim`. No lightbox in preliminary (a modal is a JS dependency for a page whose job is to be readable); thumbnails link to the full-size file so a buyer can open any photo directly. Photo count stated: "6 photos".
4. **Price block** — `<Panel title="Price">`: `<Stat size="lg" label="Price" value="$28.00" hint="5 g · 1 unit minimum">`; per-gram `<Stat label="Per gram" value="$5.60" unit="/g">`; the catalog-average hint **only** when §4.6 permits, as a `hint` line with a `<Tooltip>` carrying the §4.7 disclosure. When `price_usd_cents` is null: "Price on inquiry", no per-gram, no hint.
5. **Provenance — PROMINENT, immediately after price and before the description.** `<Panel title="Provenance" eyebrow="WHERE THIS CAME FROM">`. This is the product; it does not go below the fold and it does not go last.
   - Verification line first: `<Badge variant="accent">Documents on file</Badge>` or `<Chip>Verification pending</Chip>` with the literal sentence *"The seller declared this provenance. No supporting document is on file."*
   - `<Table>`: Source type · Source name · Country / region · Acquired · Declared by. Null values render "Not stated" / "Not disclosed by seller" — never blank, never omitted.
   - Chain of custody as an ordered list when present.
   - Documents grid: each `<a>` to `path`/`url` with kind label and issue date; image documents get a thumbnail.
   - `notes` as body text.
6. **Specifications** — `<Table>` from `specs[]`, values in `<TD numeric>` where numeric, unit in a trailing muted span. Purity row footnoted with `purity_basis` (or "Basis not stated").
7. **Description** — the markdown body via `react-markdown` + `remark-gfm`, in the article prose container. No `rehype-raw`.
8. **Seller card** — `<Card>`: avatar, display name linked to the seller page, verified `<Badge variant="accent">` with a `<Tooltip>` carrying `verification_basis`, country, member-since, listing count.
9. **Buyer protection — copy only.** `<Callout tone="note" title="How buyer protection works">`, stating plainly what is and isn't in place today:
   > Every item is photographed before dispatch and again as packed. On arrival, document the parcel: photograph the sealed package before opening and take a short video of the unboxing. If what arrives does not match the listed specification, weight, or condition, that documentation is what resolves it — send it to the seller and copy us.
   >
   > This marketplace is preliminary: payment, escrow, and dispute resolution are handled directly between you and the seller. The site publishes the specification and provenance and holds the seller to them; it does not currently process payments or hold funds. We will not describe protection we do not operate.
10. **Request purchase (stubbed CTA)** — `<LinkButton>` to a **`mailto:`**:

    `mailto:marketplace@lanthanides.io?subject=Inquiry:%20<title>%20(<slug>)&body=<prefilled: listing URL, title, quantity, asking price, blank lines for quantity wanted and destination country>`

    **Recommendation: mailto over a form.** A form needs a POST endpoint; the only write path in this repo is the contributions inbox, which is off-limits, and the constraint is no new DB tables. A mailto is honest about what happens next (a human replies), requires no infrastructure, works without JS, and cannot silently drop a message. Mitigations: use a role address, not a personal one; render it as a link, not as plain text, so trivial scrapers get less; add a secondary `<a>` with the seller's own contact channel. Downsides to accept: no inquiry analytics, and mobile webmail handling varies. Alternative if analytics become necessary: a hosted form provider (Formspark/Basin) behind an env var — an external service, not a repo table. Do **not** reach for the contributions inbox.
11. **More from this seller** / **More <Element>** — up to 6 cards each.

**404 behaviour:** unknown slugs never render — `dynamicParams = false` makes them the framework 404 at the routing layer.

**Metadata:** `buildMetadata({ title, description: first ~155 chars of the body, path: '/marketplace/<slug>/', image: primaryImage.path, imageAlt: primaryImage.alt })`. The OG image is the primary photo. `buildMetadata` hardcodes `images: [{ width: 1200, height: 630 }]`, which will be wrong for a 4:3 product photo — either extend `PageMetadataInput` with optional `imageWidth`/`imageHeight` (preferred, one small change to `lib/seo.ts`) or crop a 1200×630 OG variant at import time. Listings with `status: 'placeholder'` pass `noindex: true`.

**JSON-LD — what honestly fits a preliminary listing:**

- **`Product`** — yes. `name`, `description`, `image` (all photo URLs, absolutised via `abs()`), `sku` = slug, `material`, `brand`/`manufacturer` = the seller `Organization`, `weight` as `QuantitativeValue` in grams, `additionalProperty` as `PropertyValue[]` from `specs`. All of it true.
- **`Offer`** — **no, not while checkout is stubbed.** `schema.org/Offer` asserts a transactable offer, and `availability` has no value meaning "inquiry only": `InStock` implies you can buy it here, `PreOrder` and `LimitedAvailability` are equally false. Emitting an `Offer` invites merchant-style rich results for a purchase flow that does not exist — precisely the kind of small dishonesty this site is built to avoid. Ship `Product` without `offers` now; add `Offer` the day checkout exists, in the same PR.
- **`BreadcrumbList`** — yes, via the existing `BreadcrumbJsonLd`.
- **`ItemPage`** — optional, harmless, low value. Skip.
- **`Review` / `AggregateRating`** — absolutely not. There are no reviews.

### 6.3 `/marketplace/sellers/[handle]/`

`generateStaticParams()` over handles, `dynamicParams = false`.

Sections, in order:

1. `<Breadcrumbs>` — `Marketplace → Kazakh Elements`.
2. **Identity header** — avatar (`next/image`, intrinsic dims), display name as `<h1>`, `<Badge variant="accent">Verified</Badge>` with a `<Tooltip>` carrying `verification_basis` and `verified_on`, country, `Member since March 2020`, tagline.
3. **Bio** — markdown body of `_marketplace/sellers/<handle>.md` via `react-markdown`. Omitted cleanly when the file is absent.
4. **Catalog stats** — `<StatGrid>` of derived, provable figures only: `Listings`, `Elements`, `With documents on file` (`31 / 42`), `Most recent update`.
5. **Seller-declared** — a separate, visually quieter `<Card>` under a literal heading "Seller-declared", listing `declared_claims` as label/value rows in `text-fg-dim`, with a footnote: *"Stated by the seller and not independently verified by this site."* The ~10,000-transactions figure lives **here**, never in the `<StatGrid>` above. If the founder can document it (platform export, invoice count), it can be promoted with a `basis: documented` value and a link to the document — until then it stays declared.
6. **Verification detail** — `<Callout tone="note">` explaining exactly what "verified" covers: identity and business registration confirmed, trading history reviewed. It does **not** mean the site has assayed any material or audited any transaction. Say that.
7. **Listings** — `<SectionHeading title="Listings" count={n} />` + the same card grid. Reuses `<MarketplaceView>` with the element/category/form filters but no seller filter, when the count exceeds ~12; below that, a plain server-rendered grid with no island.
8. **Empty state** — a seller with zero listings renders a dashed-border panel: *"No listings published yet."* Not a 404 — the seller exists.

**404:** unknown handle → framework 404 via `dynamicParams = false`.

**Metadata:** `buildMetadata({ title: 'Kazakh Elements', description: tagline, path: '/marketplace/sellers/kazakhelements/', image: avatar.path })`.

**JSON-LD:** `Organization` (`name`, `url`, `logo` = avatar, `address: { '@type': 'PostalAddress', addressCountry: 'KZ' }`, `description` = tagline) + `BreadcrumbList`. Deliberately **not** mapped: `foundingDate` (we know a *site* member-since, not a founding date — different fact), `aggregateRating`, `numberOfEmployees`. `sameAs` only if a real external profile URL exists in `sellers.yml`.

---

## 7. Open questions, ranked by risk

**Q1 — Is a single-seller "catalog average" publishable at all? (Highest risk: it is the feature most likely to mislead.)**
Every cell is computed from one seller's own prices, so "this listing vs. the average" is close to "this price vs. this seller's other prices." A buyer may read it as market validation.
**Recommended default:** ship it, gated hard — leave-one-out, `n ≥ 5`, median headline, the §4.7 label and disclosure verbatim, and the word "market" banned from the surface. If review can't get comfortable with the phrasing, cut the *comparison* and keep the bare per-gram figure, which is a pure unit conversion and cannot mislead. Revisit the moment a second seller exists.

**Q2 — Does anything in `_marketplace/` ever flow into the price ledger?**
Marketplace prices are the site operator's own retail catalog. If they entered `_data/price_records.json`, the site would be citing itself as a source.
**Recommended default: never, in either direction.** Hard separation, stated in `docs/marketplace/DESIGN.md`, in `/methodology/`, and enforced by the fact that `lib/data` and `lib/marketplace` share no code. If catalog prices are ever ingested as observations, they must go through `/contribute/` like any third party's, be sourced to `kazakhelements`, and be visibly self-reported.

**Q3 — Conflict of interest: the site operator is also the seller.**
The site publishes reference prices and also sells materials. That is a real conflict, and burying it costs more than disclosing it.
**Recommended default:** a permanent disclosure line in the marketplace footer and on `/about/`: *"The seed catalog is operated by the site's founder. Marketplace prices are not used to compute any published reference price, and no marketplace listing affects an element's ledger entry."* Plus Q2's enforced separation.

**Q4 — Repo weight from photographs.**
~10,000 transactions of history; even 500 listings × 5 photos × 250 KB ≈ 600 MB in git, which is a slow clone and a bloated Vercel build context forever, because git history is immutable.
**Recommended default:** commit images under `public/assets/marketplace/`, with a hard budget enforced in `verify.ts` — longest edge ≤ 1600 px, ≤ 300 KB per file, ≤ 8 images per listing — and a total-bytes ceiling that fails the build. Sizes are checked at build via `statSync`, so no one can merge a 4 MB phone photo. If the catalog passes ~300 listings, move to a `MARKETPLACE_IMAGE_BASE` env prefix over Vercel Blob or an S3-compatible bucket, keeping `path` values relative and unchanged so the migration is one env var, not a data change. Decide the ceiling *before* the first bulk import — after is too late.

**Q5 — Exact `EXPECTED_LISTINGS` count vs. a floor.**
`lib/data/verify.ts` asserts exact counts. Exact catches dropped files; it also means every import PR touches a constant, and merge conflicts on that line are guaranteed with parallel imports.
**Recommended default:** exact, to match the house convention, with the constant on its own line and a comment saying to bump it. If parallel import PRs become routine, switch to `MIN_LISTINGS` (a floor that only ever ratchets up) — it catches the disaster case (files disappearing) without the churn.

**Q6 — `mailto:` vs. a hosted inquiry form.**
`mailto:` is honest and infrastructure-free but yields no analytics, exposes an address, and behaves inconsistently on mobile.
**Recommended default:** `mailto:` to a role address with a prefilled subject and body, plus the seller's own contact channel as a secondary link. If inquiry volume ever needs measuring, add a third-party hosted form behind an env var — never a new table, never the contributions inbox.

**Q7 — `Product` JSON-LD without `offers`.**
Omitting `offers` forfeits merchant rich results and some marketplace SEO.
**Recommended default:** omit it. There is no checkout; an `Offer` node would be a claim the site cannot honour, and `availability` has no honest value for "inquiry only". Add it in the PR that adds checkout.

**Q8 — Currency.**
The seller is in Kazakhstan; listings may eventually be priced in KZT or EUR. Mixed currencies would silently corrupt every per-gram average.
**Recommended default:** pin `currency: USD` and fail the build on anything else. When a second currency is genuinely needed, add `price_original_amount` + `price_original_currency` + `fx_rate` + `fx_date` as *authored* fields (mirroring `PriceRecord`'s `original_price_per_unit` / `exchange_rate_used` / `exchange_rate_date`), and keep `price_usd_cents` as the derived, averaged field. Never convert at request time.

**Q9 — Filter state in the URL.**
`RegulatoryView` uses local state only, so filtered views aren't shareable or linkable — which hurts a commercial surface more than it hurts a regulatory tracker (no "here's the Dy metal I mentioned" link, no per-filter landing pages).
**Recommended default:** ship local state for parity and simplicity, but read initial filters from `searchParams` on the server (`/marketplace/?element=Dy` renders pre-filtered, statically, with `element` in the static shell's props). Skip pushing state back to the URL on every keystroke — that's a `useSearchParams` + `router.replace` treadmill for marginal gain in preliminary.

**Q10 — `dynamicParams = false` on the detail API route means unknown slugs get an HTML 404.**
An API consumer hitting a typo gets an HTML page, which is a poor developer experience.
**Recommended default:** keep `dynamicParams = false`, matching the export route, and document the behaviour. The static guarantee (no runtime `fs`, no cold start, no page/API divergence) is worth more than a JSON 404 body on a wrong URL. If it becomes a real complaint, set `dynamicParams = true` while keeping `generateStaticParams` — known slugs stay pre-rendered, unknown ones render on demand and return `{ "error": "Unknown listing \"…\"." }` with `Cache-Control: public, max-age=60`.

**Q11 — Where do sputtering targets, magnets, and alloy assemblies belong?**
A Dy-containing sputtering target is arguably `pure-metal`, `high-tech`, or `equipment`, and the choice determines whether it pollutes the per-gram metal average.
**Recommended default:** categorise by what the buyer is shopping for, not by chemistry. Targets, magnets, and wafers are `high-tech`; instruments are `equipment`. Both keep `elements` populated (so element filtering and the `/elements/<Sym>/` cross-link still work) but carry `form: null`, which rule 29 turns into a hard build guarantee that they never enter any average.

**Q12 — Does `/marketplace/` belong in the header nav?**
Adding a sixth header link to a site whose 2026-07 simplification deliberately cut the header to five plus About.
**Recommended default:** yes, in the header — the marketplace is a primary surface, not a footnote, and hiding a commercial surface in the footer signals ambivalence about it. Place it after `Open Data`, before `About`. Keep the "Add a price" CTA exactly where it is; it is a different action and must not be crowded out.

**Q13 — Photo provenance for the imported catalog.**
Imported listings may carry photos taken by a supplier rather than the seller, which is a rights problem and, worse for this site, a *trust* problem: a stock photo is not a photo of the item you will receive.
**Recommended default:** every `image` requires that the photo be of the actual item. Add `images[].is_of_actual_item: boolean` (required, default absent → build fail) and render a visible "Stock photo — not the actual item" label wherever it is `false`. If the seller cannot confirm for a batch, those listings ship as `status: placeholder` with `noindex` until re-photographed. A marketplace whose thesis is verified specifications cannot ship a stock photo without saying so.