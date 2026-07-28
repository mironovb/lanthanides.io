/**
 * /marketplace/sellers/[handle]/ — seller profile (DESIGN §6.3, PLAN P5).
 *
 * SSG over the seller handles, `dynamicParams = false`. The page keeps two
 * kinds of numbers structurally apart: the StatGrid carries only figures
 * derived from files in this repo (listing counts, documents on file, latest
 * update), while the seller's own history ("~6 years", "~10,000 transactions")
 * lives in a visually quieter "Seller-declared" card with an explicit
 * not-independently-verified footnote — never as a Stat.
 *
 * The listings grid here is a plain server render — no island, no JS: the
 * catalog is small and /marketplace/ is the filterable surface.
 */
import type { Metadata } from 'next';

import {
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
  Callout,
  Card,
  Chip,
  SectionHeading,
  Stat,
  StatGrid,
  Tooltip,
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

  // Derived, true-by-construction figures (counts over files in the repo).
  const elementCount = new Set(listings.flatMap((l) => l.elements)).size;
  const withDocuments = listings.filter(
    (l) => (l.provenance.documents?.length ?? 0) > 0,
  ).length;
  let latestUpdatedAt: string | null = null;
  for (const l of listings) {
    if (latestUpdatedAt === null || l.updatedAt > latestUpdatedAt) {
      latestUpdatedAt = l.updatedAt;
    }
  }

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
            {seller.verified ? (
              <Tooltip
                label={seller.verificationBasis ?? 'Verified by the site operator.'}
              >
                <Badge variant="accent">Verified</Badge>
              </Tooltip>
            ) : null}
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

      {/* ── Derived catalog stats — provable figures only ──────────────── */}
      <section className="mt-8">
        <SectionHeading
          title="Catalog"
          description="Every figure below is derived from the published listing files."
        />
        <StatGrid cols={4} className="mt-4">
          <Stat label="Listings" value={listings.length} />
          <Stat
            label="Elements"
            value={elementCount}
            hint="Distinct chemical elements across this seller's listings."
          />
          <Stat
            label="Documents on file"
            value={`${withDocuments} / ${listings.length}`}
            hint="Listings with at least one supporting provenance document."
          />
          <Stat
            label="Most recent update"
            value={latestUpdatedAt ? formatDate(latestUpdatedAt) : '—'}
          />
        </StatGrid>
      </section>

      {/* ── Seller-declared: quieter by design, never a Stat ───────────── */}
      {seller.declaredClaims.length > 0 ? (
        <Card as="section" className="mt-8 max-w-xl">
          <h2 className="font-serif text-base font-semibold text-fg">
            Seller-declared
          </h2>
          <dl className="mt-3 space-y-1.5">
            {seller.declaredClaims.map((claim) => (
              <div
                key={claim.label}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <dt className="text-fg-dim">{claim.label}</dt>
                <dd className="font-mono tabular-nums text-fg-muted">
                  {claim.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fg-dim">
            Stated by the seller and not independently verified by this site.
          </p>
        </Card>
      ) : null}

      {/* ── What "Verified" covers ─────────────────────────────────────── */}
      {seller.verified && seller.verificationBasis ? (
        <Callout
          tone="note"
          title={'What “Verified” covers'}
          className="mt-8"
        >
          <p>{seller.verificationBasis}</p>
        </Callout>
      ) : null}

      {/* ── Listings ───────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading title="Listings" count={listings.length} />
        {listings.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
            {listings.map((l) => (
              <ListingCard
                key={l.slug}
                dto={toListingSummaryDto(l)}
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
