/**
 * /dashboard: Market Dashboard. A single screen overview of the ledger: the
 * regulatory snapshot (export control posture and state), the retail premium
 * leaderboard, and the data coverage map. Every figure is derived from `_data/`
 * via lib/data. Nothing here is editorial or fabricated (CLAUDE.md hard rule #1).
 *
 * There is no "30-day movers" board. The two distinct day windows that fed it
 * produce oxide to metal artefacts (for example La 30d +761,400%), not real
 * moves (docs/VISUALIZATION-AUDIT.md section 2). Genuine threshold crossing
 * events, each with its confidence and sample size, live in the /movements feed,
 * which the footer links to instead.
 *
 * Rendered SSG, like every other reference surface: the data layer memoises its
 * `_data/` reads per process (lib/data/load.ts), so the page refreshes when the
 * 6-hourly pipeline commit triggers a rebuild. An ISR revalidate would only
 * re-render against the same cached snapshot, so it is left off.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import {
  getCoverageTally,
  getDataGeneratedAt,
  getElementCoverage,
  getElements,
  getPremiumLeaderboard,
  getRegulatorySnapshot,
} from '@/lib/data';
import { formatDate } from '@/lib/format';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { CoverageGrid } from '@/components/charts/CoverageGrid';
import { PremiumLeaderboard } from '@/components/charts/PremiumLeaderboard';
import { RegulatorySnapshot } from '@/components/dashboard/RegulatorySnapshot';

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
  const total = getElements().length;
  const snapshot = getRegulatorySnapshot();
  const premiums = getPremiumLeaderboard();
  const coverage = getElementCoverage();
  const coverageTally = getCoverageTally();

  const inverseCount = premiums.filter((p) => p.premium < 1).length;

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
          <div className="flex flex-col items-start gap-1 text-xs md:items-end">
            <span className="font-mono text-fg-dim">
              Data as of{' '}
              <time dateTime={generatedAt} className="text-fg-muted">
                {formatDate(generatedAt)}
              </time>
            </span>
            <Link
              href="/methodology/"
              className="text-accent hover:text-accent-strong"
            >
              Methodology →
            </Link>
          </div>
        }
      >
        <StoryLink>
          See the detail behind these numbers in the{' '}
          <Link href="/regulatory/">Regulatory Tracker</Link>, or every detected
          price and control change in{' '}
          <Link href="/movements/">Market Movements</Link>.
        </StoryLink>
      </PageHeader>

      {/* Regulatory snapshot */}
      <section className="mt-10">
        <SectionHeading
          title="Regulatory snapshot"
          actions={
            <Link
              href="/regulatory/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Open tracker →
            </Link>
          }
          description={`All ${total} tracked elements, classified by China's export-control posture and current regulatory state. The Regulatory Tracker holds the announcement-level detail behind these counts.`}
        />
        <RegulatorySnapshot snapshot={snapshot} />
      </section>

      {/* Retail premium leaderboard */}
      <section className="mt-12">
        <SectionHeading
          title="Retail premium leaderboard"
          actions={
            <Link
              href="/elements/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Browse elements →
            </Link>
          }
          description={
            <>
              Latest retail reference ÷ latest bulk benchmark, ranked by markup,
              the premium small-quantity buyers pay over wholesale.{' '}
              {premiums.length} of {total} elements are priced in both tiers, so
              a premium can be computed.{' '}
              {inverseCount > 0
                ? `${inverseCount} inverse ${inverseCount === 1 ? 'case' : 'cases'} (below 1×, where retail undercuts bulk) ${inverseCount === 1 ? 'is' : 'are'} flagged.`
                : 'Inverse cases (below 1×, where retail undercuts bulk) are flagged when they occur.'}{' '}
              Sort by any column.
            </>
          }
        />
        <PremiumLeaderboard rows={premiums} flagInverse />
      </section>

      {/* Data coverage map */}
      <section className="mt-12">
        <SectionHeading
          title="Data coverage"
          actions={
            <Link
              href="/data/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Open data →
            </Link>
          }
          description="One tile per element, graded by how many distinct days of price observations back it. Thin coverage is shown, not hidden. Sparse elements get a small count, never a fabricated trend. Each tile links to the element."
        />
        <CoverageGrid items={coverage} tally={coverageTally} />
      </section>

      {/* No movers board: point to the factual movements feed */}
      <p className="mt-12 border-t border-border pt-6 text-sm leading-relaxed text-fg-muted">
        Looking for the biggest moves? This dashboard leaves out a
        &ldquo;30-day movers&rdquo; board on purpose. Most price windows span
        only two observation days, so ranking them would surface oxide versus
        metal artefacts as if they were real moves. Genuine threshold crossing
        events, each shown with its confidence and sample size, live in the{' '}
        <Link
          href="/movements/"
          className="text-accent hover:text-accent-strong"
        >
          Market Movements
        </Link>{' '}
        feed.
      </p>
    </Container>
  );
}
