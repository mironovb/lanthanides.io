'use client';

/**
 * CoverageTable: the data-coverage drilldown that decodes the CoverageGrid.
 * One row per element — its grade, the individual-observation count and
 * distinct-day count the grade is computed from, which market tiers (retail /
 * bulk) back it, the observation window, and a link to the element page. It
 * turns the grid's monochrome density into explicit, sortable numbers so the
 * heatmap is never a colour with hidden meaning: the grade follows directly from
 * the distinct-day count shown, and the caption spells out the thresholds.
 *
 * Renders entirely in the initial HTML via the shared SortableTable (sorting is
 * pure progressive enhancement, so the full table is present and usable without
 * JS). Coverage is a transparency feature, not an apology: thin and empty
 * coverage stay visible, and there is no trend line or movement claim here — just
 * the counts behind each grade (CLAUDE.md hard rule #1).
 */
import Link from 'next/link';
import { SortableTable, type Column } from '@/components/ui';
import type { ElementCoverage } from '@/lib/types';
import {
  GRADE_DEFINITION,
  GRADE_LABEL,
  GRADE_RANK,
  GRADE_TILE,
  type CoverageGrade,
} from './coverage';

interface CoverageRow extends ElementCoverage {
  gradeRank: number; // numeric grade for sorting (rich highest)
}

/** Grade swatch + label, reusing the grid's tile classes so the table reads as
 *  the grid's legend made literal (same colour ⇒ same grade). */
function GradeCell({ grade }: { grade: CoverageGrade }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-3 shrink-0 border ${GRADE_TILE[grade]}`}
      />
      <span className="font-sans text-fg">{GRADE_LABEL[grade]}</span>
    </span>
  );
}

/** Tier availability: a monochrome present/absent mark (colour stays off the
 *  data axis), with the state spelled out for assistive tech. */
function Avail({ on, tier }: { on: boolean; tier: string }) {
  const status = on ? 'available' : 'not available';
  return (
    <span title={`${tier}: ${status}`}>
      <span aria-hidden="true" className={on ? 'text-fg' : 'text-fg-dim'}>
        {on ? '✓' : '—'}
      </span>
      <span className="sr-only">{status}</span>
    </span>
  );
}

/** First-to-latest observation date (ISO, the dense-table convention). A single
 *  day shows once; no data shows an explicit dash. */
function dateRange(since: string | null, until: string | null): string {
  if (!since && !until) return '—';
  if (since && until) return since === until ? since : `${since} – ${until}`;
  return (since ?? until) as string;
}

const COLUMNS: Column<CoverageRow>[] = [
  {
    key: 'symbol',
    header: 'Element',
    render: (r) => (
      <Link
        href={`/elements/${r.symbol}/`}
        className="text-fg transition-colors duration-fast hover:text-accent-strong"
      >
        <span className="font-mono font-semibold">{r.symbol}</span>{' '}
        <span className="hidden text-fg-muted sm:inline">{r.name}</span>
      </Link>
    ),
  },
  {
    header: 'Coverage',
    render: (r) => <GradeCell grade={r.quality} />,
  },
  {
    key: 'observations',
    header: 'Observations',
    numeric: true,
    render: (r) => r.observations,
  },
  {
    key: 'distinctDays',
    header: 'Distinct days',
    numeric: true,
    render: (r) => r.distinctDays,
  },
  {
    header: 'Retail',
    align: 'center',
    render: (r) => <Avail on={r.retailAvailable} tier="Retail" />,
  },
  {
    header: 'Bulk',
    align: 'center',
    render: (r) => <Avail on={r.bulkAvailable} tier="Bulk" />,
  },
  {
    header: 'Date range',
    render: (r) => (
      <span className="whitespace-nowrap font-mono text-2xs text-fg-muted">
        {dateRange(r.dataSince, r.dataUntil)}
      </span>
    ),
  },
];

export function CoverageTable({ items }: { items: ElementCoverage[] }) {
  const rows: CoverageRow[] = items.map((it) => ({
    ...it,
    gradeRank: GRADE_RANK[it.quality],
  }));
  const labBacked = rows.filter((r) => r.labAvailable).map((r) => r.symbol);

  return (
    <SortableTable
      columns={COLUMNS}
      rows={rows}
      getRowKey={(r) => r.symbol}
      initialSort={{ key: 'distinctDays', dir: 'desc' }}
      emptyMessage="No elements to detail."
      caption={
        <>
          Grade reflects how many distinct days of observations back an element —{' '}
          <span className="text-fg-muted">rich</span>: {GRADE_DEFINITION.rich} ·{' '}
          <span className="text-fg-muted">moderate</span>:{' '}
          {GRADE_DEFINITION.moderate} ·{' '}
          <span className="text-fg-muted">sparse</span>:{' '}
          {GRADE_DEFINITION.sparse} ·{' '}
          <span className="text-fg-muted">none</span>: {GRADE_DEFINITION.none}.
          Observation counts exclude median-aggregate rows.
        </>
      }
      footnote={
        <>
          {rows.length} element{rows.length === 1 ? '' : 's'} · sorted by distinct
          days; click any header to re-sort. Retail and Bulk mark whether that
          tier has any observations on file
          {labBacked.length > 0
            ? ` · lab-tier data backs ${labBacked.join(', ')}`
            : ''}
          .
        </>
      }
    />
  );
}
