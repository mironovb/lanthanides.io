/**
 * Ledger comparison (owner-directed, 2026-07-28): positions a marketplace
 * listing's price against the site's sourced reference ledger via the existing
 * price-gauge engine (`lib/price-gauge` over `_data/price_records.json`).
 *
 * This EXPLICITLY overrules DESIGN §4.3's prohibition on rendering ledger
 * figures next to marketplace prices — by owner instruction, for this feature
 * only. The comparison flows one way (ledger → marketplace UI); marketplace
 * prices still never feed the ledger or any published reference price
 * (DESIGN Q2 stands untouched).
 *
 * Honesty guarantees inherited from the engine, none re-implemented here:
 *   - the gauge never invents a number — insufficient data ⇒ null, no zone;
 *   - the band derives from the listing's own representative pack size, and a
 *     median pack measured in grams always lands in the RETAIL band (< 25 kg),
 *     the right ledger population for specimen pricing;
 *   - `matchMode` / `matchedRecords` / `confidence` are carried through so the
 *     UI can disclose a form-widened or thin basis instead of hiding it.
 *
 * Eligibility is deliberately narrower than the catalog average's: only a
 * single-element listing whose symbol the site's ledger actually covers, in a
 * form that maps 1:1 onto the records' form vocabulary (`metal`, `oxide` — the
 * two are literal record values). Alloys, salts, minerals, high-tech and
 * equipment never compare: the ledger has no comparable population for them.
 *
 * Server-only (transitively reads `_data/` via `lib/data`); memoised per slug.
 */
import { getElements, getPriceRecords } from '../data';
import { estimatePrice } from '../price-gauge';
import { once } from './load';
import type { LedgerComparison, LedgerZone, Listing } from './types';

/** Symbols the ledger covers (the 31-element catalog), not the full periodic table. */
const catalogSymbols = once<ReadonlySet<string>>(
  () => new Set(getElements().map((e) => e.symbol)),
);

/** Memoised per slug: the gauge run + zoning is deterministic per build. */
const cache = new Map<string, LedgerComparison | null>();

/**
 * Compute (or return the memoised) ledger positioning for one listing.
 * Null when the listing is ineligible or the gauge reports insufficient data —
 * never a fabricated comparison (hard rule #1).
 */
export function computeLedgerComparison(listing: Listing): LedgerComparison | null {
  const cached = cache.get(listing.slug);
  if (cached !== undefined) return cached;
  const comparison = derive(listing);
  cache.set(listing.slug, comparison);
  return comparison;
}

function derive(listing: Listing): LedgerComparison | null {
  const { primaryElement, form } = listing;
  if (primaryElement === null || !catalogSymbols().has(primaryElement)) return null;
  // Only these two map 1:1 onto the records' form vocabulary (131 metal / 91
  // oxide rows); everything else has no comparable ledger population.
  if (form !== 'metal' && form !== 'oxide') return null;

  // Representative pack: the median variant by mass (lower-middle on even
  // counts). Variants are already sorted ascending by mass in the loader.
  const variant = listing.variants[Math.floor((listing.variants.length - 1) / 2)];
  const quantityKg = variant.massG / 1000;

  const result = estimatePrice(
    {
      symbol: primaryElement,
      form,
      purity: listing.purityPct !== null ? `${listing.purityPct}%` : null,
      quantityKg,
    },
    getPriceRecords(),
  );
  if (
    !result.sufficient ||
    result.low === null ||
    result.mid === null ||
    result.high === null ||
    result.mid <= 0
  ) {
    return null;
  }

  // cents/g → USD/kg: × 1000 (g → kg), ÷ 100 (cents → USD) = × 10. Unrounded;
  // rounding happens only at the serialise boundary.
  const listingPerKgUsd = (variant.priceUsdCents / variant.massG) * 10;

  const zone: LedgerZone =
    listingPerKgUsd >= result.low && listingPerKgUsd <= result.high
      ? 'within'
      : listingPerKgUsd < result.mid
        ? 'below'
        : 'above';

  return {
    elementSymbol: primaryElement,
    form,
    quantityKgBasis: quantityKg,
    variantLabelBasis: variant.label,
    listingPerKgUsd,
    ledgerLow: result.low,
    ledgerMid: result.mid,
    ledgerHigh: result.high,
    deltaVsMidPct: ((listingPerKgUsd - result.mid) / result.mid) * 100,
    zone,
    confidence: result.confidence,
    matchedRecords: result.basis.matchedRecords,
    matchMode: result.basis.matchMode,
  };
}
