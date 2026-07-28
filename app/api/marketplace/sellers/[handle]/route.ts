/**
 * GET /api/marketplace/sellers/[handle] (DESIGN §5.3): the seller profile
 * DTO — identity, verification basis, seller-declared claims (structurally
 * separate from the derived, true-by-construction stats so a consumer cannot
 * conflate "~10,000 transactions" with a computed figure), and the seller's
 * listing summaries newest-first.
 *
 * Pre-rendered at build over the known handles (generateStaticParams +
 * dynamicParams=false) — the export route's static pattern; the handle set
 * only changes on a rebuild.
 */
import {
  getLedgerComparisonForListing,
  getSeller,
  getSellerListings,
  getSellers,
  IMAGE_LICENSE,
  toSellerDto,
} from '@/lib/marketplace';
import { json } from '../../http';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): Array<{ handle: string }> {
  return getSellers().map((seller) => ({ handle: seller.handle }));
}

export function GET(
  _request: Request,
  { params }: { params: { handle: string } },
): Response {
  const seller = getSeller(params.handle);
  if (seller === null) {
    // Unreachable under dynamicParams=false, but explicit for safety —
    // mirrors the export route's unreachable branch.
    return json({ error: `Unknown seller "${params.handle}".` }, 404);
  }
  // `image_license` rides at the envelope level: the avatar and the listing
  // summaries' photos are the seller's, not CC-BY, and SellerDto itself
  // carries no licence field.
  return json(
    {
      ...toSellerDto(seller, getSellerListings(seller.handle), getLedgerComparisonForListing),
      image_license: IMAGE_LICENSE,
    },
    200,
    'public, max-age=3600',
  );
}
