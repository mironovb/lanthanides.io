/**
 * /dashboard: Market Dashboard. One screen over the ledger: the regulatory
 * risk matrix, the retail premium leaderboard, and the data coverage map.
 * Every figure is derived from `_data/` via lib/data (CLAUDE.md hard rule #1).
 *
 * An element lens (category + China export-control posture) scopes the panels.
 * It is a client island (DashboardLens) so the page stays SSG: the full
 * dashboard renders unfiltered in the static HTML, the lens filters
 * client-side, and the selection mirrors to the URL query.
 *
 * SSG with no ISR revalidate: the data layer memoises `_data/` per process, so
 * new data arrives via merge and rebuild (docs/DEPLOYMENT.md section 8).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import {
  getDataGeneratedAt,
  getElements,
  getPremiumLeaderboard,
} from '@/lib/data';
import { Container, PageHeader } from '@/components/layout';
import { Callout } from '@/components/ui';
import { MarketSnapshot } from '@/components/dashboard/MarketSnapshot';
import { DashboardLens } from '@/components/dashboard/DashboardLens';
import type { ElementLensMeta } from '@/components/dashboard/lens';

const DESCRIPTION =
  'A single screen market overview for rare earths and strategic metals: retail to bulk price premiums and China export control posture, derived from the open dataset.';

export const metadata: Metadata = buildMetadata({
  title: 'Market Dashboard: Premiums & Export Controls',
  description: DESCRIPTION,
  keywords:
    'rare earth market dashboard, strategic metals overview, retail premium ratio, China export control snapshot',
  path: '/dashboard/',
});

export default function DashboardPage() {
  const generatedAt = getDataGeneratedAt();
  const elements = getElements();
  const total = elements.length;
  const premiums = getPremiumLeaderboard();

  // Lean catalog slice the lens scopes by; the authoritative element set, passed
  // to the client island which derives the in-scope subset and per-panel views.
  const elementMeta: ElementLensMeta[] = elements.map((e) => ({
    symbol: e.symbol,
    category: e.category,
    control: e.export_control_status,
    regulatory: e.regulatory_status,
  }));
  // Elements named in a Chinese export-control regime, whether in force or paused.
  const controlled = elementMeta.filter(
    (e) => e.regulatory === 'active' || e.regulatory === 'suspended',
  ).length;

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Market Dashboard', path: '/dashboard/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Market Dashboard' }]}
        eyebrow="Data"
        title="Market Dashboard"
        lead="An overview of the strategic materials market: where Chinese export control concentrates, how steep the retail markup runs over wholesale, and how much price data backs each element."
        actions={
          <>
            {/* Plain <a>: the brief resolves to a route handler, not a page. */}
            <a
              href="/api/dashboard/brief/"
              className="text-xs text-accent hover:text-accent-strong"
            >
              Brief (JSON) →
            </a>
            <Link
              href="/methodology/"
              className="text-xs text-accent hover:text-accent-strong"
            >
              Methodology →
            </Link>
          </>
        }
      />

      {/* Snapshot band: headline ledger figures, all derived from _data/ */}
      <MarketSnapshot
        className="mt-8"
        totalElements={total}
        dualTierElements={premiums.length}
        controlledElements={controlled}
        generatedAt={generatedAt}
      />

      <Callout tone="note" title="Dashboard scope" className="mt-8">
        A build-time overview of the open dataset, not a live market feed.
        Figures refresh when a data update is merged and the site is rebuilt.
      </Callout>

      {/* Element lens + the three filterable panels, SSR'd unfiltered so the
          full dashboard is present without JS. */}
      <DashboardLens elements={elementMeta} premiums={premiums} />
    </Container>
  );
}
