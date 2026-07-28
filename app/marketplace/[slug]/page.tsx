/**
 * /marketplace/[slug]/ — listing detail.
 *
 * SSG over every listing slug, `dynamicParams = false` (unknown slugs are the
 * framework 404), mirroring /elements/[symbol]. Two-column top on lg: the
 * photograph column beside the price and origin panels — origin & provenance
 * sits immediately after price, before the description.
 *
 * Signature elements: the ledger position strip (the listing's per-kg price
 * placed on the sourced ledger's retail band — marker colour encodes price
 * position) and the pack-size price ladder — a hairline per-row bar in the
 * Per-gram column scaled within the listing, so the quantity-discount curve
 * is visible at a glance. Pure CSS widths, no motion.
 *
 * The seller-catalog median comparison renders only when its leave-one-out
 * sample is sufficient. Product JSON-LD carries an AggregateOffer spanning
 * the variant price range.
 */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getElementBySymbol } from '@/lib/data';
import {
  CATALOG_AVERAGE_DISCLAIMER,
  getCatalogAverageForListing,
  getLedgerComparisonForListing,
  getListing,
  getListingSlugs,
  getMarketplaceSettings,
  getSeller,
  getSellerListings,
  toListingDetailDto,
  toListingSummaryDto,
} from '@/lib/marketplace';
import { capitalize, formatDate } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container } from '@/components/layout';
import {
  Badge,
  Breadcrumbs,
  Callout,
  Card,
  Chip,
  LinkButton,
  Panel,
  SectionHeading,
  Stat,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tooltip,
} from '@/components/ui';
import { REGULATORY_BADGE } from '@/components/elements/categories';
import { InquiryForm } from '@/components/marketplace/InquiryForm';
import { LedgerPositionStrip } from '@/components/marketplace/LedgerPositionStrip';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceProse } from '@/components/marketplace/MarketplaceProse';
import { SellerAvatarImage } from '@/components/marketplace/SellerAvatarImage';
import {
  countryDisplay,
  fmtCents,
  fmtMassRange,
  fmtMonthYear,
  fmtPerGram,
} from '@/components/marketplace/marketplace';
import {
  buildElementVariantMap,
  buildMarketplaceLabels,
} from '@/components/marketplace/server';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getListingSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const listing = getListing(params.slug);
  if (!listing) return {};
  return buildMetadata({
    title: listing.title,
    description: listing.summary,
    path: listing.url,
    image: listing.primaryImage.path,
    imageAlt: listing.primaryImage.alt,
    ...(listing.status === 'placeholder' ? { noindex: true } : {}),
  });
}

/** "2024-08" stays verbatim (formatDate would invent a day); full ISO formats; null → "—". */
function acquiredDisplay(acquiredOn: string | null): string {
  if (acquiredOn === null) return '—';
  return /^\d{4}-\d{2}$/.test(acquiredOn) ? acquiredOn : formatDate(acquiredOn);
}

const DOC_IMAGE_RE = /\.(jpe?g|png|webp|svg)$/i;

