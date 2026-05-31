# OFFER-SCREENING.md — the demand-side screening backend

How the screened-offer feed at **`/offers`** works today, and the architecture
for the live internet-screening backend that will populate it. Companion to
`ARCHITECTURE.md` §4.1 (the demand-side contract) and the code in
`lib/screening/`, `components/offers/`, and `app/offers/page.tsx`.

---

## 0. Status — what is real vs. STUB

> **The live screening backend is a STUB.** Nothing in this project fetches the
> open internet for offers. The `/offers` feed is **real but seeded**: it renders
> the 220 `ScreenedOffer` rows that `prisma/seed.ts` builds from the public price
> dataset (`origin:'seed'`). The pipeline below is the design for making it live;
> each stage is marked **REAL** or **STUB**.

| Stage | Module | Status |
|:--|:--|:--|
| Feed render (filter, sort, value-rank, annotate) | `app/offers/page.tsx`, `components/offers/*` | **REAL** |
| Read feed rows | `lib/screening` → `screen()` | **REAL** (returns seeded rows) |
| Rank by value | `lib/screening` → `rank()` / `valueScore()` | **REAL** (pure; identical formula to the seed) |
| Normalize raw → USD/kg | `lib/screening` → `normalize()` | **REAL** (pure; FX only from a supplied rate table) |
| Ingest live offers | `lib/screening` → `ingest()` | **STUB** — returns nothing; the only true gap |
| Dedup + verify + persist | — | **STUB** — not built |
| Human-review checkpoint | — | **STUB** — designed below, not built |

The hard line (`ARCHITECTURE.md` §4.1): the feed renders; the **intake pipeline
behind it is a later prompt**. The honesty banner on `/offers` reads its status
from `SCREENING_BACKEND` in `lib/screening`, so the page can never claim more
than the code does.

---

## 1. Today — the seeded feed

`prisma/seed.ts` reads the public price dataset through `lib/data` and writes one
`ScreenedOffer` row per qualifying record (`origin:'seed'`), excluding pure
benchmark/index records (those are price *signals*, not seller *offers*). For
each it computes a **`valueScore`** — how far below the element's same-form median
the price sits, scaled by the record's confidence (§5). `/offers` reads those
rows via `lib/screening.screen()`, joins element metadata (name, category,
export-control status) from `lib/data`, and renders the value-ranked, filterable
feed.

This is genuinely useful on day one — it surfaces the best-value sourced records
per element — and it is **honest**: every row is tagged `seed`, and the banner
states plainly that the open web has **not** been scanned.

---

## 2. Target sources (for live `ingest()`)

Rare-earth supply is scattered across fragmented venues with no standard pricing.
The ingester would poll three source kinds (`IngestSource.kind` in
`lib/screening`):

| Kind | Examples | Notes |
|:--|:--|:--|
| `b2b` | Made-in-China, Alibaba / 1688, ECVV, metal-exchange B2B boards | Highest volume, lowest structure; Chinese-language; MOQ-heavy. Translation + unit/purity parsing required. |
| `marketplace` | eBay, specialty auction listings | Small-quantity retail; good for the retail tier; noisy seller quality. |
| `supplier` | Stanford Advanced Materials, MSE Supplies, Metallos.de, ESPI, American Elements | Already partly in `_data/source_registry.yml` (trust-tiered); structured catalogues; the cleanest inputs. |

Each adapter **must** respect the target's `robots.txt` / Terms of Service and
rate limits, and must record a `sourceUrl` so every screened offer stays
auditable (the seeded rows have no URL; screened rows must). Start from the
trust-tiered sources already curated in `_data/source_registry.yml`.

---

## 3. Pipeline

```
            ┌─────────┐   ┌───────────┐   ┌──────────┐   ┌──────┐   ┌───────┐   ┌──────────────┐   ┌─────────┐
 sources ──►│ ingest  │──►│ normalize │──►│ verify / │──►│ rank │──►│ dedup │──►│ human review │──►│ publish │
            │ (STUB)  │   │  (REAL)   │   │  score   │   │(REAL)│   │       │   │ (checkpoint) │   │(origin= │
            └─────────┘   └───────────┘   └──────────┘   └──────┘   └───────┘   └──────────────┘   │ screened)│
                                                                                                    └─────────┘
```

### 3.1 `ingest()` — discover raw offers — **STUB**

Poll each configured source, extract candidate offers, cache responses, and emit
`RawOffer[]` (original currency/unit/text untouched). Returns `[]` today.

