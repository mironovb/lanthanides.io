/**
 * /tools/price-map: the Price Map (the "simple visualizable tool"). Every
 * sourced observation in the dataset drawn as one mark on a shared log-scale
 * USD/kg axis, one row per element, retail and bulk as two shape-coded tracks
 * that are never merged, grouped by the same category sections as the home
 * ledger.
 *
 * This is the GaugeBar idiom (observed span + quartile band + median tick,
 * plain divs) generalized to the whole catalog. It is deliberately
 * cross-sectional: no tier in the dataset reaches the 5 distinct observation
 * days the visualization audit requires for a trend line, so nothing here is
 * ever a line through time. Statistics are unweighted descriptions of the
 * observed records; the weighted fair-price estimate lives in the Price Gauge.
 *
 * Fully static (SSG): the model is built from `_data/` at build time and the
 * complete default view is server-rendered, so the map works without
 * JavaScript; the island only adds filtering and sorting.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import { getDataGeneratedAt, getElements, getPriceRecords } from '@/lib/data';
import { Container, PageHeader } from '@/components/layout';
import { Callout } from '@/components/ui';
import { buildPriceMap } from '@/components/charts/price-map-data';
import { PriceMapExplorer } from '@/components/charts/PriceMapExplorer';
import { fmtUsdPrice, formatDate } from '@/lib/format';

const RECORD_COUNT = getPriceRecords().length;

const DESCRIPTION =
  `All ${RECORD_COUNT} sourced price observations for 31 rare-earth and strategic-metal elements on a single log-scale USD per kg axis. Retail and bulk shown separately, with observed ranges, quartile bands, and medians computed for each form and market. Open data, CC BY 4.0.`;

export const metadata: Metadata = buildMetadata({
  title: 'Price Map: Every Rare-Earth and Strategic-Metal Price on One Axis',
  description: DESCRIPTION,
  keywords:
    'rare earth price comparison, price per kg chart, retail vs bulk price, strategic metals price range, rare earth price spread, dysprosium terbium neodymium price chart',
  path: '/tools/price-map/',
});

export default function PriceMapPage() {
  const elements = getElements();
  const records = getPriceRecords();
  const model = buildPriceMap(elements, records);
  const { totals } = model;

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const r of records) {
    if (r.normalized_usd_per_kg < minPrice) minPrice = r.normalized_usd_per_kg;
    if (r.normalized_usd_per_kg > maxPrice) maxPrice = r.normalized_usd_per_kg;
  }
  const spanOrders = Math.round(Math.log10(maxPrice / minPrice));

  return (
    <Container as="main" className="py-10">
      <WebApplicationJsonLd
        name="Price Map · lanthanides.io"
        description={DESCRIPTION}
        path="/tools/price-map/"
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Price Map', path: '/tools/price-map/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Price Map' }]}
        eyebrow="Tools"
        title="Price Map"
        lead={`Every sourced price in the ledger, drawn on one axis. One row per element, one mark per observation. Different forms of the same element are different commodities, so every statistic here is computed within a single form and market. Forms never mix, and retail and bulk are never merged. The axis is logarithmic because observed prices span ${spanOrders} orders of magnitude, from ${fmtUsdPrice(minPrice)} to ${fmtUsdPrice(maxPrice)} per kg across all forms and markets.`}
        actions={
          <div className="flex flex-col items-start gap-1 text-xs md:items-end">
            <Link
              href="/methodology/#display-price"
              className="text-accent hover:text-accent-strong"
            >
              How prices are set →
            </Link>
            <Link
              href="/tools/price-gauge/"
              className="text-accent hover:text-accent-strong"
            >
              Gauge a fair price →
            </Link>
          </div>
        }
      >
        <p className="mt-4 font-mono text-xs tabular-nums text-fg-dim">
          {totals.records} observations · {totals.elements} elements · quotes{' '}
          {formatDate(totals.dateFrom)} to {formatDate(totals.dateTo)} · data as
          of {formatDate(getDataGeneratedAt())}
        </p>
      </PageHeader>

      <PriceMapExplorer model={model} />

      <div className="mt-10">
        <Callout tone="note" title="Observed spread is not a fair-price estimate">
          This map draws raw observations exactly as sourced and summarises them
          with plain, unweighted statistics. Every range, band, and median is
          computed within a single form and market; a metal quote is never
          pooled with an oxide quote. The{' '}
          <Link
            href="/tools/price-gauge/"
            className="text-accent hover:text-accent-strong"
          >
            Price Gauge
          </Link>{' '}
          weights records by confidence, recency, and purity proximity to
          estimate a fair range for a specific purchase. How each figure is
          selected and verified is documented in the{' '}
          <Link
            href="/methodology/#display-price"
            className="text-accent hover:text-accent-strong"
          >
            methodology
          </Link>
          .
        </Callout>
      </div>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-fg-dim">
        Every mark is one cited record; the full provenance for each element
        lives on its page. The dataset is open under CC BY 4.0, downloadable
        from the{' '}
        <Link href="/data/" className="text-accent hover:text-accent-strong">
          Open Data page
        </Link>
        . Spotted a price this map is missing?{' '}
        <Link
          href="/contribute/"
          className="text-accent hover:text-accent-strong"
        >
          Add a price
        </Link>
        .
      </p>
    </Container>
  );
}
