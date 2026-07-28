/**
 * GET /api/marketplace/listings (DESIGN §5.1, amended by PLAN "Schema
 * deltas"): the filterable, sortable, paginated feed of listing summaries,
 * read-only over `lib/marketplace`. Price filtering and sorting operate on
 * `price_from_cents` — the cheapest variant, the actual "from" price a buyer
 * sees — and placeholder-status listings are excluded unless
 * `?include=placeholder`. A bare request is page 1 of everything.
 *
 * Responses:
 *   200: { query, pagination, image_license, results } — the resolved query
 *        echoed back (price-gauge's `{ query, ...result }` habit); an empty
 *        result set is 200 with `results: []`, never a 404
 *   400: unknown category / form / sort / include (with `allowed`), or a bad
 *        min_price / max_price / q / page / per_page
 *   404: unknown element
 *
 * Dynamic + Node runtime: it reads `searchParams`, so it cannot be statically
 * optimised, and it transitively touches `fs` via `lib/marketplace`, so it
 * cannot run on the edge — identical reasoning to /api/price-gauge. The
 * underlying files only change on a rebuild, so 200s take a short public
 * cache.
 */
import {
  getLedgerComparisonForListing,
  getListings,
  getMarketplaceFacets,
  IMAGE_LICENSE,
  LISTING_CATEGORIES,
  MATERIAL_FORMS,
  toListingSummaryDto,
} from '@/lib/marketplace';
import { CORS, json } from '../http';
import { applyListingsQuery, validateListingsParams } from '../params';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const v = validateListingsParams(
    {
      element: searchParams.get('element'),
      category: searchParams.get('category'),
      form: searchParams.get('form'),
      min_price: searchParams.get('min_price'),
      max_price: searchParams.get('max_price'),
      q: searchParams.get('q'),
      sort: searchParams.get('sort'),
      page: searchParams.get('page'),
      per_page: searchParams.get('per_page'),
      include: searchParams.get('include'),
    },
    {
      // Resolve `element` against the symbols actually present in listings
      // (canonical case), not the site's 31-element catalog — the store sells
      // beyond it (PLAN "Schema deltas").
      knownSymbols: getMarketplaceFacets().elements,
      categories: LISTING_CATEGORIES,
      forms: MATERIAL_FORMS,
    },
  );
  if (!v.ok) return json(v.body, v.status);

  const { pagination, results } = applyListingsQuery(
    getListings().map((l) => toListingSummaryDto(l, getLedgerComparisonForListing(l))),
    v.query,
  );
  // `image_license` rides at the envelope level: the summary DTOs carry image
  // paths but no licence field, and the photos are the seller's, not CC-BY.
  return json(
    { query: v.query, pagination, image_license: IMAGE_LICENSE, results },
    200,
    'public, max-age=300',
  );
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}