- **Reuse:** `scripts/scraper/monitor.py` is the existing 6-hourly poller
  (sources in `scripts/scraper/sources.yaml`; dedup-of-seen in
  `scripts/scraper/data/seen.sqlite`); `scripts/import_offers.py` already fetches
  the source registry, runs per-source price extraction, and caches to
  `scripts/.offer_cache/`. The offer adapters extend that, not a new stack.
- **TODO(screening):** per-source HTML/JSON adapters; ToS/robots compliance + rate
  limiting; Chinese→English translation (the monitor already wires DeepL);
  response caching with ETag/last-seen.

### 3.2 `normalize()` — to USD/kg on the canonical vocab — **REAL (pure)**

Resolve free-text element → catalog symbol; lowercase the form; trim purity;
convert price to **USD per kg**. Implemented in `lib/screening.normalize()`.

- **FX is honest (hard rules #1 & #3):** conversion uses a rate table passed in by
  the caller. With no rate for a currency, the price is left `null` and the row is
  **dropped downstream — never converted at a guessed rate.** No paid/live FX
  service is called.
- **Reuse:** `scripts/normalize_prices.py` already does exactly this for the
  dataset (`original_price_per_unit` + currency + unit → `normalized_usd_per_kg`,
  with `UNIT_TO_KG_FACTOR` and a rates file). The TS port mirrors its unit factors
  so seeded and screened rows normalize identically.

### 3.3 verify / score — assign confidence — **STUB (rules exist)**

Attach a `confidence` (0..1) and a `verification_status` to each normalized offer,
**reusing the existing provenance + confidence model** rather than inventing a new
one:

- Base confidence from the **source trust tier** (`_data/source_registry.yml`,
  tiers 1–5) and `source_type`.
- Uplift for **corroboration** — the same element/form/price seen across ≥2
  independent sources (the dataset's `verified` / `corroborated` statuses).
- Decay with **age** of the quote (recency), per the thresholds in
  `_data/site_settings.yml` (`high_confidence_minimum`, `medium_confidence_minimum`)
  — the same bands the site renders everywhere (`confidenceBand`: high ≥ 0.80,
  medium ≥ 0.50).
- **Significance gate:** `scripts/triage.py` is the existing rule-based,
  deliberately-conservative scorer (1–10, biased low when uncertain). The same
  pattern gates whether a borderline offer is even worth surfacing.
- **TODO(screening):** wire trust-tier + corroboration + recency into one
  `confidence`; reuse `scripts/validate_data.py` for schema/sanity checks.

### 3.4 `rank()` — favourability — **REAL (pure)**

Compute `valueScore` against the same-form median and sort best-value first.
Implemented in `lib/screening.rank()` / `valueScore()` / `sameFormMedians()` —
the **identical formula** `prisma/seed.ts` uses (§5), so seeded and screened rows
rank on one scale. Rows with no normalized price are dropped here (never invented).

### 3.5 dedup — **STUB**

Collapse the same offer seen on multiple platforms / multiple polls.

- **TODO(screening):** key on `(elementSymbol, form, normalized purity, seller,
  round(pricePerKg), observedDate)`; fuzzy-match seller names and near-equal
  prices; prefer the higher-trust / more-recent source; the monitor's
  `seen.sqlite` already models seen-state to build on.

### 3.6 human-review checkpoint — **STUB (designed)**

No screened offer publishes unreviewed. This mirrors the **double-human-review**
that governs the open dataset (see `/contribute` and `CONTRIBUTING.md`):

1. Live screening writes rows as `ScreenedOffer(origin:'screened')` in a
   **pending** state (a `reviewStatus` field — TODO — defaulting to `pending`).
2. A maintainer reviews source authenticity, normalization, and the assigned
   confidence — the same scrutiny a price-record PR gets.
3. Approved rows become visible in the feed; rejected rows are dropped with a
   reason.

> A screened offer is **never** auto-published into the open `_data/` dataset
> (that stays the reviewed git-PR flow), and the **private** side of any future
> seller contact is never exposed — exactly as `Listing` already guarantees on the
> supply side.

### 3.7 publish

Approved rows render in the feed alongside the seeds, tagged `screened` (the feed
already labels every row's `origin`, so the moment screened rows exist they are
visually distinguishable from seeds — no UI change needed).

---

## 4. The `lib/screening` interface

```ts
ingest(sources: IngestSource[]): Promise<RawOffer[]>            // STUB → []
normalize(raw: RawOffer, ctx): NormalizedOffer                  // REAL, pure
rank(offers: NormalizedOffer[], basisMedians): RankedOffer[]    // REAL, pure
screen(opts?): Promise<ScreeningRunResult>                      // REAL → seeded rows today
```

When live, `screen()` becomes roughly:

```ts
const raw        = await ingest(SOURCES);
const normalized = raw.map((r) => normalize(r, { catalog, fxToUsd }));
const basis      = sameFormMedians([...datasetRecords, ...normalized]);
const fresh      = rank(normalized, basis);          // origin: 'screened'
await persistWithDedupAndReview(fresh);              // §3.5–§3.6
// …then read seeded + screened rows back, merged on one valueScore scale.
```

Until `ingest()` is built, `screen()` returns the seeded rows and the rest of the
chain is dormant but fully typed — the wiring is legible from the code.

---

## 5. Ranking model — `valueScore`

For each element+form, `median` = the median `normalized_usd_per_kg` across all
of that element's records of that form (a like-for-like "going rate" that never
mixes oxide vs. metal levels):

```
discount   = clamp((median − pricePerKg) / median, −1, +1)
valueScore = round(discount × confidence, 4)
```

Higher = better value: a positive score means the offer sits **below** the
same-form median (a discount), scaled by the source's confidence. The positive
side is naturally bounded at +1 (price can't fall below 0); the negative side is
clamped at −1 so one over-priced outlier can't dominate. Range in the seeded data:
roughly **[−0.85, +0.69]**. The feed buckets this continuous score into a coarse
**Below / Near / Above median** label for scanability (`valueBand`,
`components/offers/offers.ts`), but the signed number stays visible and sortable —
nothing is hidden behind the bucket.

This is defined once and shared: `prisma/seed.ts` (seeds) and `lib/screening`
(live) compute it identically.

---

## 6. Reuse map — the Python pipeline is the foundation

The normalization/ingestion foundation already exists in `scripts/`; the live
backend extends it rather than starting over:

| Need | Existing script |
|:--|:--|
| Polling sources on a cadence, seen-state | `scripts/scraper/monitor.py`, `scripts/scraper/sources.yaml`, `scripts/scraper/data/seen.sqlite` |
| Per-source price extraction → record schema | `scripts/import_offers.py` |
| Currency/unit → `normalized_usd_per_kg` | `scripts/normalize_prices.py` |
| Significance scoring (conservative, rule-based) | `scripts/triage.py` |
| Schema / sanity validation | `scripts/validate_data.py` |
| Source-type backfill, source breakdown | `scripts/backfill_source_types.py`, `scripts/source_breakdown.py` |
| Notifications (Telegram live, email next) | `scripts/notify/telegram.py`, `scripts/notify/email.py` |

The Python pipeline owns `_data/`; the TS `lib/screening` layer owns the dynamic
`ScreenedOffer` store. They share the **same normalization rules and the same
value formula** so the two never disagree.

---

## 7. TODO checklist (to make it live)

- [ ] **`ingest()` adapters** — per-source HTML/JSON extractors (b2b / marketplace
      / supplier), built on `monitor.py` + `import_offers.py`; ToS/robots + rate
      limiting; translation; caching.
- [ ] **Confidence assignment** — trust-tier × corroboration × recency → one
      `confidence`; `triage.py`-style significance gate; `validate_data.py` checks.
- [ ] **Dedup** — signature + fuzzy match; prefer higher-trust/fresher source.
- [ ] **Persistence + review state** — add `reviewStatus` to `ScreenedOffer`;
      write screened rows `pending`; surface only approved.
- [ ] **Human-review tooling** — a maintainer queue mirroring the contributor flow.
- [ ] **Flip `SCREENING_BACKEND.status` → `'live'`** once the above ships; the
      `/offers` banner updates itself from that flag.

---

## 8. Hard-rule guarantees (CLAUDE.md)

- **#1 No fabricated data** — un-normalizable prices are dropped, never invented;
  missing fields (purity, country, quantity) carry through as `null`.
- **#1 No fabricated FX** & **#3 No paid services** — currency conversion only
  from a supplied rate table; no live FX call; non-convertible rows are dropped.
- **Reference data stays in `_data/`** — screened offers live only in the
  `ScreenedOffer` table and are **never** auto-published into the open dataset.
- **Privacy** — any future private contact is never exposed (as with `Listing`).
