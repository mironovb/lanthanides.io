/**
 * /offers: the demand-side Screened Offer Feed (Prompt 21).
 *
 * A dense, filterable, value-ranked feed of rare-earth and strategic-metal
 * offers. Each row is one `ScreenedOffer`, scored against its element's same-form
 * median (the seed's `valueScore`) and annotated (via the reference/regulatory
 * data layer) with the element's category and current export-control status.
 *
 * HONESTY (CLAUDE.md hard rule #1): the feed is REAL but SEEDED from the verified
 * price dataset (220 rows, `origin:'seed'`). Live internet screening (Chinese B2B
 * platforms, eBay, specialty suppliers) is a documented STUB. See
 * docs/OFFER-SCREENING.md and lib/screening. No "scanned the web" theatre: the
 * banner states the actual provenance, and every row is tagged seeded/screened.
 *
 * Dynamic + Node runtime: it reads the live dynamic store (the seeded
 * `ScreenedOffer` rows via lib/screening's `screen()`) and `fs` (lib/data), so it
 * is request-rendered, not statically optimised, same posture as /sell.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/seo';
import { getElements, getSiteSettings } from '@/lib/data';
import { screen } from '@/lib/screening';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, SectionHeading } from '@/components/ui';
import {
  OffersBanner,
  OffersFeed,
  toOfferDTO,
  type ElementMeta,
  type OfferDTO,
} from '@/components/offers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DESCRIPTION =
  "A value-ranked feed of rare-earth and strategic-metal offers (element, form, purity, quantity, price per kg, seller, source, and confidence), each scored against its element's same-form median and annotated with its China export-control status. Seeded from the verified open dataset; live screening in development.";
export const metadata: Metadata = buildMetadata({
  title: 'Offer Feed: Rare-Earth Offers Ranked by Value',
  description: DESCRIPTION,
  keywords:
    'rare earth offers, buy rare earth, rare earth price comparison, dysprosium neodymium offers, strategic metals marketplace, rare earth offer screening, best value rare earth, gallium germanium antimony offers',
  path: '/offers/',
});

export default async function OffersPage() {
  // Element metadata (name, category label, control status) to annotate each
  // offer: read from the reference/regulatory data layer, never the DB.
  const settings = getSiteSettings();
  const metaBySymbol = new Map<string, ElementMeta>();
  for (const el of getElements()) {
    metaBySymbol.set(el.symbol, {
      name: el.name,
      category: el.category,
      categoryLabel: settings.category_labels[el.category],
      exportControl: el.export_control_status,
      regulatory: el.regulatory_status,
    });
  }

  // The feed itself: today, the seeded `ScreenedOffer` rows (lib/screening).
  const result = await screen();
  const offers: OfferDTO[] = result.offers.map((o) =>
    toOfferDTO(o, metaBySymbol.get(o.elementSymbol)),
  );

  const elementCount = new Set(offers.map((o) => o.elementSymbol)).size;
  const seededCount = offers.filter((o) => o.origin === 'seed').length;
  const screenedCount = offers.filter((o) => o.origin === 'screened').length;

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[{ name: 'Home', path: '/' }, { name: 'Offer Feed', path: '/offers/' }]}
      />
      <DatasetJsonLd
        name="Screened rare-earth & strategic-metal offer feed"
        description={DESCRIPTION}
        path="/offers/"
        keywords={[
          'rare earth offers',
          'strategic metals pricing',
          'offer screening',
          'rare earth value ranking',
          'China export controls',
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Offer Feed' }]}
        eyebrow="Tools"
        title="Screened Offer Feed"
        lead="Rare-earth and strategic-metal offers, ranked by value against each element’s same-form median and annotated with the export-control status that governs it. Filter by element, category, form, source, or confidence."
      >
        <StoryLink>
          Selling, not buying? Get an instant price check and list your material on{' '}
          <Link href="/sell/">Sell / List</Link>. Every offer here links to its{' '}
          <Link href="/elements/">element page</Link> and the{' '}
          <Link href="/regulatory/">controls</Link> that move its price.
        </StoryLink>
      </PageHeader>

      {/* ── Honesty banner: seeded today, live screening in development ───── */}
      <div className="mt-8">
        <OffersBanner
          total={offers.length}
          elementCount={elementCount}
          seededCount={seededCount}
          screenedCount={screenedCount}
        />
      </div>

      {/* ── The feed ─────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <SectionHeading
          title="Offers, best value first"
          count={`${offers.length} offers`}
          description="Sorted by value rank by default. Every figure is the offer’s own (price, seller, date, confidence), drawn from a sourced record; nothing is interpolated. Click a header to re-sort."
        />
        <OffersFeed offers={offers} />
      </section>

      {/* ── How ranking works ────────────────────────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2">
        <Callout tone="note" glyph={null} title="How offers are ranked">
          <p className="leading-relaxed">
            Each offer&rsquo;s <span className="font-mono text-fg-muted">valueScore</span>{' '}
            is{' '}
            <span className="text-fg">
              how far it sits below (or above) the median price for that exact
              element and form
            </span>
            , scaled by the source record&rsquo;s confidence. A discount on a
            high-confidence, recent record ranks highest; an over-priced or
            thinly-evidenced offer ranks lowest. Medians never mix forms (oxide vs
            metal) or tiers. Read the full method on{' '}
            <Link href="/methodology/#verification-and-confidence">Methodology</Link>
            .
          </p>
        </Callout>

        <Callout tone="note" glyph={null} title="Two sides, one reference">
          <p className="leading-relaxed">
            This feed is the demand side. The supply side,{' '}
            <Link href="/sell/">listing material</Link> with an instant price
            gauge, runs the same engine over the same{' '}
            <Link href="/data/">open dataset</Link>. That reference stays free,
            inspectable, and CC BY 4.0. An offer here is never auto-published
            into it.
          </p>
        </Callout>
      </section>
    </Container>
  );
}