export default function ListingDetailPage({ params }: { params: Params }) {
  const listing = getListing(params.slug);
  if (!listing) notFound();
  const seller = getSeller(listing.sellerHandle);
  if (!seller) notFound();

  const settings = getMarketplaceSettings();
  const labels = buildMarketplaceLabels();
  const elementVariants = buildElementVariantMap();
  const hint = getCatalogAverageForListing(listing);
  const detailDto = toListingDetailDto(
    listing,
    seller,
    hint,
    getLedgerComparisonForListing(listing),
  );
  const ledgerComparison = detailDto.ledger_comparison;

  const gallery = [
    listing.primaryImage,
    ...listing.images
      .filter((img) => !img.isPrimary)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  ];
  const notedVariants = listing.variants.filter((v) => v.note !== null);
  const maxPerGram = Math.max(
    ...listing.variants.map((v) => v.pricePerGramCents),
  );
  const maxPriceCents = Math.max(
    ...listing.variants.map((v) => v.priceUsdCents),
  );

  const sellerUrl = `/marketplace/sellers/${seller.handle}/`;
  const moreFromSeller = getSellerListings(seller.handle)
    .filter((l) => l.slug !== listing.slug)
    .slice(0, 6);

  const sourceTypeLabel = labels.sourceTypes[listing.provenance.sourceType];
  const documents = listing.provenance.documents ?? [];

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.summary,
    image: gallery.map((img) => abs(img.path)),
    sku: listing.slug,
    url: abs(listing.url),
    brand: {
      '@type': 'Organization',
      name: seller.displayName,
      url: abs(sellerUrl),
    },
    // One honest weight only when the listing has a single size; a range is
    // not a weight, so it is omitted for multi-size listings.
    ...(listing.massMinG === listing.massMaxG
      ? {
          weight: {
            '@type': 'QuantitativeValue',
            value: listing.massMinG,
            unitCode: 'GRM',
          },
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: (listing.priceFromCents / 100).toFixed(2),
      highPrice: (maxPriceCents / 100).toFixed(2),
      offerCount: listing.variants.length,
      seller: {
        '@type': 'Organization',
        name: seller.displayName,
        url: abs(sellerUrl),
      },
    },
    additionalProperty: listing.specs.map((spec) => ({
      '@type': 'PropertyValue',
      name: spec.label,
      value: spec.unit ? `${spec.value} ${spec.unit}` : spec.value,
    })),
  };

  return (
    <Container as="main" className="py-10">
      <JsonLd data={productLd} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Marketplace', path: '/marketplace/' },
          { name: listing.title },
        ]}
      />
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: 'Marketplace', href: '/marketplace/' },
          { label: listing.title },
        ]}
      />

      {/* ── Header: title + badge row ──────────────────────────────────── */}
      <header className="mb-8 border-b border-border-strong pb-6">
        <h1 className="max-w-prose font-serif text-3xl font-semibold leading-tight text-fg">
          {listing.title}
        </h1>
        <p className="mt-2 max-w-prose text-md leading-relaxed text-fg-muted">
          {listing.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {listing.elements.map((sym) => {
            const element = listing.catalogElements.includes(sym)
              ? getElementBySymbol(sym)
              : null;
            if (!element) {
              return <Badge key={sym}>{sym}</Badge>;
            }
            return (
              <span key={sym} className="inline-flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={element.category}
                  href={`/elements/${element.symbol}/`}
                  title={`${element.name} on the price ledger`}
                >
                  {element.symbol} · {element.name}
                </Badge>
                {element.regulatory_status !== 'none' ? (
                  <Badge variant={element.regulatory_status} href="/regulatory/">
                    {REGULATORY_BADGE[element.regulatory_status].label}
                  </Badge>
                ) : null}
              </span>
            );
          })}
          <Chip>{labels.categories[listing.category]}</Chip>
          {listing.condition !== null ? (
            <Chip>{capitalize(listing.condition)}</Chip>
          ) : null}
          {listing.stockUnits === 0 ? <Chip>Sold / out of stock</Chip> : null}
        </div>
      </header>

      {/* ── Two-column top: photographs | price + origin ───────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Photographs">
          <div className="space-y-4">
            {gallery.map((img) => (
              <figure
                key={img.path}
                className="overflow-hidden rounded-md border border-border bg-white"
              >
                <a href={img.path} className="block">
                  <Image
                    src={img.path}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    sizes="(max-width: 1023px) 100vw, 560px"
                    priority={img.isPrimary}
                    className="aspect-[4/3] h-auto w-full object-cover"
                  />
                </a>
                {img.caption ? (
                  <figcaption className="border-t border-border px-3 py-2 text-xs text-fg-dim">
                    {img.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {/* ── Price: from-price, ledger position, pack-size ladder ───── */}
          <Panel title="Price">
            {/* Stat emits dt/dd; the dl wrapper keeps the markup valid. */}
            <dl>
              <Stat
                size="lg"
                label="From"
                value={fmtCents(listing.priceFromCents)}
                hint={`${listing.variants.length} size${
                  listing.variants.length === 1 ? '' : 's'
                } · ${fmtMassRange(listing.massMinG, listing.massMaxG)}`}
              />
            </dl>

            {ledgerComparison ? (
              <LedgerPositionStrip comparison={ledgerComparison} />
            ) : null}

            <Table bordered={false} className="mt-4">
              <THead>
                <TR hover={false}>
                  <TH>Size</TH>
                  <TH numeric>Mass (g)</TH>
                  <TH numeric>Price</TH>
                  <TH numeric>Per gram</TH>
                </TR>
              </THead>
              <TBody>
                {listing.variants.map((v) => {
                  const barPct = Math.max(
                    3,
                    Math.round((v.pricePerGramCents / maxPerGram) * 100),
                  );
                  return (
                    <TR key={v.legacySku}>
                      <TD className="text-fg">
                        {v.label}
                        {v.note !== null ? ' *' : ''}
                      </TD>
                      <TD numeric>
                        {v.massG.toLocaleString('en-US', {
                          maximumFractionDigits: 2,
                        })}
                      </TD>
                      <TD numeric>{fmtCents(v.priceUsdCents)}</TD>
                      <TD numeric className="min-w-[8rem]">
                        {fmtPerGram(v.pricePerGramCents)}
                        <span className="text-fg-dim">/g</span>
                        {/* Pack-size ladder: hairline bar scaled within this
                            listing; the number above carries the value. */}
                        <span
                          aria-hidden="true"
                          className="mt-1 block h-1 border-l-2 border-accent bg-accent/10"
                          style={{ width: `${barPct}%` }}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            {notedVariants.length > 0 ? (
              <div className="mt-2 space-y-1">
                {notedVariants.map((v) => (
                  <p key={v.legacySku} className="text-xs text-fg-dim">
                    * {v.label} — {v.note}
                  </p>
                ))}
              </div>
            ) : null}

            {/* Seller-catalog median comparison: renders only when the
                leave-one-out sample clears the threshold. */}
            {hint.sufficientForComparison && hint.cell ? (
              <p className="mt-3 text-xs text-fg-muted">
                <Tooltip label={CATALOG_AVERAGE_DISCLAIMER}>
                  Seller catalog median
                </Tooltip>{' '}
                for {hint.cell.elementSymbol}{' '}
                {settings.formLabels[hint.cell.form].toLowerCase()}:{' '}
                <span className="font-mono tabular-nums">
                  {fmtPerGram(hint.cell.medianPerGramCents)}/g
                </span>{' '}
                <span className="text-fg-dim">
                  (n={hint.otherListingCount} other listings)
                </span>
              </p>
            ) : null}
          </Panel>

          {/* ── Origin & provenance ────────────────────────────────────── */}
          <Panel title={'Origin & provenance'}>
            <Table bordered={false}>
              <TBody>
                <TR>
                  <TH scope="row">Origin</TH>
                  <TD>
                    {countryDisplay(listing.provenance.country)}
                    {listing.provenance.region
                      ? `, ${listing.provenance.region}`
                      : ''}
                  </TD>
                </TR>
                <TR>
                  <TH scope="row">Source</TH>
                  <TD>
                    {listing.provenance.sourceName ? (
                      <>
                        {listing.provenance.sourceName}
                        <span className="text-fg-dim"> · {sourceTypeLabel}</span>
                      </>
                    ) : (
                      sourceTypeLabel
                    )}
                  </TD>
                </TR>
                <TR>
                  <TH scope="row">Acquired</TH>
                  <TD>{acquiredDisplay(listing.provenance.acquiredOn)}</TD>
                </TR>
                {listing.provenance.chain &&
                listing.provenance.chain.length > 0 ? (
                  <TR>
                    <TH scope="row">Chain</TH>
                    <TD>
                      <ol className="list-decimal space-y-1 pl-4">
                        {listing.provenance.chain.map((step) => (
                          <li key={step.step} className="text-sm text-fg-muted">
                            {step.actor}
                            {step.date ? (
                              <span className="ml-2 font-mono text-xs tabular-nums text-fg-dim">
                                {step.date}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    </TD>
                  </TR>
                ) : null}
                {documents.length > 0 ? (
                  <TR>
                    <TH scope="row">Documents</TH>
                    <TD>
                      <ul className="flex flex-wrap gap-2">
                        {documents.map((doc) => {
                          const href = doc.path ?? doc.url ?? '#';
                          const date = fmtMonthYear(doc.issuedOn);
                          const thumb =
                            doc.path !== null && DOC_IMAGE_RE.test(doc.path);
                          return (
                            <li key={doc.label}>
                              <a
                                href={href}
                                className="flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg-muted transition-colors duration-fast hover:border-accent hover:text-accent-strong"
                              >
                                {thumb && doc.path ? (
                                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-border bg-white">
                                    <Image
                                      src={doc.path}
                                      alt=""
                                      fill
                                      unoptimized
                                      className="object-cover"
                                    />
                                  </span>
                                ) : (
                                  <span
                                    aria-hidden="true"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-raised font-mono text-2xs text-fg-dim"
                                  >
                                    DOC
                                  </span>
                                )}
                                <span>
                                  {doc.label}
                                  {date ? (
                                    <span className="text-fg-dim"> · {date}</span>
                                  ) : null}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </Panel>
        </div>
      </div>

      {/* ── Specifications ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading title="Specifications" />
        <Table className="mt-4">
          <THead>
            <TR hover={false}>
              <TH>Attribute</TH>
              <TH>Value</TH>
            </TR>
          </THead>
          <TBody>
            {listing.specs.map((spec, i) => (
              <TR key={`${spec.label}-${i}`}>
                <TH scope="row">{spec.label}</TH>
                <TD>
                  {spec.value}
                  {spec.unit ? (
                    <span className="ml-1 text-fg-dim">{spec.unit}</span>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      {/* ── Description ────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading title="Description" />
        <MarketplaceProse className="mt-4">{listing.body}</MarketplaceProse>
      </section>

      {/* ── Seller + buyer protection ──────────────────────────────────── */}
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        <section aria-label="Seller">
          <SectionHeading title="Seller" />
          <Card>
            <div className="flex items-start gap-4">
              <SellerAvatarImage avatar={seller.avatar} className="h-14 w-14" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <Link
                    href={sellerUrl}
                    className="font-serif text-base font-semibold text-fg hover:text-accent"
                  >
                    {seller.displayName}
                  </Link>
                  {seller.verified ? (
                    <Badge variant="accent">Verified</Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-fg-dim">
                  {countryDisplay(seller.country)} · Member since{' '}
                  {formatDate(seller.memberSince)} ·{' '}
                  {getSellerListings(seller.handle).length} listings
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  {seller.tagline}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section aria-label="Buyer protection" className="lg:pt-9">
          <Callout tone="note" title="How buyer protection works">
            <div className="space-y-2">
              <p>
                Every item is photographed before dispatch. On arrival,
                photograph the sealed parcel and take a short video of the
                unboxing; any mismatch is settled against the published
                specification with that documentation.
              </p>
              <p>
                The seller&rsquo;s store operates a 30-day return-by-mail
                policy, and payment is settled directly with the seller.
              </p>
            </div>
          </Callout>
        </section>
      </div>

      {/* ── Inquiry ────────────────────────────────────────────────────── */}
      <div className="mt-8">
        <InquiryForm
          listingSlug={listing.slug}
          sellerHandle={seller.handle}
          listingTitle={listing.title}
          sizeLabels={listing.variants.map((v) => v.label)}
        />
        <LinkButton
          href={sellerUrl}
          variant="secondary"
          size="lg"
          className="mt-3"
        >
          More about the seller
        </LinkButton>
      </div>

      {/* ── More from this seller ──────────────────────────────────────── */}
      {moreFromSeller.length > 0 ? (
        <section className="mt-12">
          <SectionHeading
            title="More from this seller"
            count={moreFromSeller.length}
          />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
            {moreFromSeller.map((l) => (
              <ListingCard
                key={l.slug}
                dto={toListingSummaryDto(l, getLedgerComparisonForListing(l))}
                labels={labels}
                elementVariants={elementVariants}
              />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
