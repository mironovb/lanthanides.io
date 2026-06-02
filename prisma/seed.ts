/**
 * Seed for the demand-side `ScreenedOffer` feed (rendered at /offers, P8).
 *
 * Reads the PUBLIC price dataset through the typed data layer (`lib/data`), it
 * does NOT re-parse `_data/` (CLAUDE.md: one reader, the Python pipeline owns
 * those files). Every qualifying price record becomes one `ScreenedOffer` row
 * marked `origin: 'seed'`, so the feed has real content before the live
 * screening/ingestion pipeline exists (a later prompt; those rows will carry
 * `origin: 'screened'`). No data is invented, gaps (missing purity, missing
 * seller country) are carried through as NULL, never filled (CLAUDE.md rule #1).
 *
 * ── What qualifies ───────────────────────────────────────────────────────────
 * An "offer" implies a seller. Pure reference indices/benchmarks are price
 * SIGNALS, not offers, so records whose `source_type` is one of
 * BENCHMARK_SOURCE_TYPES are excluded from the feed (they still inform the
 * benchmark median below). Counts are logged, nothing is silently dropped.
 *
 * ── valueScore (the documented rank input) ───────────────────────────────────
 * For each element+form, `median` = the median `normalized_usd_per_kg` across
 * ALL of that element's records of that form (offers + benchmark indices), a
 * like-for-like "going rate" that avoids mixing oxide vs metal price levels.
 *
 *     discount   = clamp((median − pricePerKg) / median, −1, +1)
 *     valueScore = round(discount × confidence_score, 4)
 *
 * Higher = better value: a positive score means the offer sits below the
 * same-form median (a discount), scaled by the source record's confidence.
 * The positive side is naturally bounded at +1 (price can't fall below 0); the
 * negative side is clamped at −1 so one over-priced outlier (e.g. a tiny retail
 * vial priced against a bulk-heavy median) can't dominate the ranking. Range in
 * the current dataset: roughly [−0.85, +0.69].
 *
 * ── Idempotency ──────────────────────────────────────────────────────────────
 * Clear-then-insert, scoped to `origin: 'seed'` and run in one transaction, so
 * re-running is safe and never touches rows the live pipeline may add later.
 *
 * Run: `npx prisma db seed` (also auto-runs after `prisma migrate dev/reset`).
 */
import { PrismaClient, type Prisma } from '@prisma/client';

import { getElements, getPriceRecords } from '../lib/data';
import type { PriceRecord } from '../lib/data';

const prisma = new PrismaClient();

/**
 * `source_type` values that are reference indices/benchmarks rather than seller
 * offers. Excluded from the feed (kept in the median basis). Verified against
 * `_data/price_records.json` on 2026-05-31.
 */
const BENCHMARK_SOURCE_TYPES = new Set([
  'industry_benchmark',
  'benchmark_index',
  'benchmark',
  'market_index',
]);

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Median of a non-empty numeric list (avg of the two middles for even counts). */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Empty/whitespace-only/missing → null (surface the gap, never fabricate). */
function nullableStr(v: string | null | undefined): string | null {
  return v && v.trim() !== '' ? v : null;
}

async function main(): Promise<void> {
  // One read of the public dataset, through the typed layer (runs the build-time
  // integrity assertions: 31 elements / 238 records / regulated→notice).
  const allRecords = getPriceRecords();
  const elementCount = getElements().length;

  // Benchmark basis: per element+form median over ALL records (incl. indices).
  const pricesByElementForm = new Map<string, number[]>();
  const key = (symbol: string, form: string) => `${symbol}::${form}`;
  for (const r of allRecords) {
    const k = key(r.element_symbol, r.form);
    const bucket = pricesByElementForm.get(k);
    if (bucket) bucket.push(r.normalized_usd_per_kg);
    else pricesByElementForm.set(k, [r.normalized_usd_per_kg]);
  }
  const medianByElementForm = new Map<string, number>();
  for (const [k, prices] of pricesByElementForm) {
    medianByElementForm.set(k, median(prices));
  }

  // Qualifying offers = everything except pure reference indices/benchmarks.
  const offers = allRecords.filter(
    (r) => !BENCHMARK_SOURCE_TYPES.has(r.source_type),
  );
  const excluded = allRecords.length - offers.length;

  const rows: Prisma.ScreenedOfferCreateManyInput[] = offers.map(
    (r: PriceRecord) => {
      const med = medianByElementForm.get(key(r.element_symbol, r.form)) ?? 0;
      const discount =
        med > 0 ? clamp((med - r.normalized_usd_per_kg) / med, -1, 1) : 0;
      const valueScore =
        Math.round(discount * r.confidence_score * 10000) / 10000;

      return {
        elementSymbol: r.element_symbol,
        form: r.form,
        purity: nullableStr(r.purity),
        quantityKg: r.quoted_quantity_kg, // number | null, carried through
        pricePerKg: r.normalized_usd_per_kg,
        currency: 'USD', // pricePerKg is the normalized USD/kg value
        sellerName: r.seller_name,
        sellerCountry: nullableStr(r.seller_country),
        sourceType: r.source_type,
        sourceUrl: r.source_url ?? null,
        observedDate: r.quote_date, // ISO 'YYYY-MM-DD', stored verbatim
        confidence: r.confidence_score,
        valueScore,
        origin: 'seed',
      };
    },
  );

  // Idempotent: clear only seed-origin rows, then bulk-insert, atomically.
  const [{ count: cleared }] = await prisma.$transaction([
    prisma.screenedOffer.deleteMany({ where: { origin: 'seed' } }),
    prisma.screenedOffer.createMany({ data: rows }),
  ]);

  const scores = rows.map((r) => r.valueScore as number);
  const distinctElements = new Set(rows.map((r) => r.elementSymbol)).size;
  console.log(
    [
      `[seed] catalog: ${elementCount} elements, ${allRecords.length} price records`,
      `[seed] excluded ${excluded} benchmark/index records (not seller offers)`,
      `[seed] cleared ${cleared} prior seed rows; inserted ${rows.length} ScreenedOffer rows`,
      `[seed] coverage: ${distinctElements} distinct elements`,
      `[seed] valueScore range: ${Math.min(...scores).toFixed(4)} … ${Math.max(...scores).toFixed(4)}`,
      `[seed] value mix: ${scores.filter((s) => s > 0).length} discount · ${scores.filter((s) => s === 0).length} at-median · ${scores.filter((s) => s < 0).length} premium`,
    ].join('\n'),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[seed] failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
