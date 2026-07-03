/**
 * /contribute: where the ledger grows. Two entry doors, one review:
 *
 * 1. The on-site form (ContributionForm) writes a pending row to the
 *    contributions inbox, the single Neon table behind /api/contributions,
 *    and the queue renders right below it so the loop is visible end to end.
 * 2. The GitHub issue templates + the community-intake workflow, unchanged.
 *
 * Either way, nothing publishes without a maintainer review: accepted
 * observations are merged into the versioned _data/ files as a reviewed PR.
 *
 * force-dynamic: the page reads the inbox at request time and the build never
 * touches the database (CLAUDE.md data strategy); a DB outage degrades the
 * queue panel to a note, never the page. Counts still come from
 * `_data/source_breakdown.yml` (published community records read 0 today:
 * shown, not hidden).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getElements, getPriceRecords, getSourceBreakdown } from '@/lib/data';
import { listRecentContributions } from '@/lib/contributions';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, SectionHeading, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { ContributionForm } from '@/components/contribute/ContributionForm';
import { RecentContributions } from '@/components/contribute/RecentContributions';
import {
  ContributePanel,
  MethodologyCallout,
  SourceBreakdownPanel,
} from '@/components/trust';

export const dynamic = 'force-dynamic';

const TITLE = 'Contribute Data';
const DESCRIPTION =
  'Submit a sourced price observation for review, on this page or via GitHub. An open, auditable pipeline with human checkpoints: every accepted record lands in the open dataset as a reviewed change. No fabricated or auto-published data.';

const PIPELINE_CHECKS = [
  {
    stage: 'Issue gate',
    check: 'The issue must use the price-update template and carry the maintainer-applied approved label.',
  },
  {
    stage: 'Parser',
    check: 'The intake script rejects unknown elements, missing fields, non-positive prices, future dates, and non-USD prices without a known FX rate.',
  },
  {
    stage: 'Generated data',
    check: 'Source breakdown, fluctuation, and movement files are refreshed from the updated price history.',
  },
  {
    stage: 'Vercel gate',
    check: 'GitHub Actions opens a data PR only. Vercel owns the site build and deploy after the PR is merged.',
  },
] as const;

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'contribute rare earth prices, open data contribution, rare earth price submission, data provenance, double review data pipeline, lanthanides.io contribute',
  path: '/contribute/',
});

export default async function ContributePage() {
  const breakdown = getSourceBreakdown();
  const elementOptions = getElements().map((e) => ({
    symbol: e.symbol,
    name: e.name,
  }));
  const knownForms = [
    ...new Set(getPriceRecords().map((r) => r.form.toLowerCase())),
  ].sort();
  // Resilient read: null renders the queue's calm "unavailable" note.
  const queue = await listRecentContributions();

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
        lead="Every reference price on this site is assembled from source-cited observations, and this page is where those observations come from. Submit one with the form below, or through GitHub; either way it enters a public review queue, and what gets published is open, attributable, and reversible by anyone reading the git history."
      >
        <StoryLink>
          See what governs each accepted value in the{' '}
          <Link href="/methodology/">methodology</Link>, or the registry it draws
          from in <Link href="/sources/">Sources</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── Submit + the live review queue ───────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Submit a price observation"
          description="The quickest way in: one sourced observation. It lands in the public review queue; a maintainer merges accepted records into the open dataset, and the assembled prices sharpen."
        />
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <ContributionForm elements={elementOptions} knownForms={knownForms} />
          <div>
            <SectionHeading
              as="h3"
              title="Review queue"
              description="Newest submissions, awaiting review. Queued is not published."
            />
            <RecentContributions queue={queue} />
          </div>
        </div>
      </section>

      {/* ── The pipeline (credibility feature) ───────────────────────────── */}
      <section className="mt-12">
        <SectionHeading
          title="How data gets in"
          description="Whichever door a submission uses, the form above or a GitHub issue, the same checkpoints stand between it and the public dataset: a maintainer's review, and a merged pull request. Neither can be skipped."
        />
        <ContributePanel />

        <div className="mt-6">
          <SectionHeading
            as="h3"
            title="What the intake workflow checks"
            description="The automation is narrow on purpose. It does not decide whether a source is credible; it proves the approved submission is well formed and safe to review as a diff."
          />
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Stage</TH>
                <TH>Check</TH>
              </TR>
            </THead>
            <TBody>
              {PIPELINE_CHECKS.map((row) => (
                <TR key={row.stage}>
                  <TD className="whitespace-nowrap font-mono text-xs uppercase tracking-caps text-fg">
                    {row.stage}
                  </TD>
                  <TD>{row.check}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </section>

      {/* ── Standards + live intake mix ──────────────────────────────────── */}
      <section className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading as="h3" title="What makes a submission usable" />
          <ul className="space-y-2 text-sm leading-relaxed text-fg-muted">
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">A real source.</span> A seller
              name and, where possible, a URL, something a reviewer can open and
              check. Anonymous or unverifiable listings are excluded.
            </li>
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">Form, purity, quantity.</span>{' '}
              A price is only comparable with its form (metal/oxide/…), purity, and
              the quantity it applies to.
            </li>
            <li className="border-l-2 border-border-strong pl-3">
              <span className="font-medium text-fg">An observation date.</span> The
              date you saw the price, never an ingestion date dressed up as a
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
            description="The current intake mix, regenerated from the data, including the paths that read zero today."
          />
          <SourceBreakdownPanel breakdown={breakdown} />
          <Callout tone="info" glyph={null} className="mt-4">
            Community records in the <em>published</em> dataset read{' '}
            <span className="font-mono tabular-nums text-fg">0</span> today
            {queue && queue.pending > 0 ? (
              <>
                , with{' '}
                <span className="font-mono tabular-nums text-fg">
                  {queue.pending}
                </span>{' '}
                submission{queue.pending === 1 ? '' : 's'} waiting in the review
                queue above
              </>
            ) : null}
            . The pipeline is open and ready, but the dataset is still
            maintainer- and benchmark-collected.
          </Callout>
        </div>
      </section>
    </Container>
  );
}
