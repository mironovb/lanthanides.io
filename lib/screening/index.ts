/**
 * lib/screening: the offer-screening pipeline (Prompt 21).
 *
 * This is the demand-side intake: the machinery that will one day discover real
 * buy/sell offers across the open internet (Chinese B2B platforms, eBay,
 * specialty suppliers), normalize them onto the project's price schema, score
 * them against the references, dedup, and surface the best value, feeding the
 * `ScreenedOffer` table that `/offers` renders.
 *
 * ┌─ STATUS ────────────────────────────────────────────────────────────────┐
 * │ The live screening BACKEND is a STUB. Nothing here fetches the internet.   │
 * │ `ingest()` returns nothing; `screen()` returns the SEEDED dataset rows     │
 * │ (the 220 `ScreenedOffer` rows with `origin:'seed'`, built from the public  │
 * │ price dataset in prisma/seed.ts). The feed is therefore real and honest    │
 * │ today, it is just sourced from our own verified dataset, not from live     │
 * │ screening. The full design (target sources, adapters, dedup, the human-    │
 * │ review checkpoint) is specified in docs/OFFER-SCREENING.md.                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * The three pipeline stages are typed and wired so the architecture is legible
 * from the code: `ingest()` → `normalize()` → `rank()`. Two of them (`normalize`,
 * `rank`) carry their REAL, pure implementations: `rank()` is the exact
 * same-form-median discount × confidence formula prisma/seed.ts uses, so when
 * live ingestion lands the seeded and screened rows rank on one identical scale.
 * `ingest()` is the only true stub: it is where live source adapters plug in.
 *
 * Server-only: `screen()` reads the dynamic store via `lib/db`. The honesty rule
 * (CLAUDE.md #1) is load-bearing here; a screened offer that cannot be
 * normalized to USD/kg without a fabricated FX rate is dropped, never invented
 * (#3); a missing field is carried through as null, never filled.
 */
import { prisma } from '@/lib/db';

// ── Pipeline status (single source of truth for the UI's honesty banner) ──────

export type ScreeningBackendStatus = 'stub' | 'live';

/**
 * What the screening backend is doing today. The `/offers` banner reads this so
 * the "screening in development" claim is sourced from the code, not a string
 * hand-typed into the page that could drift from reality.
 */
export const SCREENING_BACKEND = {
  status: 'stub' as ScreeningBackendStatus,
  /** Where the feed's rows actually come from right now. */
  feedSource: 'seeded' as 'seeded' | 'screened' | 'mixed',
  /** The seeded rows' origin tag in the `ScreenedOffer` table. */
  seedOrigin: 'seed',
  /** The tag live-screened rows will carry once `ingest()` is built. */
  liveOrigin: 'screened',
  /** Design + TODOs for making it live. */
  spec: 'docs/OFFER-SCREENING.md',
} as const;

// ── Stage data contracts ──────────────────────────────────────────────────────

/** A configured source the ingester would poll (see docs/OFFER-SCREENING.md §2). */
export interface IngestSource {
  id: string;
  /** 'b2b' (Made-in-China, Alibaba, 1688), 'marketplace' (eBay), 'supplier' (SAM, MSE…). */
  kind: 'b2b' | 'marketplace' | 'supplier';
  baseUrl: string;
  /** ISO-2 country the seller/platform is based in, when known. */
  country?: string;
}

/**
 * A raw offer as scraped, before normalization: strings as they appear on the
 * page, original currency/unit untouched. Mirrors what scripts/import_offers.py
 * extracts before scripts/normalize_prices.py runs.
 */
export interface RawOffer {
  sourceId: string;
  sourceType: string;
  sourceUrl?: string;
  sellerName: string;
  sellerCountry?: string;
  /** Free-text element as written ('Dysprosium oxide', 'Dy2O3', 'neodymium metal'). */
  elementText: string;
  formText?: string;
  purityText?: string;
  /** Original quoted price + currency + unit, verbatim. */
  priceText: string;
  currency?: string;
  unit?: string;
  quantityText?: string;
  observedDate: string; // ISO 'YYYY-MM-DD'
}

