/**
 * Build-time integrity assertions over the loaded marketplace files,
 * mirroring `lib/data/verify.ts`.
 *
 * Confirms the cross-file invariants the marketplace surfaces rely on:
 *   1. the listing count equals `settings.yml` `expected_listings` exactly,
 *      the count gate that turns a file dropped by a bad merge into a red CI
 *      run instead of a silently shrunken catalog (DESIGN §3.1 rule 36; bump
 *      `expected_listings` in the same diff as every import),
 *   2. seller handles are unique,
 *   3. every listing's seller resolves in `sellers.yml`.
 * A seller with zero listings only WARNS (an empty seller grid is a
 * legitimate state, DESIGN §3.1 rule 37).
 *
 * (2) and (3) are already fatal inside the loaders; they are re-asserted here
 * so the cross-file contract holds even if the per-file parsing ever changes.
 *
 * `assertMarketplaceIntegrity()` throws on any failure; `index.ts` runs it
 * once (memoised) on first accessor call, so a broken `_marketplace/` fails
 * `npm run build` loudly rather than silently shipping wrong pages. No test
 * framework is pulled in for this.
 */
import { computeCatalogAverages } from './catalog-average';
import { loadMarketplaceSettings, loadSellers } from './load';
import { loadListings } from './load-listings';

export interface MarketplaceVerifyReport {
  ok: boolean;
  errors: string[];
  counts: {
    listings: number;
    expectedListings: number;
    sellers: number;
    catalogAverageCells: number;
  };
}

export function verifyMarketplace(): MarketplaceVerifyReport {
  const settings = loadMarketplaceSettings();
  const sellers = loadSellers();
  const listings = loadListings();

  // Smoke-run the pure derivation too, so a statistics bug surfaces here, at
  // first access, rather than on the first page that renders a cell.
  const cells = computeCatalogAverages(listings, settings);

  const errors: string[] = [];

  if (listings.length !== settings.expectedListings) {
    errors.push(
      `expected ${settings.expectedListings} listings (settings.yml "expected_listings"), loaded ${listings.length}, bump expected_listings in _marketplace/settings.yml in the same diff as the listing files`,
    );
  }

  const handles = new Set<string>();
  for (const seller of sellers) {
    if (handles.has(seller.handle)) {
      errors.push(`duplicate seller handle "${seller.handle}" in sellers.yml`);
    }
    handles.add(seller.handle);
  }

  for (const listing of listings) {
    if (!handles.has(listing.sellerHandle)) {
      errors.push(
        `listing "${listing.slug}" references unknown seller "${listing.sellerHandle}"`,
      );
    }
  }

  const handlesWithListings = new Set(listings.map((l) => l.sellerHandle));
  for (const seller of sellers) {
    if (!handlesWithListings.has(seller.handle)) {
      console.warn(
        `[lib/marketplace] seller "${seller.handle}" has zero listings (allowed, the profile page renders an empty grid)`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: {
      listings: listings.length,
      expectedListings: settings.expectedListings,
      sellers: sellers.length,
      catalogAverageCells: cells.length,
    },
  };
}

export function assertMarketplaceIntegrity(): void {
  const report = verifyMarketplace();
  if (!report.ok) {
    throw new Error(
      `[lib/marketplace] marketplace integrity check failed:\n  - ${report.errors.join('\n  - ')}`,
    );
  }
}
