/**
 * Price-gauge engine: two pure, side-effect-free functions over the versioned
 * price records (`_data/price_records.json`, read by callers through `lib/data`):
 *
 *   1. `selectReferencePrices()`: a faithful port of the Jekyll include
 *      `legacy/_includes/price-selection.html` (the headline retail/bulk refs +
 *      premium shown on each element page). UNCHANGED from Prompt 4.
 *
 *   2. `estimatePrice()` (Prompt 18): estimates a fair price RANGE + confidence
 *      for a requested {element, form, purity, quantity}, derived entirely from
 *      the matched records. It NEVER invents a number: zero matches ⇒ an explicit
 *      "insufficient data" result, not a guess (CLAUDE.md hard rule #1).
 *
 * Both are framework-agnostic and free of I/O (they take the records array as an
 * argument), so the `/api/price-gauge` route, the price-gauge widget (Prompt 19),
 * and the seller form (Prompt 20) can all call them directly. Keeping the records
 * a parameter (rather than importing `lib/data` here) also avoids an import cycle:
 * `lib/data/index.ts` imports `selectReferencePrices` from this module.
 */
import type {
  Confidence,
  ISODate,
  MarketTier,
  PriceRecord,
  ReferencePrices,
} from './data/types';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Reference-price selection (Prompt 4, verbatim port; do not change)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * For a given element symbol it picks, from the price records:
 *   • retailRef: the LOWEST-priced retail record with confidence ≥ 0.5 and a
 *     quoted quantity in [5 g, 1 kg]; a `metal`-form record is preferred over
 *     any other form (metal winner if one exists, else the cheapest of any form).
 *   • bulkRef: the MOST RECENT `bulk`/`industrial` record with confidence ≥ 0.6.
 *   • retailPremium: retailRef ÷ bulkRef (per-kg) when both exist.
 *
 * Tie-breaking matches the Liquid original: strict `<` / `>` comparisons mean the
 * first record encountered wins a tie, so callers must pass records in file order.
 */
