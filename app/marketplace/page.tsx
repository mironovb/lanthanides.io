/**
 * /marketplace/ — the Lanthanides Marketplace index (DESIGN §6.1, PLAN P5).
 *
 * SSG: every listing is read from `_marketplace/` at build time through
 * `lib/marketplace`, serialised to plain DTOs, and handed to the
 * `MarketplaceView` client island with all filters cleared, so the full grid
 * ships in the initial HTML (the RegulatoryView contract — the page works
 * without JavaScript).
 *
 * Honesty rules on this surface: the trust strip carries only derived-true
 * figures (0 / 19 documents renders as exactly that); the preliminary notice
 * states there is no checkout; and marketplace prices are labelled as the
 * seller's catalog — they never feed the price ledger and are never rendered
 * next to the site's sourced reference prices.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  getListings,
  getMarketplaceFacets,
  getSellers,
  toListingSummaryDto,
} from '@/lib/marketplace';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container, PageHeader } from '@/components/layout';
import { Callout, Stat, StatGrid } from '@/components/ui';
import { MarketplaceView } from '@/components/marketplace/MarketplaceView';
import {
  buildElementVariantMap,
  buildMarketplaceLabels,
} from '@/components/marketplace/server';

const DESCRIPTION =
  'Element samples and alloys from a verified seller — every listing published with its declared provenance, specifications, and pack-size prices. Preliminary: inquiries only, no checkout.';

export const metadata: Metadata = buildMetadata({
  title: 'Lanthanides Marketplace',
  description: DESCRIPTION,
  keywords:
    'buy rare earth metals, element samples, metal specimens, scandium metal, terbium metal, marketplace',
  path: '/marketplace/',
});

export default function MarketplacePage() {
  const listings = getListings();
  const dtos = listings.map(toListingSummaryDto);
  const facets = getMarketplaceFacets();
  const labels = buildMarketplaceLabels();
  const elementVariants = buildElementVariantMap();

  // Trust strip — every figure derived from the files, none seller-declared.
  const elementCount = new Set(listings.flatMap((l) => l.elements)).size;
  const withDocuments = listings.filter(
    (l) => (l.provenance.documents?.length ?? 0) > 0,
  ).length;
  const verifiedSellers = getSellers().filter((s) => s.verified).length;

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
          name: 'Lanthanides Marketplace',
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
        eyebrow="Preliminary"
        title="Lanthanides Marketplace"
        lead="Element samples and alloys from a verified seller — every listing published with its declared provenance, specifications, and pack-size prices."
      />

      <StatGrid cols={4} className="mt-8">
        <Stat label="Listings" value={listings.length} />
        <Stat
          label="Elements represented"
          value={elementCount}
          hint="Distinct chemical elements across all listings."
        />
        <Stat
          label="Documents on file"
          value={`${withDocuments} / ${listings.length}`}
          hint="Listings with at least one supporting provenance document."
        />
        <Stat label="Verified sellers" value={verifiedSellers} />
      </StatGrid>

      <Callout tone="info" className="mt-8">
        This marketplace is preliminary. There is no checkout: every listing
        links to a direct inquiry with the seller. Specifications and
        provenance are published as the seller declared them; items marked
        &ldquo;Verification pending&rdquo; have no supporting document on file
        yet.
      </Callout>

      <MarketplaceView
        listings={dtos}
        facets={{
          elements: facets.elements,
          categories: facets.categories,
          forms: facets.forms,
        }}
        labels={labels}
        elementVariants={elementVariants}
      />

      <p className="mt-12 max-w-prose border-t border-border pt-6 text-sm leading-relaxed text-fg-dim">
        Marketplace prices are the seller&rsquo;s own catalog prices. They are
        not part of the site&rsquo;s price ledger, never feed the sourced price
        records, and are never shown next to the site&rsquo;s reference data —
        see the{' '}
        <Link
          href="/methodology/"
          className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
        >
          methodology
        </Link>{' '}
        and{' '}
        <Link
          href="/about/"
          className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
        >
          about
        </Link>{' '}
        pages for how the two are kept separate. The seed catalog is operated
        by the site&rsquo;s founder.
      </p>
    </Container>
  );
}
