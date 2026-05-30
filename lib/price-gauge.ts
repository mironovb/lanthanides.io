/**
 * Reference-price selection — a faithful TypeScript port of the Jekyll include
 * `legacy/_includes/price-selection.html`.
 *
 * For a given element symbol it picks, from the price records:
 *   • retailRef — the LOWEST-priced retail record with confidence ≥ 0.5 and a
 *     quoted quantity in [5 g, 1 kg]; a `metal`-form record is preferred over
 *     any other form (metal winner if one exists, else the cheapest of any form).
 *   • bulkRef — the MOST RECENT `bulk`/`industrial` record with confidence ≥ 0.6.
 *   • retailPremium — retailRef ÷ bulkRef (per-kg) when both exist.
 *
 * Tie-breaking matches the Liquid original: strict `<` / `>` comparisons mean the
 * first record encountered wins a tie, so callers must pass records in file order.
 *
 * Pure (no I/O) so it is reusable by `/api/price-gauge` and `/tools/price-gauge`
 * (Prompt 8). The data-bound accessor is `getReferencePrices()` in `lib/data`.
 */
import type { PriceRecord, ReferencePrices } from './data/types';

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
