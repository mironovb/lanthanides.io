/**
 * GET /api/marketplace/price-reference (DESIGN §5.4): the per-(element ×
 * form) seller-catalog per-gram statistics. The path is fixed by the brief;
 * the payload refuses the implication — it leads with `basis:
 * "seller_catalog"` and a disclaimer, because these are one seller's catalog
 * statistics with pack sizes pooled, NOT the site's sourced reference prices.
 * Cells below `catalog_average_min_variants` are omitted entirely by
 * `getCatalogAverages()` so a consumer cannot render a thin "average" from
 * our own API.
 *
 * force-static, no parameters: a single derived document (an `?element=`
 * filter was considered and rejected — DESIGN §5.4). Fully CC-BY: it contains
 * no seller photographs. `generated_at` is the max `updated_at` across
 * listings — a real data date, never build-time now().
 */
import {
  getCatalogAverages,
  getListings,
  getMarketplaceSettings,
  getSellers,
  toCatalogAverageCellDto,
} from '@/lib/marketplace';
import { json } from '../http';

export const dynamic = 'force-static';

/** DESIGN §5.4's disclaimer, extended with the pack-size-pooling disclosure. */
const DISCLAIMER =
  "These are averages of this marketplace's own listing prices — one seller's catalog statistics, with pack sizes pooled within each element × form cell, not a market survey. They are NOT the site's sourced reference prices (see /api/export/json/ and /methodology/). Retail specimen prices and industrial ledger quotes are different populations and must not be compared or converted into one another.";

export function GET(): Response {
  const settings = getMarketplaceSettings();

  // Derived, not hardcoded, so the sentence stays true as sellers change.
  const handles = getSellers().map((seller) => seller.handle);
  const sellerClause =
    handles.length === 1
      ? `one seller: ${handles[0]}`
      : `${handles.length} sellers: ${handles.join(', ')}`;
  const scope = `Averages computed from listings published on the lanthanides.io marketplace. Currently ${sellerClause}.`;

  // Max updated_at across all listings (ISO dates compare lexicographically).
  // The loader rejects an empty listings dir, so this is never null in a
  // build that passed integrity.
  let generatedAt: string | null = null;
  for (const listing of getListings()) {
    if (generatedAt === null || listing.updatedAt > generatedAt) generatedAt = listing.updatedAt;
  }

  return json(
    {
      basis: 'seller_catalog',
      scope,
      disclaimer: DISCLAIMER,
      unit: 'usd_cents_per_gram',
      statistic: 'median (headline) and arithmetic mean, per element × form; pack sizes pooled',
      min_variants_per_cell: settings.catalogAverageMinVariants,
      comparison_min_sample: settings.catalogAverageMinSample,
      generated_at: generatedAt,
      cells: getCatalogAverages().map(toCatalogAverageCellDto),
    },
    200,
    'public, max-age=3600',
  );
}