/**
 * A normalized offer: resolved to a catalog element symbol, canonical form,
 * USD/kg. `pricePerKg` is null when it could not be normalized WITHOUT inventing
 * an FX rate (hard rule #1/#3); such rows are dropped downstream, never guessed.
 */
export interface NormalizedOffer {
  elementSymbol: string | null; // null ⇒ couldn't resolve to a catalog element
  form: string;
  purity: string | null;
  quantityKg: number | null;
  pricePerKg: number | null; // null ⇒ un-normalizable (e.g. missing FX rate)
  currency: 'USD';
  sellerName: string;
  sellerCountry: string | null;
  sourceType: string;
  sourceUrl: string | null;
  observedDate: string;
  /** Source-trust × corroboration × recency, assigned at ingest (0..1). */
  confidence: number;
}

/**
 * A ranked, ready-to-persist offer: the shape of one `ScreenedOffer` row.
 * `valueScore` is the favourability rank (see `rank()`); `origin` records whether
 * the row was seeded from the dataset or produced by live screening.
 */
export interface RankedOffer {
  id: string;
  createdAt: string; // ISO
  elementSymbol: string;
  form: string;
  purity: string | null;
  quantityKg: number | null;
  pricePerKg: number;
  currency: string;
  sellerName: string;
  sellerCountry: string | null;
  sourceType: string;
  sourceUrl: string | null;
  observedDate: string; // ISO 'YYYY-MM-DD'
  confidence: number;
  valueScore: number;
  origin: string; // 'seed' | 'screened'
}

/** The result of one screening run (or, today, one read of the seeded feed). */
export interface ScreeningRunResult {
  offers: RankedOffer[];
  total: number;
  status: ScreeningBackendStatus;
  /** Human-readable provenance of these rows. */
  feedSource: (typeof SCREENING_BACKEND)['feedSource'];
  /** True when a cap was applied; surfaced, never silent (CLAUDE.md). */
  truncated: boolean;
  note: string;
}

// ── Stage 1 · ingest(), STUB: where live source adapters plug in ─────────────

/**
 * Fetch raw offers from the configured sources.
 *
 * STUB: returns nothing. There are no live source adapters yet, so the feed is
 * served entirely from the seeded dataset (see `screen()`).
 *
 * TODO(screening): build per-source adapters and wire them here. The polling +
 * caching + dedup-of-seen infrastructure already exists in Python:
 *   • scripts/scraper/monitor.py: the 6-hourly poller (sources in sources.yaml)
 *   • scripts/import_offers.py: per-source price extraction → record schema
 * Each adapter must respect the target's robots.txt / ToS and rate limits, and
 * record a `sourceUrl` so every screened offer stays auditable. See
 * docs/OFFER-SCREENING.md §2 for the target source list.
 */
export async function ingest(
  _sources: IngestSource[] = [],
): Promise<RawOffer[]> {
  // No live ingestion wired. Intentionally empty, not a placeholder dataset.
  return [];
}

// ── Stage 2 · normalize(), REAL (pure): raw → USD/kg on the canonical vocab ──

/** Units → kilograms (mirrors scripts/normalize_prices.py UNIT_TO_KG_FACTOR). */
const UNIT_TO_KG: Record<string, number> = {
  g: 0.001,
  kg: 1,
  lb: 0.453592,
  oz: 0.0283495,
  t: 1000,
};

