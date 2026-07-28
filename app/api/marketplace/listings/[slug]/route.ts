/**
 * GET /api/marketplace/listings/[slug] (DESIGN §5.2): one listing's full
 * detail DTO — variants, specs, images, the embedded provenance record, the
 * seller card, and the leave-one-out catalog-average hint (which serialises
 * to `null` for ineligible listings and `sufficient: false` for thin cells —
 * never a padded figure).
 *
 * Pre-rendered at build for every listing (generateStaticParams +
 * dynamicParams=false), mirroring the export route: each listing's JSON is a
 * static file on the CDN, so the API can never disagree with the page. The
 * DTO itself carries `image_license` — the photographs are the seller's, not
 * CC-BY.
 */
import {
  getCatalogAverageForListing,
  getListing,
  getListingSlugs,
  getSeller,
  toListingDetailDto,
} from '@/lib/marketplace';
import { json } from '../../http';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getListingSlugs().map((slug) => ({ slug }));
}

export function GET(
  _request: Request,
  { params }: { params: { slug: string } },
): Response {
  const listing = getListing(params.slug);
  const seller = listing === null ? null : getSeller(listing.sellerHandle);
  if (listing === null || seller === null) {
    // Unreachable under dynamicParams=false (and the seller FK is asserted by
    // assertMarketplaceIntegrity at load), but explicit for safety — mirrors
    // the export route's unreachable "Unsupported export format" branch.
    return json({ error: `Unknown listing "${params.slug}".` }, 404);
  }
  return json(
    toListingDetailDto(listing, seller, getCatalogAverageForListing(listing)),
    200,
    'public, max-age=3600',
  );
}