export function selectReferencePrices(
  records: PriceRecord[],
  symbol: string,
): ReferencePrices {
  let retailRefMetal: PriceRecord | null = null;
  let retailRefAny: PriceRecord | null = null;
  let bulkRef: PriceRecord | null = null;

  for (const record of records) {
    if (record.element_symbol !== symbol) continue;

    // Liquid: {{ confidence_score | times: 100 | round }}
    const conf100 = Math.round(record.confidence_score * 100);

    if (record.market_tier === 'retail' && conf100 >= 50) {
      // Liquid: {{ quoted_quantity_kg | times: 1000 | round }}; nil → 0.
      const qty = record.quoted_quantity_kg ?? 0;
      const qtyG = Math.round(qty * 1000);
      if (qtyG >= 5 && qty <= 1) {
        if (record.form === 'metal') {
          if (
            retailRefMetal === null ||
            record.normalized_usd_per_kg < retailRefMetal.normalized_usd_per_kg
          ) {
            retailRefMetal = record;
          }
        }
        if (
          retailRefAny === null ||
          record.normalized_usd_per_kg < retailRefAny.normalized_usd_per_kg
        ) {
          retailRefAny = record;
        }
      }
    }

    if (record.market_tier === 'bulk' || record.market_tier === 'industrial') {
      if (conf100 >= 60) {
        // ISO 'YYYY-MM-DD' dates compare correctly as strings (as in Liquid).
        if (bulkRef === null || record.quote_date > bulkRef.quote_date) {
          bulkRef = record;
        }
      }
    }
  }

  const retailRef = retailRefMetal ?? retailRefAny;

  const retailPremium =
    retailRef && bulkRef && bulkRef.normalized_usd_per_kg > 0
      ? retailRef.normalized_usd_per_kg / bulkRef.normalized_usd_per_kg
      : null;

  return { retailRef, bulkRef, retailPremium };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Price-gauge estimator (Prompt 18)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The two market BANDS the methodology defines. Quantity selects the band; the
 * estimate is computed strictly inside one band: retail and bulk are different
 * markets and are NEVER merged (methodology: "Retail and bulk prices are never
 * merged or averaged"). The dataset's `wholesale`/`industrial` tiers fold into
 * `bulk`; `lab` folds into `retail`.
 */
export type TierBand = 'retail' | 'bulk';

/** How the record set was matched against the requested form. */
export type MatchMode = 'exact-form' | 'form-widened' | 'all-forms' | 'none';

export interface PriceGaugeInput {
  /** Case-sensitive element symbol ('Dy', not 'dy'). */
  symbol: string;
  /** Material form ('oxide' | 'metal' | …). Omit to estimate across all forms. */
  form?: string;
  /** Requested purity, e.g. '99.9%'. Soft-weights records toward like purity. */
  purity?: string | null;
  /** Requested quantity (kg). Selects the tier band when `tier` is not given. */
  quantityKg?: number | null;
  /** Explicit band override; otherwise derived from `quantityKg`. */
  tier?: TierBand;
}

export interface PriceGaugeBasis {
  /** Records that fed the range (after band + form selection). */
  matchedRecords: number;
  /** Distinct `seller_name`s among the matched records (independence signal). */
  distinctSellers: number;
  /** Span of `quote_date`s across matched records; null when none matched. */
  dateRange: { from: ISODate; to: ISODate } | null;
  /** Human-readable description of exactly what the engine did. */
  method: string;
  /** The band actually used. */
  tier: TierBand;
  /** Echo of the requested form (null when none was requested). */
  requestedForm: string | null;
  /** Forms actually present in the matched set. */
  matchedForms: string[];
  /** How the form filter resolved. */
  matchMode: MatchMode;
  /** Full observed [min,max] of matched prices. Proves the range never extrapolates. */
  observedRange: { min: number; max: number } | null;
  /** Record counts available for the element, by band (for "try the other tier" hints). */
  availableByTier: { retail: number; bulk: number };
  /** IDs of the contributing records (traceability back to provenance). */
  recordIds: string[];
  /** Mean `confidence_score` of the matched records; null when none matched. */
  avgConfidenceScore: number | null;
}

export interface PriceGaugeResult {
  /** true ⇒ a range was produced; false ⇒ no usable records (see `message`). */
  sufficient: boolean;
  /** Robust weighted 25th / 50th / 75th percentile of normalized_usd_per_kg. */
  low: number | null;
  mid: number | null;
  high: number | null;
  currency: 'USD';
  unit: 'kg';
  confidence: Confidence;
  basis: PriceGaugeBasis;
  /** Explanation when `sufficient` is false (else null). */
  message: string | null;
}

// ── Tunable, documented constants ────────────────────────────────────────────
// Quantity → tier band. Methodology: retail "typically under 25 kg"; bulk MOQ
// "≥ 25 kg". So 25 kg is the cut.
const QUANTITY_TIER_THRESHOLD_KG = 25;
// Recency weight = 0.5 ** (ageDays / HALF_LIFE). A 180-day-old quote counts half
// as much as a quote from `asOf`. 180d mirrors the methodology's stale boundary.
const RECENCY_HALF_LIFE_DAYS = 180;
// Purity weight = exp(-|Δnines| · K). One "nine" apart (99.9 vs 99.99) ≈ 0.50.
const PURITY_PROXIMITY_K = 0.7;
// Confidence rubric (holistic, NOT a copy of any single confidence_score).
const FRESH_DAYS = 90; // methodology: "Fresh: within 90 days"
const USABLE_DAYS = 180; // methodology: "Stale: 90 to 180 days"
const MIN_RECORDS_HIGH = 5;
const MIN_SELLERS_HIGH = 3;
const AVG_CONF_HIGH = 0.6;
const MIN_RECORDS_MEDIUM = 3;
const MIN_SELLERS_MEDIUM = 2;
const AVG_CONF_MEDIUM = 0.5;
// Price-agreement caps: a wide interquartile spread relative to the median means
// the records disagree, so the range, however computed, is less trustworthy.
const REL_IQR_CAP_MEDIUM = 0.6; // P75−P25 > 60% of median ⇒ at most medium
const REL_IQR_CAP_LOW = 1.5; //  P75−P25 > 150% of median ⇒ at most low

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Lower `c` to at most `ceiling` (never raises it). */
function capConfidence(c: Confidence, ceiling: Confidence): Confidence {
  return CONFIDENCE_RANK[c] <= CONFIDENCE_RANK[ceiling] ? c : ceiling;
}

/** Fold a dataset tier into one of the two methodology bands. */
function bandOf(tier: MarketTier): TierBand {
  return tier === 'bulk' || tier === 'wholesale' || tier === 'industrial'
    ? 'bulk'
    : 'retail';
}

/** 'YYYY-MM-DD' → UTC-midnight epoch ms; NaN if unparseable (deterministic). */
function isoToUtcMs(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
}

function daysBetween(aMs: number, bMs: number): number {
  return (aMs - bMs) / 86_400_000;
}

/** Newest `quote_date` across the records, as epoch ms: the dataset's "now". */
function maxQuoteMs(records: PriceRecord[]): number {
  let max = Number.NEGATIVE_INFINITY;
  for (const r of records) {
    const ms = isoToUtcMs(r.quote_date);
    if (Number.isFinite(ms) && ms > max) max = ms;
  }
  return max;
}

/**
 * Parse the first percentage in a free-form purity string ('99.99% (4N)' → 99.99,
 * '99.5-99.95%' → the bound nearest the % sign). Returns null for non-numeric
 * descriptors ('various', 'High purity', null). We never fabricate a purity.
 */
function parsePurityPercent(purity: string | null | undefined): number | null {
  if (!purity) return null;
  const m = /(\d{1,3}(?:\.\d+)?)\s*%/.exec(purity);
  if (!m) return null;
  const v = Number.parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 && v < 100 ? v : null;
}

/** Purity % → "nines": -log10(1 − p/100). 99.9 → 3, 99.99 → 4. null passes through. */
function purityNines(percent: number | null): number | null {
  if (percent === null) return null;
  const frac = 1 - percent / 100;
  return frac > 0 ? -Math.log10(frac) : null;
}

interface WeightedValue {
  value: number;
  weight: number;
}

/**
 * Interpolated weighted quantile of `value` at fraction `q ∈ [0,1]`.
 * Each point sits at its cumulative-midpoint position p_i = (Σw_<i + w_i/2)/Σw;
 * the result is linearly interpolated between bracketing points. Because both the
 * positions and the (sorted) values are monotone in q, low ≤ mid ≤ high is
 * guaranteed, and the result always lies within the observed [min,max]; the
 * engine can never extrapolate beyond a real record. Degenerate (all-zero)
 * weights fall back to uniform weighting.
 */
function weightedQuantile(points: WeightedValue[], q: number): number {
  const sorted = [...points].sort((a, b) => a.value - b.value);
  if (sorted.length === 1) return sorted[0].value;

  let total = 0;
  for (const p of sorted) total += p.weight;
  const useUniform = !(total > 0);
  if (useUniform) total = sorted.length;

  const positions: number[] = [];
  let cum = 0;
  for (const p of sorted) {
    const w = useUniform ? 1 : p.weight;
    positions.push((cum + w / 2) / total);
    cum += w;
  }

  if (q <= positions[0]) return sorted[0].value;
  if (q >= positions[positions.length - 1]) return sorted[sorted.length - 1].value;
  for (let i = 0; i < positions.length - 1; i++) {
    if (q >= positions[i] && q <= positions[i + 1]) {
      const span = positions[i + 1] - positions[i];
      const t = span > 0 ? (q - positions[i]) / span : 0;
      return sorted[i].value + t * (sorted[i + 1].value - sorted[i].value);
    }
  }
  return sorted[sorted.length - 1].value;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Band implied by quantity (kg) / explicit tier; defaults to retail. */
function deriveBand(input: PriceGaugeInput): {
  band: TierBand;
  defaulted: boolean;
} {
  if (input.tier) return { band: input.tier, defaulted: false };
  if (input.quantityKg != null && Number.isFinite(input.quantityKg)) {
    return {
      band: input.quantityKg >= QUANTITY_TIER_THRESHOLD_KG ? 'bulk' : 'retail',
      defaulted: false,
    };
  }
  return { band: 'retail', defaulted: true };
}

/** Build an "insufficient data" result: no fabricated price (hard rule #1). */
function insufficient(
  input: PriceGaugeInput,
  band: TierBand,
  availableByTier: { retail: number; bulk: number },
  message: string,
): PriceGaugeResult {
  return {
    sufficient: false,
    low: null,
    mid: null,
    high: null,
    currency: 'USD',
    unit: 'kg',
    confidence: 'low',
    message,
    basis: {
      matchedRecords: 0,
      distinctSellers: 0,
      dateRange: null,
      method: `${band} tier · no matching records · no estimate produced (no fabrication on zero matches)`,
      tier: band,
      requestedForm: input.form?.trim() || null,
      matchedForms: [],
      matchMode: 'none',
      observedRange: null,
      availableByTier,
      recordIds: [],
      avgConfidenceScore: null,
    },
  };
}

/**
 * Estimate a fair price range + confidence for {symbol, form, purity, quantity}.
 *
 * Algorithm (each step documented inline):
 *   0. Element gate: zero records for the symbol ⇒ insufficient.
 *   1. Tier band: quantity (or explicit `tier`) picks retail (<25 kg) vs bulk;
 *      the estimate stays strictly inside one band (bands are never merged).
 *   2. Form: prefer an exact form match; widen to all in-band forms ONLY when
 *      the requested form has zero records (mixing oxide+metal blends different
 *      products, which the methodology forbids in the headline display).
 *   3. Weights: each record contributes by confidence_score × recency × purity-
 *      proximity. Recency is a half-life decay vs `asOf` (the dataset's newest
 *      quote_date, so the function is pure/deterministic). Purity nudges toward
 *      like-for-like records; it never applies a fabricated price premium, and is
 *      neutral when either purity is unknown.
 *   4. Range: robust weighted P25 / P50 / P75 of normalized_usd_per_kg, so a
 *      single tiny-quantity collector vial can't blow up the band.
 *   5. Confidence: holistic from match count, seller diversity, recency, form
 *      precision, and price agreement; conservative (thin matches → low).
 *
 * Quantity is handled purely via band selection: NO within-band per-kg
 * multiplier is applied, because the dataset does not support a justifiable
 * quantity-elasticity curve and inventing one would violate the no-fabrication
 * rule. The `opts.asOf` override exists for callers that want wall-clock
 * staleness; by default recency is measured against the freshest record present.
 */
export function estimatePrice(
  input: PriceGaugeInput,
  records: PriceRecord[],
  opts: { asOf?: ISODate } = {},
): PriceGaugeResult {
  const { symbol } = input;
  const requestedForm = input.form?.trim() || undefined;
  const { band, defaulted } = deriveBand(input);

  const asOfMs = opts.asOf ? isoToUtcMs(opts.asOf) : maxQuoteMs(records);

  // STEP 0: element gate.
  const forSymbol = records.filter((r) => r.element_symbol === symbol);
  const availableByTier = {
    retail: forSymbol.filter((r) => bandOf(r.market_tier) === 'retail').length,
    bulk: forSymbol.filter((r) => bandOf(r.market_tier) === 'bulk').length,
  };
  if (forSymbol.length === 0) {
    return insufficient(
      input,
      band,
      availableByTier,
      `No price records exist for “${symbol}”.`,
    );
  }

  // STEP 1: tier band (estimate strictly within it).
  const inBand = forSymbol.filter((r) => bandOf(r.market_tier) === band);
  if (inBand.length === 0) {
    const other: TierBand = band === 'retail' ? 'bulk' : 'retail';
    const hint =
      availableByTier[other] > 0
        ? ` ${availableByTier[other]} record(s) exist in the ${other} tier. Try tier=${other}.`
        : '';
    return insufficient(
      input,
      band,
      availableByTier,
      `No ${band}-tier price records for “${symbol}”.${hint}`,
    );
  }

  // STEP 2: form selection / widening.
  let matched = inBand;
  let matchMode: MatchMode = 'all-forms';
  if (requestedForm) {
    const exact = inBand.filter(
      (r) => r.form.toLowerCase() === requestedForm.toLowerCase(),
    );
    if (exact.length > 0) {
      matched = exact;
      matchMode = 'exact-form';
    } else {
      matched = inBand;
      matchMode = 'form-widened';
    }
  }

  // STEP 3: per-record weights.
  const reqNines = purityNines(parsePurityPercent(input.purity ?? null));
  const weighted: WeightedValue[] = matched.map((r) => {
    const ageDays = Math.max(0, daysBetween(asOfMs, isoToUtcMs(r.quote_date)));
    const recency = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    const recNines = purityNines(parsePurityPercent(r.purity ?? null));
    const purity =
      reqNines !== null && recNines !== null
        ? Math.exp(-Math.abs(reqNines - recNines) * PURITY_PROXIMITY_K)
        : 1;
    const raw = r.confidence_score * recency * purity;
    const weight = Number.isFinite(raw) && raw > 0 ? raw : 1e-6;
    return { value: r.normalized_usd_per_kg, weight };
  });

  // STEP 4: robust weighted interquartile range.
  const low = round2(weightedQuantile(weighted, 0.25));
  const mid = round2(weightedQuantile(weighted, 0.5));
  const high = round2(weightedQuantile(weighted, 0.75));

  // STEP 5: holistic confidence.
  const prices = matched.map((r) => r.normalized_usd_per_kg);
  const observedRange = {
    min: round2(Math.min(...prices)),
    max: round2(Math.max(...prices)),
  };
  const sellers = new Set(matched.map((r) => r.seller_name)).size;
  const avgConf =
    matched.reduce((s, r) => s + r.confidence_score, 0) / matched.length;
  const dates = matched.map((r) => r.quote_date).sort();
  const newestAge = daysBetween(asOfMs, isoToUtcMs(dates[dates.length - 1]));
  const matchedForms = [...new Set(matched.map((r) => r.form))];
  const relIQR = mid > 0 ? (high - low) / mid : 0;

  let confidence: Confidence;
  if (
    matched.length >= MIN_RECORDS_HIGH &&
    sellers >= MIN_SELLERS_HIGH &&
    newestAge <= FRESH_DAYS &&
    avgConf >= AVG_CONF_HIGH
  ) {
    confidence = 'high';
  } else if (
    matched.length >= MIN_RECORDS_MEDIUM &&
    sellers >= MIN_SELLERS_MEDIUM &&
    newestAge <= USABLE_DAYS &&
    avgConf >= AVG_CONF_MEDIUM
  ) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Caps (can only lower the grade):
  //  • a substituted form (requested form absent) is less precise;
  //  • a genuinely multi-form set blends different products;
  //  • disagreeing records (wide relative IQR) make the mid less meaningful;
  //  • only-stale data can't anchor a current estimate.
  if (matchMode === 'form-widened') confidence = capConfidence(confidence, 'medium');
  if (matchedForms.length > 1) confidence = capConfidence(confidence, 'medium');
  if (relIQR > REL_IQR_CAP_LOW) confidence = capConfidence(confidence, 'low');
  else if (relIQR > REL_IQR_CAP_MEDIUM)
    confidence = capConfidence(confidence, 'medium');
  if (newestAge > USABLE_DAYS) confidence = capConfidence(confidence, 'low');

  // Assemble a transparent method description.
  const tierNote = input.tier
    ? `${band} tier (explicit)`
    : defaulted
      ? `${band} tier (default, no quantity given)`
      : `${band} tier (quantity ${input.quantityKg} kg)`;
  const formNote =
    matchMode === 'exact-form'
      ? `exact form “${requestedForm}”`
      : matchMode === 'form-widened'
        ? `requested form “${requestedForm}” not stocked in ${band}; widened to all forms (${matchedForms.join(', ')})`
        : `all forms (${matchedForms.join(', ')})`;
  const methodParts = [
    tierNote,
    formNote,
    `${matched.length} record(s) from ${sellers} seller(s)`,
    `weighted P25/P50/P75 by confidence×recency(½-life ${RECENCY_HALF_LIFE_DAYS}d)${reqNines !== null ? '×purity-proximity' : ''}`,
  ];
  if (relIQR > REL_IQR_CAP_MEDIUM) {
    methodParts.push(
      `wide dispersion (IQR ${Math.round(relIQR * 100)}% of median) → confidence capped`,
    );
  }

  return {
    sufficient: true,
    low,
    mid,
    high,
    currency: 'USD',
    unit: 'kg',
    confidence,
    message: null,
    basis: {
      matchedRecords: matched.length,
      distinctSellers: sellers,
      dateRange: { from: dates[0], to: dates[dates.length - 1] },
      method: methodParts.join(' · '),
      tier: band,
      requestedForm: requestedForm ?? null,
      matchedForms,
      matchMode,
      observedRange,
      availableByTier,
      recordIds: matched.map((r) => r.id),
      avgConfidenceScore: round2(avgConf),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Lightweight self-check (no test framework; run via `tsx`, see header)
// ─────────────────────────────────────────────────────────────────────────────

export interface SelfCheckItem {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Asserts the engine returns sensible, BOUNDED, ordered ranges for known
 * elements and a clean "insufficient data" path. Pure over the records you pass
 * in (load them from `lib/data` or read `_data/price_records.json` directly).
 */
export function selfCheck(records: PriceRecord[]): {
  passed: boolean;
  checks: SelfCheckItem[];
} {
  const checks: SelfCheckItem[] = [];

  const expectRange = (name: string, input: PriceGaugeInput) => {
    const r = estimatePrice(input, records);
    const o = r.basis.observedRange;
    const ok =
      r.sufficient &&
      typeof r.low === 'number' &&
      typeof r.mid === 'number' &&
      typeof r.high === 'number' &&
      r.low > 0 &&
      r.low <= r.mid &&
      r.mid <= r.high &&
      r.currency === 'USD' &&
      r.unit === 'kg' &&
      ['low', 'medium', 'high'].includes(r.confidence) &&
      r.basis.matchedRecords >= 1 &&
      r.basis.distinctSellers >= 1 &&
      r.basis.dateRange !== null &&
      o !== null &&
      // never extrapolate beyond observed records (±ε for rounding)
      r.low >= o.min - 1e-6 &&
      r.high <= o.max + 1e-6;
    checks.push({
      name,
      ok,
      detail: r.sufficient
        ? `low=${r.low} mid=${r.mid} high=${r.high} conf=${r.confidence} n=${r.basis.matchedRecords} sellers=${r.basis.distinctSellers} observed=[${o?.min},${o?.max}]`
        : `UNEXPECTED insufficient: ${r.message}`,
    });
  };

  const expectInsufficient = (name: string, input: PriceGaugeInput) => {
    const r = estimatePrice(input, records);
    const ok =
      !r.sufficient &&
      r.low === null &&
      r.mid === null &&
      r.high === null &&
      typeof r.message === 'string' &&
      r.message.length > 0;
    checks.push({ name, ok, detail: r.message ?? '(no message)' });
  };

  // Sensible, bounded ranges from real records:
  expectRange('Dy oxide retail', { symbol: 'Dy', form: 'oxide', tier: 'retail' });
  expectRange('Ho oxide bulk', { symbol: 'Ho', form: 'oxide', tier: 'bulk' });
  expectRange('La oxide retail (wide spread stays bounded)', {
    symbol: 'La',
    form: 'oxide',
    tier: 'retail',
  });
  expectRange('Nd metal, quantity 0.05 kg → retail', {
    symbol: 'Nd',
    form: 'metal',
    quantityKg: 0.05,
  });

  // Insufficient-data path: the engine must never fabricate a price:
  expectInsufficient('La oxide bulk (no bulk records for La)', {
    symbol: 'La',
    form: 'oxide',
    tier: 'bulk',
  });
  expectInsufficient('Y oxide bulk (element exists, bulk band empty)', {
    symbol: 'Y',
    form: 'oxide',
    tier: 'bulk',
  });
  expectInsufficient('Unknown element Zz', { symbol: 'Zz', form: 'oxide' });

  return { passed: checks.every((c) => c.ok), checks };
}