/** Parse a price written as free text ('$1,234.50', '1 231,00') to a number, or null. */
function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}\b)/g, '');
  const n = Number(cleaned.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Normalize one raw offer to USD/kg on the canonical element/form vocabulary.
 *
 * REAL, pure, and honest about FX: it converts the original currency to USD only
 * if a rate is supplied in `ctx.fxToUsd`. We never apply a live/guessed rate (no
 * paid FX service, hard rule #3; an invented rate would violate hard rule #1),
 * so an un-convertible quote yields `pricePerKg: null` and is dropped by the
 * caller rather than fabricated. Element resolution uses the catalog the caller
 * passes in (symbol or name, case-insensitive); unresolved ⇒ `elementSymbol:null`.
 */
export function normalize(
  raw: RawOffer,
  ctx: {
    /** Catalog rows used to resolve free-text element → canonical symbol. */
    catalog: { symbol: string; name: string }[];
    /** Currency → USD multiplier. USD defaults to 1; others must be provided. */
    fxToUsd?: Record<string, number>;
  },
): NormalizedOffer {
  const fx: Record<string, number> = { USD: 1, ...(ctx.fxToUsd ?? {}) };
  const text = `${raw.elementText} ${raw.formText ?? ''}`.toLowerCase();

  // element: resolve by exact symbol token, else by name substring.
  const bySymbol = ctx.catalog.find((e) =>
    new RegExp(`\\b${e.symbol.toLowerCase()}\\b`).test(text),
  );
  const byName = ctx.catalog.find((e) => text.includes(e.name.toLowerCase()));
  const elementSymbol = (bySymbol ?? byName)?.symbol ?? null;

  // price → USD/kg.
  const original = parsePrice(raw.priceText);
  const currency = (raw.currency ?? 'USD').toUpperCase();
  const rate = fx[currency];
  const unit = (raw.unit ?? 'kg').toLowerCase();
  const perKgFactor = UNIT_TO_KG[unit];
  const pricePerKg =
    original != null && rate != null && perKgFactor != null
      ? (original * rate) / perKgFactor
      : null; // un-convertible (missing FX/unit), never fabricated

  let quantityKg: number | null = null;
  if (raw.quantityText != null) {
    const q = parsePrice(raw.quantityText);
    quantityKg = q != null && perKgFactor != null ? q * perKgFactor : null;
  }

  return {
    elementSymbol,
    form: (raw.formText ?? '').toLowerCase().trim(),
    purity: raw.purityText?.trim() || null,
    quantityKg,
    pricePerKg,
    currency: 'USD',
    sellerName: raw.sellerName,
    sellerCountry: raw.sellerCountry?.trim() || null,
    sourceType: raw.sourceType,
    sourceUrl: raw.sourceUrl ?? null,
    observedDate: raw.observedDate,
    confidence: 0, // assigned by the verification/scoring step (see doc §4)
  };
}

// ── Stage 3 · rank(), REAL (pure): the favourability score ───────────────────

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** `${symbol}::${form}` basis key, same convention as prisma/seed.ts. */
export const basisKey = (symbol: string, form: string): string =>
  `${symbol}::${form}`;

/**
 * Per element+form median USD/kg across a basis set of records: the like-for-
 * like "going rate" the discount is measured against. Avoids mixing oxide vs
 * metal price levels. Identical to the median basis prisma/seed.ts builds.
 */
export function sameFormMedians(
  records: { elementSymbol: string; form: string; pricePerKg: number }[],
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const r of records) {
    const k = basisKey(r.elementSymbol, r.form);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(r.pricePerKg);
  }
  const out = new Map<string, number>();
  for (const [k, prices] of buckets) out.set(k, median(prices));
  return out;
}

/**
 * The favourability score for one offer, IDENTICAL to prisma/seed.ts so seeded
 * and (future) screened rows share one scale:
 *
 *     discount   = clamp((median − pricePerKg) / median, −1, +1)
 *     valueScore = round(discount × confidence, 4)
 *
 * Higher = better value: positive ⇒ below the same-form median (a discount),
 * scaled by confidence. The −1 clamp stops one over-priced outlier dominating.
 */
export function valueScore(
  pricePerKg: number,
  confidence: number,
  sameFormMedian: number,
): number {
  const discount =
    sameFormMedian > 0
      ? clamp((sameFormMedian - pricePerKg) / sameFormMedian, -1, 1)
      : 0;
  return Math.round(discount * confidence * 10000) / 10000;
}

/**
 * Rank normalized offers by value. Pure: drops rows with no normalized price
 * (un-convertible, never invented), then attaches `valueScore` from the basis
 * medians. Sorted best-value first. `origin` is stamped 'screened' (these came
 * from live ingestion, not the seed). Persisting + dedup + the human-review
 * checkpoint happen in the caller (docs/OFFER-SCREENING.md §4 to §6), not here.
 */
export function rank(
  offers: NormalizedOffer[],
  basisMedians: Map<string, number>,
): Omit<RankedOffer, 'id' | 'createdAt'>[] {
  return offers
    .filter(
      (o): o is NormalizedOffer & { elementSymbol: string; pricePerKg: number } =>
        o.elementSymbol != null && o.pricePerKg != null,
    )
    .map((o) => ({
      elementSymbol: o.elementSymbol,
      form: o.form,
      purity: o.purity,
      quantityKg: o.quantityKg,
      pricePerKg: o.pricePerKg,
      currency: o.currency,
      sellerName: o.sellerName,
      sellerCountry: o.sellerCountry,
      sourceType: o.sourceType,
      sourceUrl: o.sourceUrl,
      observedDate: o.observedDate,
      confidence: o.confidence,
      valueScore: valueScore(
        o.pricePerKg,
        o.confidence,
        basisMedians.get(basisKey(o.elementSymbol, o.form)) ?? 0,
      ),
      origin: SCREENING_BACKEND.liveOrigin,
    }))
    .sort((a, b) => b.valueScore - a.valueScore);
}

// ── Orchestrator · screen(), returns the SEEDED feed today ───────────────────

/** Hard cap so a runaway table can never render unbounded. Surfaced, not silent. */
const MAX_FEED_ROWS = 1000;

/**
 * Return the screened-offer feed, best value first.
 *
 * TODAY (stub): this reads the SEEDED `ScreenedOffer` rows (built from the public
 * price dataset in prisma/seed.ts), real, verified data, just not live-screened.
 *
 * WHEN LIVE: the body becomes, roughly,
 *     const raw = await ingest(SOURCES)
 *     const normalized = raw.map((r) => normalize(r, { catalog, fxToUsd }))
 *     const basis = sameFormMedians([...datasetRecords, ...normalized])
 *     const fresh = rank(normalized, basis)            // origin: 'screened'
 *     await persistWithDedupAndReview(fresh)           // §5 to §6
 * and this read returns seeded + screened rows merged on the one `valueScore`
 * scale. Until then `ingest()` yields nothing and the seeds stand in.
 *
 * Robust by design: a DB error degrades to an empty feed with a note, so the
 * page always renders (the open reference never depends on the dynamic store).
 */
export async function screen(
  opts: { origin?: 'seed' | 'screened' | 'all'; limit?: number } = {},
): Promise<ScreeningRunResult> {
  const origin = opts.origin ?? 'all';
  const limit = Math.min(opts.limit ?? MAX_FEED_ROWS, MAX_FEED_ROWS);

  try {
    const where = origin === 'all' ? {} : { origin };
    const total = await prisma.screenedOffer.count({ where });
    const rows = await prisma.screenedOffer.findMany({
      where,
      orderBy: [{ valueScore: 'desc' }, { confidence: 'desc' }],
      take: limit,
    });

    const offers: RankedOffer[] = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      elementSymbol: r.elementSymbol,
      form: r.form,
      purity: r.purity,
      quantityKg: r.quantityKg,
      pricePerKg: r.pricePerKg,
      currency: r.currency,
      sellerName: r.sellerName,
      sellerCountry: r.sellerCountry,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      observedDate: r.observedDate,
      confidence: r.confidence,
      valueScore: r.valueScore,
      origin: r.origin,
    }));

    const screenedCount = offers.filter(
      (o) => o.origin === SCREENING_BACKEND.liveOrigin,
    ).length;
    const feedSource: ScreeningRunResult['feedSource'] =
      screenedCount === 0 ? 'seeded' : screenedCount === offers.length ? 'screened' : 'mixed';

    return {
      offers,
      total,
      status: SCREENING_BACKEND.status,
      feedSource,
      truncated: total > offers.length,
      note:
        feedSource === 'seeded'
          ? 'Seeded from the verified price dataset; live screening is not yet wired.'
          : 'Includes live-screened offers.',
    };
  } catch (err) {
    console.error('[screening] could not read the offer feed:', err);
    return {
      offers: [],
      total: 0,
      status: SCREENING_BACKEND.status,
      feedSource: 'seeded',
      truncated: false,
      note: 'The offer store is unreachable; the feed is temporarily empty.',
    };
  }
}
