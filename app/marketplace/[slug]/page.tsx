/**
 * /marketplace/[slug]/ — listing detail (DESIGN §6.2, PLAN P5).
 *
 * SSG over every listing slug, `dynamicParams = false` (unknown slugs are the
 * framework 404), mirroring /elements/[symbol]. Two-column top on lg: the
 * photograph column beside the price + provenance panels — provenance sits
 * IMMEDIATELY after price, before the description, because provenance is the
 * product.
 *
 * Honesty rules enforced here: no market-price language anywhere (prices are
 * "the seller's catalog"); the catalog-average comparison renders only when
 * the leave-one-out sample is sufficient (it is not, today — the branch exists
 * and must not fire); "Verification pending" + the literal no-document
 * sentence whenever provenance is seller-declared; Product JSON-LD ships
 * WITHOUT an Offer node while checkout does not exist.
 */
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getElementBySymbol } from '@/lib/data';
import {
  CATALOG_AVERAGE_DISCLAIMER,
  getCatalogAverageForListing,
  getListing,
  getListingSlugs,
  getMarketplaceSettings,
  getSeller,
  getSellerListings,
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
  buttonClasses,
} from '@/components/ui';
import { REGULATORY_BADGE } from '@/components/elements/categories';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { MarketplaceProse } from '@/components/marketplace/MarketplaceProse';
import { SellerAvatarImage } from '@/components/marketplace/SellerAvatarImage';
import {
  countryDisplay,
  fmtCents,
  fmtMassRange,
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

/** "2024-08" stays verbatim (formatDate would invent a day); full ISO formats. */
function acquiredDisplay(acquiredOn: string | null): string {
  if (acquiredOn === null) return 'Not stated';
  return /^\d{4}-\d{2}$/.test(acquiredOn) ? acquiredOn : formatDate(acquiredOn);
}

export default function ListingDetailPage({ params }: { params: Params }) {
  const listing = getListing(params.slug);
  if (!listing) notFound();
  const seller = getSeller(listing.sellerHandle);
  if (!seller) notFound();

  const settings = getMarketplaceSettings();
  const labels = buildMarketplaceLabels();
  const elementVariants = buildElementVariantMap();
  const hint = getCatalogAverageForListing(listing);

  const pending = listing.provenance.verificationStatus === 'seller-declared';
  const verificationLabel =
    settings.verificationLabels[listing.provenance.verificationStatus];

  const gallery = [
    listing.primaryImage,
    ...listing.images
      .filter((img) => !img.isPrimary)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  ];
  const notedVariants = listing.variants.filter((v) => v.note !== null);

  const sellerUrl = `/marketplace/sellers/${seller.handle}/`;
  const moreFromSeller = getSellerListings(seller.handle)
    .filter((l) => l.slug !== listing.slug)
    .slice(0, 6);

  const inquirySubject = `Inquiry: ${listing.title} (${listing.slug})`;
  const inquiryBody = [
    `Listing: ${abs(listing.url)}`,
    `Item: ${listing.title}`,
    '',
    'Size wanted (from the size table):',
    '',
    'Destination country:',
    '',
  ].join('\n');
  const mailtoHref = `mailto:${seller.contactEmail}?subject=${encodeURIComponent(
    inquirySubject,
  )}&body=${encodeURIComponent(inquiryBody)}`;

  // Product JSON-LD — deliberately WITHOUT `offers`: schema.org Offer asserts
  // a transactable offer and there is no checkout here (DESIGN §6.2).
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
          {pending ? <Chip>{verificationLabel}</Chip> : null}
        </div>
      </header>

      {/* ── Two-column top: photographs | price + provenance ───────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Photographs">
          <p className="eyebrow mb-2">
            {gallery.length} photo{gallery.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-4">
            {gallery.map((img) => (
              <figure
                key={img.path}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <a href={img.path} className="block">
                  <Image
                    src={img.path}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    sizes="(max-width: 1023px) 100vw, 560px"
                    priority={img.isPrimary}
                    className="h-auto w-full"
                  />
                </a>
                <figcaption className="border-t border-border px-3 py-2 text-xs text-fg-dim">
                  {img.caption ? (
                    <>
                      {img.caption}
                      <br />
                    </>
                  ) : null}
                  Photograph from the seller&rsquo;s catalog.
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {/* ── Price ──────────────────────────────────────────────────── */}
          <Panel title="Price" eyebrow="Seller's catalog">
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
                {listing.variants.map((v) => (
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
                    <TD numeric>
                      {fmtPerGram(v.pricePerGramCents)}
                      <span className="text-fg-dim">/g</span>
                    </TD>
                  </TR>
                ))}
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

            {/* Leave-one-out catalog comparison: renders ONLY with a
                sufficient other-listing sample (DESIGN §4.5–4.6). With one
                listing per cell today, this never fires. */}
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

          {/* ── Provenance — the product; never below the fold ─────────── */}
          <Panel title="Provenance" eyebrow="Where this came from">
            <div className="flex flex-wrap items-center gap-2">
              {pending ? (
                <Chip>{verificationLabel}</Chip>
              ) : (
                <Badge variant="accent">{verificationLabel}</Badge>
              )}
            </div>
            {pending ? (
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                The seller declared this provenance. No supporting document is
                on file.
              </p>
            ) : null}

            <Table bordered={false} className="mt-4">
              <TBody>
                <TR>
                  <TH scope="row">Source type</TH>
                  <TD>{labels.sourceTypes[listing.provenance.sourceType]}</TD>
                </TR>
                <TR>
                  <TH scope="row">Source name</TH>
                  <TD>
                    {listing.provenance.sourceName ?? 'Not disclosed by seller'}
                  </TD>
                </TR>
                <TR>
                  <TH scope="row">Country</TH>
                  <TD>
                    {countryDisplay(listing.provenance.country)}
                    {listing.provenance.region
                      ? `, ${listing.provenance.region}`
                      : ''}
                  </TD>
                </TR>
                <TR>
                  <TH scope="row">Acquired</TH>
                  <TD>{acquiredDisplay(listing.provenance.acquiredOn)}</TD>
                </TR>
                <TR>
                  <TH scope="row">Declared by</TH>
                  <TD>{listing.provenance.declaredBy}</TD>
                </TR>
              </TBody>
            </Table>

            {listing.provenance.chain && listing.provenance.chain.length > 0 ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5">
                {listing.provenance.chain.map((step) => (
                  <li key={step.step} className="text-sm text-fg-muted">
                    <span className="font-medium text-fg">{step.actor}</span>
                    {step.date ? (
                      <span className="ml-2 font-mono text-xs tabular-nums text-fg-dim">
                        {step.date}
                      </span>
                    ) : null}
                    {step.note ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-fg-dim">
                        {step.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {listing.provenance.documents &&
            listing.provenance.documents.length > 0 ? (
              <ul className="mt-4 space-y-1">
                {listing.provenance.documents.map((doc) => {
                  const href = doc.path ?? doc.url;
                  return (
                    <li key={doc.label} className="text-sm">
                      {href ? (
                        <a
                          href={href}
                          className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-strong"
                        >
                          {doc.label}
                        </a>
                      ) : (
                        doc.label
                      )}
                      <span className="ml-2 text-xs text-fg-dim">
                        {doc.kind}
                        {doc.issuedOn ? ` · ${doc.issuedOn}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {listing.provenance.notes ? (
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                {listing.provenance.notes}
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      {/* ── Specifications ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Specifications"
          description="As declared by the seller."
        />
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
        {listing.purityPct !== null ? (
          <p className="mt-2 text-xs text-fg-dim">
            Purity basis: {listing.purityBasis ?? 'Not stated.'}
          </p>
        ) : null}
      </section>

      {/* ── Description ────────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Description"
          description="The seller's own listing text, imported verbatim."
        />
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
                    <Tooltip
                      label={seller.verificationBasis ?? 'Verified by the site operator.'}
                    >
                      <Badge variant="accent">Verified</Badge>
                    </Tooltip>
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
                photograph the sealed parcel before opening and take a short
                video of the unboxing. If what arrives does not match the
                published specification, that documentation is what resolves
                the mismatch — it is checked against the specification table
                above.
              </p>
              <p>
                Payment happens directly with the seller; there is no checkout
                on this site and no funds are held here. The seller&rsquo;s
                store operates a 30-day return-by-mail policy. We will not
                describe protection we do not operate.
              </p>
            </div>
          </Callout>
        </section>
      </div>

      {/* ── Inquiry CTA (stubbed on purpose: a mailto is what happens) ─── */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a href={mailtoHref} className={buttonClasses('primary', 'lg')}>
          Inquire about this item
        </a>
        <LinkButton href={sellerUrl} variant="secondary" size="lg">
          More about the seller
        </LinkButton>
      </div>
      <p className="mt-2 text-xs text-fg-dim">
        The inquiry opens your email client, addressed to the seller, with the
        listing reference prefilled.
      </p>

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
                dto={toListingSummaryDto(l)}
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
