/**
 * /marketplace/, the marketplace index.
 *
 * SSG: every listing is read from `_marketplace/` at build time through
 * `lib/marketplace`, serialised to plain DTOs, and handed to the
 * `MarketplaceView` client island with all filters cleared, so the full grid
 * ships in the initial HTML (the RegulatoryView contract, the page works
 * without JavaScript).
 *
 * Masthead: serif H1, one-line lead, and a single quiet mono meta-line whose
 * figures are derived live from the files; beneath it the sellers rail, then
 * the filterable grid. Marketplace prices never mix with the ledger's
 * reference dataset, the closing line states the separation.
 */
import type { Metadata } from 'next';

import {
  getLedgerComparisonForListing,
  getListings,
  getMarketplaceFacets,
  getSellerListings,
  getSellers,
  toListingSummaryDto,
} from '@/lib/marketplace';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container, PageHeader } from '@/components/layout';
import { MarketplaceView } from '@/components/marketplace/MarketplaceView';
import { SellerRail } from '@/components/marketplace/SellerRail';
import {
  buildElementVariantMap,
  buildMarketplaceLabels,
} from '@/components/marketplace/server';

const DESCRIPTION =
  'Element samples, alloys, and specimen materials from verified sellers. Every listing shows its provenance, specifications, and pack prices.';

export const metadata: Metadata = buildMetadata({
  title: 'Marketplace',
  description: DESCRIPTION,
  keywords:
    'buy rare earth metals, element samples, metal specimens, scandium metal, terbium metal, marketplace',
  path: '/marketplace/',
});

export default function MarketplacePage() {
  const listings = getListings();
  const dtos = listings.map((l) =>
    toListingSummaryDto(l, getLedgerComparisonForListing(l)),
  );
  const facets = getMarketplaceFacets();
  const labels = buildMarketplaceLabels();
  const elementVariants = buildElementVariantMap();

  const sellers = getSellers();
  const railSellers = sellers.map((s) => ({
    handle: s.handle,
    displayName: s.displayName,
    country: s.country,
    verified: s.verified,
    listingCount: getSellerListings(s.handle).length,
    avatar: s.avatar,
  }));

  // The masthead meta-line: derived live, never hardcoded.
  const elementCount = new Set(listings.flatMap((l) => l.elements)).size;
  const metaLine = [
    `${listings.length} listing${listings.length === 1 ? '' : 's'}`,
    `${elementCount} element${elementCount === 1 ? '' : 's'}`,
    `${sellers.length} seller${sellers.length === 1 ? '' : 's'}`,
  ].join(' · ');

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Marketplace', path: '/marketplace/' },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Marketplace',
          url: abs('/marketplace/'),
          description: DESCRIPTION,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: dtos.length,
            itemListElement: dtos.map((dto, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: abs(dto.url),
            })),
          },
        }}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Marketplace' }]}
        title="Marketplace"
        lead="Element samples, alloys, and specimen materials from verified sellers. Every listing shows its provenance, specifications, and pack prices."
      >
        <p className="mt-4 font-mono text-xs tabular-nums text-fg-dim">
          {metaLine}
        </p>
      </PageHeader>

      <SellerRail sellers={railSellers} />

      <MarketplaceView
        listings={dtos}
        facets={{
          elements: facets.elements,
          categories: facets.categories,
        }}
        labels={labels}
        elementVariants={elementVariants}
      />

      <p className="mt-12 max-w-prose border-t border-border pt-6 text-sm leading-relaxed text-fg-dim">
        Marketplace listings are catalog offers from independent sellers; the
        ledger&rsquo;s reference dataset is separate.
      </p>
    </Container>
  );
}
