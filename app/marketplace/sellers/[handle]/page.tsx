/**
 * /marketplace/sellers/[handle]/, seller profile.
 *
 * SSG over the seller handles, `dynamicParams = false`. Identity header
 * (avatar, name, Verified badge, country, member-since, tagline), the seller
 * bio, one StatGrid (the seller's stated history from `sellers.yml` alongside
 * the file-derived listing and element counts), and the listings grid, a
 * plain server render, no island: the catalog is small and /marketplace/ is
 * the filterable surface.
 */
import type { Metadata } from 'next';

import {
  getLedgerComparisonForListing,
  getSeller,
  getSellers,
  getSellerListings,
  toListingSummaryDto,
} from '@/lib/marketplace';
import { formatDate } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container } from '@/components/layout';
import {
  Badge,
  Breadcrumbs,
  Chip,
  SectionHeading,
  Stat,
  StatGrid,
} from '@/components/ui';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceProse } from '@/components/marketplace/MarketplaceProse';
import { SellerAvatarImage } from '@/components/marketplace/SellerAvatarImage';
import { countryDisplay } from '@/components/marketplace/marketplace';
import {
  buildElementVariantMap,
  buildMarketplaceLabels,
} from '@/components/marketplace/server';

type Params = { handle: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getSellers().map((s) => ({ handle: s.handle }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const seller = getSeller(params.handle);
  if (!seller) return {};
  return buildMetadata({
    title: seller.displayName,
    description: seller.tagline,
    path: `/marketplace/sellers/${seller.handle}/`,
    image: seller.avatar.path,
    imageAlt: seller.avatar.alt,
  });
}

export default function SellerProfilePage({ params }: { params: Params }) {
  const seller = getSeller(params.handle);
  if (!seller) notFound();

  const listings = getSellerListings(seller.handle);
  const labels = buildMarketplaceLabels();
  const elementVariants = buildElementVariantMap();
  const url = `/marketplace/sellers/${seller.handle}/`;

  const elementCount = new Set(listings.flatMap((l) => l.elements)).size;
  const statCount = seller.declaredClaims.length + 2;

  return (
    <Container as="main" className="py-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: seller.displayName,
          url: abs(url),
          logo: abs(seller.avatar.path),
          description: seller.tagline,
          address: { '@type': 'PostalAddress', addressCountry: seller.country },
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Marketplace', path: '/marketplace/' },
          { name: seller.displayName },
        ]}
      />
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: 'Marketplace', href: '/marketplace/' },
          { label: seller.displayName },
        ]}
      />

      {/* ── Identity header ────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-5 border-b border-border-strong pb-6 sm:flex-row sm:items-start">
        <SellerAvatarImage avatar={seller.avatar} className="h-20 w-20" />
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-fg">
            {seller.displayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {seller.verified ? <Badge variant="accent">Verified</Badge> : null}
            <Chip>{countryDisplay(seller.country)}</Chip>
            <span className="text-xs text-fg-dim">
              Member since {formatDate(seller.memberSince)}
            </span>
          </div>
          <p className="mt-3 max-w-prose text-md leading-relaxed text-fg-muted">
            {seller.tagline}
          </p>
        </div>
      </header>

      {/* ── Bio (seller's own voice) ───────────────────────────────────── */}
      {seller.bio ? (
        <section className="mt-8">
          <SectionHeading title="About this seller" />
          <MarketplaceProse className="mt-4">{seller.bio}</MarketplaceProse>
        </section>
      ) : null}

      {/* ── Seller stats ───────────────────────────────────────────────── */}
      <StatGrid
        cols={statCount >= 5 ? 5 : statCount >= 4 ? 4 : statCount >= 3 ? 3 : 2}
        className="mt-8"
      >
        {seller.declaredClaims.map((claim) => (
          <Stat key={claim.label} label={claim.label} value={claim.value} />
        ))}
        <Stat label="Listings" value={listings.length} />
        <Stat label="Elements" value={elementCount} />
      </StatGrid>

      {/* ── Listings ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading title="Listings" count={listings.length} />
        {listings.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
            {listings.map((l) => (
              <ListingCard
                key={l.slug}
                dto={toListingSummaryDto(l, getLedgerComparisonForListing(l))}
                labels={labels}
                elementVariants={elementVariants}
              />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-fg-dim">
            No listings published yet.
          </p>
        )}
      </section>
    </Container>
  );
}
