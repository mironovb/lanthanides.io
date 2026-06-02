/**
 * /elements: the element directory and price ledger (SSG).
 *
 * All 31 elements grouped into the four categories, each a grid of linked
 * ElementCard tiles with category colour, the China export control and high
 * demand markers, the export control status, and the retail and bulk reference
 * prices from getReferencePrices(). The grid and tiles match the last static
 * site (element-grid.html, _sass/_home.scss).
 *
 * The old /prices/ URL 301-redirects here; that redirect is wired in
 * next.config.mjs (MIGRATION section 3.5).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getElementsByCategory, getReferencePrices } from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import {
  CATEGORY_ORDER,
  CATEGORY_STYLE,
  CONTROL_STYLE,
} from '@/components/elements/categories';
import { ElementCard } from '@/components/elements/ElementCard';

export const metadata: Metadata = buildMetadata({
  title: 'All Rare Earth & Strategic Metal Prices: Element Directory',
  description:
    'Compare prices per kg for all 31 rare earth elements, strategic metals, and semiconductor materials. Retail and bulk benchmarks with export-control status.',
  keywords:
    'rare earth prices, rare earth element directory, strategic metal prices, retail vs bulk price, export control status',
  path: '/elements/',
});

export default function ElementsIndexPage() {
  const byCategory = getElementsByCategory();
  const total = CATEGORY_ORDER.reduce(
    (n, cat) => n + byCategory[cat].length,
    0,
  );

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Elements', path: '/elements/' },
        ]}
      />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Elements' }]}
        eyebrow="Reference · Price Ledger"
        title="All Rare Earth & Strategic Metal Prices"
        lead={`Current prices per kilogram for ${total} rare earth elements, strategic metals, and semiconductor materials. Each element shows a retail reference and bulk benchmark with export-control status. Prices are normalised to USD/kg from verified, in-stock listings.`}
      >
        <StoryLink>
          See which of these elements face Chinese export controls in the{' '}
          <Link href="/regulatory/">Regulatory Tracker</Link>, or take the whole
          dataset from <Link href="/data/">Open Data</Link>.
        </StoryLink>
      </PageHeader>

      {CATEGORY_ORDER.map((cat) => {
        const elements = [...byCategory[cat]].sort(
          (a, b) => a.atomic_number - b.atomic_number,
        );
        if (elements.length === 0) return null;
        const style = CATEGORY_STYLE[cat];

        return (
          <section key={cat} className="mt-12">
            <SectionHeading
              swatch={style.swatch}
              title={style.label}
              count={elements.length}
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {elements.map((element) => {
                const { retailRef, bulkRef } = getReferencePrices(
                  element.symbol,
                );
                return (
                  <ElementCard
                    key={element.symbol}
                    element={element}
                    retail={retailRef}
                    bulk={bulkRef}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="mt-12 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">❗</span> China export control active
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🔥</span> High demand
        </span>
        <LegendTag kind="restricted" /> Export licence required
        <LegendTag kind="monitored" /> Under surveillance
        <LegendTag kind="normal" /> No restrictions
      </div>
    </Container>
  );
}

function LegendTag({ kind }: { kind: keyof typeof CONTROL_STYLE }) {
  const ctrl = CONTROL_STYLE[kind];
  return (
    <span className="flex items-center gap-1">
      <span
        className={`inline-block rounded-sm px-1 py-px font-mono text-2xs font-semibold ${ctrl.classes}`}
      >
        {ctrl.label}
      </span>
    </span>
  );
}
