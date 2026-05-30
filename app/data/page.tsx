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
  getElements,
  getPriceRecords,
  getRegulatoryNotices,
  getSourceBreakdown,
  getSources,
} from '@/lib/data';

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
      external: false,
    },
    {
      title: 'Price records — CSV',
      href: '/api/export/csv/',
      meta: `${priceRecords} rows · text/csv`,
      desc: 'The same dataset as a flat spreadsheet table — one row per record, every field as a column.',
      external: false,
    },
    {
      title: 'Price fluctuations — JSON',
      href: '/assets/data/fluctuations.json',
      meta: 'Per-element windows · application/json',
      desc: 'Pre-computed price-change windows (7d/30d/90d/1y/all-time) per element and tier, with confidence and observation counts.',
      external: false,
    },
  ];

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">Open Data</span>
      </nav>

      <header className="border-b border-border-strong pb-6">
        <h1 className="font-serif text-3xl font-semibold text-fg">Open Data</h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-fg-muted">
          The full dataset behind lanthanides.io is open and inspectable. Every
          price carries source provenance; nothing is fabricated, interpolated, or
          model-generated. The data lives as versioned files in git — so it can be
          forked, audited, diffed, and cited — and is also served here as
          ready-to-use JSON and CSV exports.
        </p>
      </header>

      {/* ── Coverage ─────────────────────────────────────────────────────── */}
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-5">
        {stats.map(([value, label]) => (
          <div key={label} className="bg-surface px-4 py-5 text-center">
            <dd className="font-mono text-2xl tabular-nums text-fg">{value}</dd>
            <dt className="mt-1 font-mono text-2xs uppercase tracking-wider text-fg-dim">
              {label}
            </dt>
          </div>
        ))}
      </dl>

      {/* ── Downloads ────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-4 border-b border-border pb-2 font-serif text-lg font-semibold text-fg">
          Downloads
        </h2>
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
      <section className="mt-10">
        <h2 className="mb-4 border-b border-border pb-2 font-serif text-lg font-semibold text-fg">
          Source of Truth
        </h2>
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
      <section className="mt-10 border border-l-[3px] border-border border-l-accent bg-surface px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg">
          Licence &amp; Attribution
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
          The dataset is licensed under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="license noopener"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            Creative Commons Attribution 4.0 (CC BY 4.0)
          </a>
          . You are free to share and adapt it for any purpose, including
          commercially, provided you give appropriate credit. The site code is
          licensed{' '}
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            MIT
          </a>
          .
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
          Suggested citation:{' '}
          <span className="text-fg">
            lanthanides.io — Strategic Materials Ledger, price-records dataset (CC
            BY 4.0), www.lanthanides.io/data/.
          </span>{' '}
          See{' '}
          <Link
            href="/methodology/"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            Methodology
          </Link>{' '}
          for how each value is collected, normalised, and verified.
        </p>
      </section>
    </main>
  );
}
