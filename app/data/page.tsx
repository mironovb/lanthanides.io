/**
 * /data — the open-data landing page (SSG, Prompt 8). Describes the dataset, its
 * provenance and CC BY 4.0 licence, and links every download: the canonical
 * price-records export (JSON/CSV via /api/export), the preserved fluctuations
 * export, the regulatory dataset, and the git source of truth.
 *
 * Counts come from the live data layer so the page can never overstate coverage
 * (CLAUDE.md hard rule #1). Full Dataset JSON-LD lands in the Prompt 24 sweep.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getControlByCategory,
  getCoverageTally,
  getElementCoverage,
  getElements,
  getPremiumLeaderboard,
  getPriceRecords,
  getRegulatoryNotices,
  getSourceBreakdown,
  getSources,
} from '@/lib/data';
import { Container, PageHeader } from '@/components/layout';
import { Callout, SectionHeading, Stat, StatGrid } from '@/components/ui';
import { CoverageGrid } from '@/components/charts/CoverageGrid';
import { MarketStructure } from '@/components/charts/MarketStructure';
import { PremiumLeaderboard } from '@/components/charts/PremiumLeaderboard';

export const metadata: Metadata = {
  title: 'Open Data — Rare Earth & Strategic Metal Price Dataset',
  description:
    'Download the full rare earth and strategic metal price dataset: 238 sourced price records as JSON or CSV, plus regulatory and fluctuation data. Open data under CC BY 4.0.',
  keywords:
    'rare earth price dataset, open data rare earth, strategic metals CSV, rare earth prices JSON, CC BY 4.0 commodity data',
  alternates: { canonical: '/data/' },
};

const REPO = 'https://github.com/mironovb/lanthanides.io';

export default function DataPage() {
  const priceRecords = getPriceRecords().length;
  const elements = getElements().length;
  const notices = getRegulatoryNotices().length;
  const sources = getSources().length;
  const observations = getSourceBreakdown().total_observations;

  // Rebuilt, data-honest visualizations (Prompt 10).
  const coverage = getElementCoverage();
  const coverageTally = getCoverageTally();
  const control = getControlByCategory();
  const premiums = getPremiumLeaderboard();

  const stats: Array<[number, string]> = [
    [priceRecords, 'Price records'],
    [elements, 'Elements'],
    [observations, 'Price observations'],
    [notices, 'Regulatory notices'],
    [sources, 'Curated sources'],
  ];

  const downloads = [
    {
      title: 'Price records — JSON',
      href: '/api/export/json/',
      meta: `${priceRecords} records · application/json`,
      desc: 'The canonical price store: every sourced, normalised USD/kg record with seller, date, form, purity, quantity, and verification status.',
    },
    {
      title: 'Price records — CSV',
      href: '/api/export/csv/',
      meta: `${priceRecords} rows · text/csv`,
      desc: 'The same dataset as a flat spreadsheet table — one row per record, every field as a column.',
    },
    {
      title: 'Price fluctuations — JSON',
      href: '/assets/data/fluctuations.json',
      meta: 'Per-element windows · application/json',
      desc: 'Pre-computed price-change windows (7d/30d/90d/1y/all-time) per element and tier, with confidence and observation counts.',
    },
  ];

  return (
    <Container as="main" className="py-10">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Open Data' }]}
        eyebrow="Open Data"
        title="Open Data"
        lead="The full dataset behind lanthanides.io is open and inspectable. Every price carries source provenance; nothing is fabricated, interpolated, or model-generated. The data lives as versioned files in git — so it can be forked, audited, diffed, and cited — and is also served here as ready-to-use JSON and CSV exports."
      />

      {/* ── Coverage ─────────────────────────────────────────────────────── */}
      <StatGrid cols={5} className="mt-10">
        {stats.map(([value, label]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </StatGrid>

      {/* ── Dataset at a glance (rebuilt, data-honest visualizations, P10) ── */}
      <section className="mt-12">
        <SectionHeading
          title="Dataset at a glance"
          description={
            <>
              A few honest views derived from the data below. Each states its own
              sample size; nothing is drawn that the data cannot support. (Price
              trend lines live on each element page and appear only once a tier has
              enough distinct observation days — see{' '}
              <Link
                href="/methodology/"
                className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
              >
                methodology
              </Link>
              .)
            </>
          }
        />

        <div className="mt-8">
          <SectionHeading
            as="h3"
            title="Coverage by element"
            description="How much price data backs each tracked element. Thin coverage is shown, not hidden — transparency about data density is part of the provenance-first model. Each tile links to the element."
          />
          <CoverageGrid items={coverage} tally={coverageTally} />
        </div>

        <div className="mt-10">
          <SectionHeading
            as="h3"
            title="Control by category"
            description="Where active Chinese export control concentrates across the four material classes."
          />
          <div className="max-w-2xl">
            <MarketStructure rows={control} />
          </div>
        </div>

        <div className="mt-10">
          <SectionHeading
            as="h3"
            title="Retail premium leaderboard"
            description="The markup small-quantity buyers pay over commodity pricing — latest retail reference ÷ latest bulk benchmark, per element."
          />
          <PremiumLeaderboard rows={premiums} />
        </div>
      </section>

      {/* ── Downloads ────────────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading title="Downloads" />
        <div className="grid gap-3 md:grid-cols-2">
          {downloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              className="group flex flex-col border border-border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-fg group-hover:text-accent-strong">
                  {d.title}
                </span>
                <span aria-hidden="true" className="text-fg-dim group-hover:text-accent-strong">
                  ↓
                </span>
              </div>
              <span className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-fg-dim">
                {d.meta}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-fg-muted">
                {d.desc}
              </span>
            </a>
          ))}

          {/* Regulatory dataset lives as a structured page, not a flat file. */}
          <Link
            href="/regulatory/"
            className="group flex flex-col border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-fg group-hover:text-accent-strong">
                Regulatory tracker — {notices} notices
              </span>
              <span aria-hidden="true" className="text-fg-dim group-hover:text-accent-strong">
                →
              </span>
            </div>
            <span className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-fg-dim">
              Structured page · CC BY 4.0 Dataset
            </span>
            <span className="mt-2 text-sm leading-relaxed text-fg-muted">
              Every Chinese export-control announcement affecting these elements,
              with effective dates, affected elements, and current status. Sourced
              from <code className="font-mono text-xs">_data/regulatory/*.yml</code>.
            </span>
          </Link>
        </div>
      </section>

      {/* ── Source in git ────────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading title="Source of Truth" />
        <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
          The exports above are generated from the versioned reference data in the
          repository&rsquo;s{' '}
          <code className="font-mono text-xs">_data/</code> directory. The export
          API regenerates from those files on every build, so a download can never
          drift from what the site renders. Browse or fork the raw data:
        </p>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a
            href={`${REPO}/tree/main/_data`}
            target="_blank"
            rel="noopener"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            _data/ on GitHub →
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noopener"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            Repository →
          </a>
        </p>
      </section>

      {/* ── Licence & attribution ────────────────────────────────────────── */}
      <Callout tone="note" glyph={null} title="Licence & Attribution" className="mt-12">
        <p className="max-w-prose leading-relaxed">
          The dataset is licensed under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="license noopener"
          >
            Creative Commons Attribution 4.0 (CC BY 4.0)
          </a>
          . You are free to share and adapt it for any purpose, including
          commercially, provided you give appropriate credit. The site code is
          licensed{' '}
          <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">
            MIT
          </a>
          .
        </p>
        <p className="mt-3 max-w-prose leading-relaxed">
          Suggested citation:{' '}
          <span className="text-fg">
            lanthanides.io — Strategic Materials Ledger, price-records dataset (CC
            BY 4.0), www.lanthanides.io/data/.
          </span>{' '}
          See{' '}
          <Link href="/methodology/">Methodology</Link> for how each value is
          collected, normalised, and verified.
        </p>
      </Callout>
    </Container>
  );
}
