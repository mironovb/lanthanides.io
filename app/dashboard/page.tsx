/**
 * /dashboard: Market Dashboard. A single screen overview of the ledger: the
 * regulatory snapshot (export control posture and state), the retail premium
 * leaderboard, and the data coverage map. Every figure is derived from `_data/`
 * via lib/data. Nothing here is editorial or fabricated (CLAUDE.md hard rule #1).
 *
 * An element lens (category + China export-control posture) scopes those three
 * panels. It is a client island (DashboardLens) so the page stays SSG: the full
 * dashboard renders unfiltered in the static HTML (usable without JS), the lens
 * filters client-side, and the selection is mirrored to the URL query so a
 * filtered view is shareable (canonical /dashboard/ when cleared). The
 * regulatory snapshot's counts are recomputed within the filter and labelled as
 * such, never silently narrowed.
 *
 * There is no "30-day movers" board. The two distinct day windows that fed it
 * produce oxide to metal artefacts (for example La 30d +761,400%), not real
 * moves (docs/VISUALIZATION-AUDIT.md section 2). Instead, the movement-events
 * summary panel (MovementsSummary) reports the feed's availability and how thin
 * those windows are (most rest on just two observation days), making that
 * omission legible in counts, and links to the /movements feed where each event
 * carries its own confidence and sample size.
 *
 * Rendered SSG, like every other reference surface: the data layer memoises its
 * `_data/` reads per process (lib/data/load.ts), so a fresh build is what picks
 * up new data. Reference data now lands via reviewed PRs (the weekly
 * price-update workflow and the manual community intake), and Vercel rebuilds on
 * merge; the old 6-hourly regulatory-monitor commit was removed, so there is no
 * intraday auto-rebuild (docs/DEPLOYMENT.md section 8). An ISR revalidate would
 * only re-render against the same cached snapshot, so it is left off.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import {
  getDataGeneratedAt,
  getElementCoverage,
  getElements,
  getMovements,
  getPremiumLeaderboard,
  getPriceRecords,
} from '@/lib/data';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout } from '@/components/ui';
import { MarketSnapshot } from '@/components/dashboard/MarketSnapshot';
import { DashboardLens } from '@/components/dashboard/DashboardLens';
import { MovementsSummary } from '@/components/dashboard/MovementsSummary';
import { summarizeMovements } from '@/components/dashboard/movement-summary';
import type { ElementLensMeta } from '@/components/dashboard/lens';

const DESCRIPTION =
  'A single screen market overview for rare earths and strategic metals: retail to bulk price premiums, China export control posture, and data coverage. Every figure is derived from the underlying observations, with no editorial interpretation.';

export const metadata: Metadata = buildMetadata({
  title: 'Market Dashboard: Premiums, Export Controls & Coverage',
  description: DESCRIPTION,
  keywords:
    'rare earth market dashboard, strategic metals overview, retail premium ratio, China export control snapshot, rare earth data coverage',
  path: '/dashboard/',
});

export default function DashboardPage() {
  const generatedAt = getDataGeneratedAt();
  const elements = getElements();
  const total = elements.length;
  const records = getPriceRecords().length;
  const premiums = getPremiumLeaderboard();
  const coverage = getElementCoverage();
  const movements = getMovements();
  const movementSummary = summarizeMovements(movements.events);

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
        lead="An overview of the strategic materials market: where Chinese export control concentrates, how steep the retail markup runs over wholesale, and how much price data backs each element. Every figure is derived from the underlying observations."
        actions={
          <>
            {/* Brief: capture the dashboard's current derived facts as a
                structured, cache-safe JSON snapshot (no DB rows, CC BY 4.0).
                Plain <a>: it resolves to a route handler, not a page. */}
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
      >
        <StoryLink>
          See the detail behind these numbers in the{' '}
          <Link href="/regulatory/">Regulatory Tracker</Link>, or every detected
          price and control change in{' '}
          <Link href="/movements/">Market Movements</Link>.
        </StoryLink>
      </PageHeader>

      {/* Snapshot band: headline ledger figures, all derived from _data/ */}
      <MarketSnapshot
        className="mt-8"
        totalElements={total}
        priceRecords={records}
        dualTierElements={premiums.length}
        controlledElements={controlled}
        generatedAt={generatedAt}
      />

      {/* Scope: set expectations that this is a derived, build-time snapshot */}
      <Callout tone="note" title="Dashboard scope" className="mt-8">
        A build-time overview of the open dataset, not a live market feed. Every
        figure is derived from the underlying{' '}
        <span className="font-mono">_data/</span> observations as of the data
        date shown above, and refreshes only when a data update is merged and the
        site is rebuilt. Capture this snapshot as a structured{' '}
        <a
          href="/api/dashboard/brief/"
          className="text-accent hover:text-accent-strong"
        >
          brief
        </a>{' '}
        — the derived facts only, licensed CC BY 4.0, no private data.
      </Callout>

      {/* Element lens + the three filterable panels (snapshot, premiums,
          coverage). The lens is a client island so the page stays SSG; it is
          SSR'd unfiltered, so the full dashboard is present without JS. */}
      <DashboardLens
        elements={elementMeta}
        premiums={premiums}
        coverage={coverage}
      />

      {/* Movement-events summary: the feed's availability and per-window data
          sufficiency, which is also the (now numbers-backed) case for leaving
          out a movers board. Feed-wide, so it sits outside the element lens. */}
      <MovementsSummary
        className="mt-12"
        summary={movementSummary}
        threshold={movements.config?.threshold_pct ?? 10}
        windowLabel={movements.config?.window ?? '30d'}
      />
    </Container>
  );
}
