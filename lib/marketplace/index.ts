/**
 * Public marketplace accessors over `_marketplace/`: the surface every page
 * and route handler uses. Read-only; SSG-friendly (all reads are build-time
 * file reads, memoised per process by the loaders).
 *
 * Integrity is checked once, lazily, on first access: each accessor calls
 * `ensureMarketplaceIntegrity()`, which runs `assertMarketplaceIntegrity()` a
 * single time and throws if the files violate their invariants, so a broken
 * `_marketplace/` fails `npm run build` rather than rendering wrong pages —
 * exactly the `ensureVerified()` arrangement in `lib/data/index.ts`.
 *
 * Server-only (transitively uses `fs`): import from Server Components / route
 * handlers, never from a Client Component. Client islands receive plain
 * serialised DTOs (`./serialize`) as props instead.
 */
import { getElements } from '../data';
import {
  computeCatalogAverages,
  getCatalogAverageFor,
  isCatalogAverageEligible,
} from './catalog-average';
import { loadMarketplaceSettings, loadSellers, once } from './load';
import { loadListings } from './load-listings';
import type {
  CatalogAverageCell,
  CatalogAverageHint,
  Listing,
  MarketplaceFacets,
  MarketplaceSettings,
  Seller,
} from './types';
import { LISTING_CATEGORIES, LISTING_SHAPES, MATERIAL_FORMS } from './types';
import { assertMarketplaceIntegrity } from './verify';

export type * from './types';
// The enum vocabularies are values, not types, so `export type *` misses them;
// re-exported here so API handlers can build `{ error, allowed }` bodies from
// one import surface.
export {
  DOCUMENT_KINDS,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_SHAPES,
  LISTING_STATUSES,
  MATERIAL_CATEGORIES,
  MATERIAL_FORMS,
  PROVENANCE_SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from './types';
export * from './serialize';
export { isCatalogAverageEligible } from './catalog-average';

// Run the integrity assertions exactly once, on first marketplace access.
const ensureMarketplaceIntegrity = (() => {
  let done = false;
  return () => {
    if (!done) {
      assertMarketplaceIntegrity();
      done = true;
    }
  };
})();

/**
 * Listings with `catalogElements` decorated: `elements` ∩ the site's element
 * catalog. This is the ONLY cross-import from `lib/data`, and it is a
 * NAVIGATION join, nothing more — a symbol intersection so listing pages can
 * cross-link `/elements/<Sym>/` and reuse the regulatory badge for symbols
 * the site actually covers. Price data never crosses between the modules in
 * either direction: marketplace prices never feed the ledger, and the site's
 * sourced reference prices are never rendered next to marketplace prices
 * (DESIGN §4.3 / Q2).
 */
const decoratedListings = once<Listing[]>(() => {
  const catalogSymbols = new Set(getElements().map((e) => e.symbol));
  return loadListings().map((listing) => ({
    ...listing,
    catalogElements: listing.elements.filter((sym) => catalogSymbols.has(sym)),
  }));
});

const listingBySlug = once<Map<string, Listing>>(
  () => new Map(decoratedListings().map((l) => [l.slug, l])),
);

// ── Settings & sellers ───────────────────────────────────────────────────────

export function getMarketplaceSettings(): MarketplaceSettings {
  ensureMarketplaceIntegrity();
  return loadMarketplaceSettings();
}

export function getSellers(): Seller[] {
  ensureMarketplaceIntegrity();
  return loadSellers();
}

/** Null on an unknown handle (mirrors `getArticleContent`). */
export function getSeller(handle: string): Seller | null {
  ensureMarketplaceIntegrity();
  return loadSellers().find((s) => s.handle === handle) ?? null;
}

// ── Listings ─────────────────────────────────────────────────────────────────

/** All listings, newest-first (updated_at desc, listed_on desc, slug asc). */
export function getListings(): Listing[] {
  ensureMarketplaceIntegrity();
  return decoratedListings();
}

/** Null on an unknown slug (mirrors `getArticleContent`). Case-sensitive. */
export function getListing(slug: string): Listing | null {
  ensureMarketplaceIntegrity();
  return listingBySlug().get(slug) ?? null;
}

/** For `generateStaticParams` on `/marketplace/[slug]/` and the static API route. */
export function getListingSlugs(): string[] {
  ensureMarketplaceIntegrity();
  return decoratedListings().map((l) => l.slug);
}

export function getSellerListings(handle: string): Listing[] {
  ensureMarketplaceIntegrity();
  return decoratedListings().filter((l) => l.sellerHandle === handle);
}

/**
 * Listings containing `symbol` (case-sensitive, full periodic table — pass a
 * catalog symbol to power the `/elements/<Sym>/` cross-link block).
 */
export function getListingsByElement(symbol: string): Listing[] {
  ensureMarketplaceIntegrity();
  return decoratedListings().filter((l) => l.elements.includes(symbol));
}

// ── Facets ───────────────────────────────────────────────────────────────────

/**
 * Filter options derived from what is actually listed. `elements` puts
 * catalog members first in catalog order, then the rest alphabetically
 * (types.ts contract); `priceRangeCents` spans `priceFromCents`, matching the
 * basis the listings API filters and sorts on (PLAN P4), so the filter UI and
 * the endpoint can never disagree about bounds.
 */
export function getMarketplaceFacets(): MarketplaceFacets {
  ensureMarketplaceIntegrity();
  const listings = decoratedListings();

  const present = new Set(listings.flatMap((l) => l.elements));
  const catalogSymbols = getElements().map((e) => e.symbol);
  const catalogSet = new Set(catalogSymbols);
  const elements = [
    ...catalogSymbols.filter((sym) => present.has(sym)),
    ...[...present].filter((sym) => !catalogSet.has(sym)).sort(),
  ];

  const prices = listings.map((l) => l.priceFromCents);
  return {
    elements,
    categories: LISTING_CATEGORIES.filter((c) => listings.some((l) => l.category === c)),
    forms: MATERIAL_FORMS.filter((f) => listings.some((l) => l.form === f)),
    shapes: LISTING_SHAPES.filter((s) => listings.some((l) => l.shape === s)),
    priceRangeCents:
      prices.length === 0 ? null : { min: Math.min(...prices), max: Math.max(...prices) },
  };
}

// ── Catalog averages ─────────────────────────────────────────────────────────

/**
 * All publishable (element × form) cells — cells under
 * `catalogAverageMinVariants` are omitted entirely (DESIGN §5.4).
 */
export function getCatalogAverages(): CatalogAverageCell[] {
  ensureMarketplaceIntegrity();
  return computeCatalogAverages(decoratedListings(), loadMarketplaceSettings());
}

/**
 * The leave-one-out comparison hint for one listing's detail page (DESIGN
 * §4.5). An ineligible listing (§4.2 — placeholder, multi-element, form-less,
 * author-excluded, or sold out) gets the empty hint: no cell, no comparison.
 */
export function getCatalogAverageForListing(listing: Listing): CatalogAverageHint {
  ensureMarketplaceIntegrity();
  if (
    !isCatalogAverageEligible(listing) ||
    listing.primaryElement === null ||
    listing.form === null
  ) {
    return { cell: null, otherListingCount: 0, sufficientForComparison: false };
  }
  return getCatalogAverageFor(
    decoratedListings(),
    loadMarketplaceSettings(),
    listing.primaryElement,
    listing.form,
    listing.slug,
  );
}
