/**
 * /contribute — the contributor pipeline as a first-class credibility surface
 * (Prompt 16, task #3). Explains the open, auditable, double-human-review intake
 * (GitHub issue → maintainer `approved` label → manually-dispatched PR → merge),
 * links the existing structured issue templates, and shows the live intake mix
 * so the openness is verifiable rather than asserted.
 *
 * Everything here is checkable against the repository (CLAUDE.md hard rule #1):
 * the two-checkpoint flow is `.github/workflows/community-intake.yml`; the
 * templates are the live `.github/ISSUE_TEMPLATE/*.yml`; the intake counts come
 * from `_data/source_breakdown.yml` (community submissions read 0 today — shown,
 * not hidden).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getSourceBreakdown } from '@/lib/data';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, SectionHeading } from '@/components/ui';
import {
  ContributePanel,
  MethodologyCallout,
  SourceBreakdownPanel,
} from '@/components/trust';

const TITLE = 'Contribute Data';
const DESCRIPTION =
  'How sourced prices and market intelligence enter lanthanides.io: an open, auditable contributor pipeline with two human checkpoints — GitHub issue, maintainer review, pull request, and merge. No fabricated or auto-published data.';

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'contribute rare earth prices, open data contribution, rare earth price submission, data provenance, double review data pipeline, lanthanides.io contribute',
  path: '/contribute/',
});

export default function ContributePage() {
  const breakdown = getSourceBreakdown();

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Contribute', path: '/contribute/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Contribute' }]}
        eyebrow="Open & Auditable"
        title="Contribute data"
        lead="This ledger grows by review, not by scraping. Every price and market note enters through a public pipeline with two human checkpoints — so what gets published is open, attributable, and reversible by anyone reading the git history."
      >
        <StoryLink>
          See what governs each accepted value in the{' '}
          <Link href="/methodology/">methodology</Link>, or the registry it draws
          from in <Link href="/sources/">Sources</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── The pipeline (credibility feature) ───────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="How data gets in"
          description="Two checkpoints stand between a submission and the public dataset: a maintainer's review, and a merged pull request. Neither can be skipped."
        />
        <ContributePanel />
      </section>

      {/* ── Standards + live intake mix ──────────────────────────────────── */}
      <section className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading as="h3" title="What makes a submission usable" />
          <ul className="space-y-2 text-sm leading-relaxed text-fg-muted">
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">A real source.</span> A seller
              name and, where possible, a URL — something a reviewer can open and
              check. Anonymous or unverifiable listings are excluded.
            </li>
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">Form, purity, quantity.</span>{' '}
              A price is only comparable with its form (metal/oxide/…), purity, and
              the quantity it applies to.
            </li>
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">An observation date.</span> The
              date you saw the price — never an ingestion date dressed up as a
              quote date.
            </li>
            <li className="border-l-2 border-l-accent pl-3">
              <span className="font-medium text-fg">No guessing.</span> A missing
              field is left blank, not filled in to complete the record.
            </li>
          </ul>
          <MethodologyCallout className="mt-5" />
        </div>

        <div>
          <SectionHeading
            as="h3"
            title="What's actually in the ledger"
            description="The current intake mix, regenerated from the data — including the paths that read zero today."
          />
          <SourceBreakdownPanel breakdown={breakdown} />
          <Callout tone="info" glyph={null} className="mt-4">
            Community submissions read{' '}
            <span className="font-mono tabular-nums text-fg">0</span> today — the
            pipeline is open and ready, but the dataset is still maintainer- and
            benchmark-collected. This page is the invitation to change that.
          </Callout>
        </div>
      </section>
    </Container>
  );
}
