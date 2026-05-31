'use client';

/**
 * Price History — a sortable TABLE of an element's dated price observations
 * (date · tier · form · USD/kg · source). This is the deliberate replacement
 * for the legacy per-element inline-SVG price-history line chart
 * (legacy/_includes/price-chart.html + legacy/assets/js/charts.js), per
 * docs/AUDIT.md §3 (#1) and docs/VISUALIZATION-AUDIT.md.
 *
 * Why a table, never a line: across the catalog the price series is essentially
 * two collection days — 29 of 31 elements have ≤2 distinct observation days, and
 * the richest has 3. A polyline drawn through ≤2 points is either flat, choppy,
 * or reads as a trend the data cannot support. So we draw NO line at any point
 * count; we list every observation and state the sample size honestly.
 *
 * Derived `median_aggregate` rows are excluded — they are computed daily medians,
 * not recorded offers, and would double-count the raw listings they summarise
 * (the legacy chart excluded them too). Renders nothing when an element has no
 * recorded raw observation, so no empty section ever ships.
 *
 * Mirrors ProvenanceTable: a single client island so headers sort in place, but
 * fully present in the SSR HTML (works without JS, stays crawlable). No I/O.
 */
import { useMemo, useState } from 'react';
import type { PriceHistory, PriceObservation } from '@/lib/types';
import { capitalize, fmtUsd } from './format';

type SortKey = 'date' | 'tier' | 'form' | 'price_per_kg' | 'source';
type SortDir = 'asc' | 'desc';

/** Human-readable source label: the named seller when present, else the raw source id/string. */
function sourceLabel(o: PriceObservation): string {
  return o.seller ?? o.source;
}

interface Column {
  label: string;
  sortKey: SortKey;
  numeric?: boolean;
  render: (o: PriceObservation) => React.ReactNode;
}

const COLUMNS: Column[] = [
  { label: 'Date', sortKey: 'date', render: (o) => o.date },
  { label: 'Tier', sortKey: 'tier', render: (o) => capitalize(o.tier) },
  { label: 'Form', sortKey: 'form', render: (o) => (o.form ? capitalize(o.form) : '—') },
  {
    label: 'USD/kg',
    sortKey: 'price_per_kg',
    numeric: true,
    render: (o) => `$${fmtUsd(o.price_per_kg)}`,
  },
  { label: 'Source', sortKey: 'source', render: (o) => sourceLabel(o) },
];

function valueFor(o: PriceObservation, key: SortKey): string | number | undefined {
  return key === 'source' ? sourceLabel(o) : o[key];
}

function compare(
  a: PriceObservation,
  b: PriceObservation,
  key: SortKey,
  dir: SortDir,
) {
  const av = valueFor(a, key);
  const bv = valueFor(b, key);
  // Nulls/undefined always sort last, regardless of direction.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const cmp =
    typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
  return dir === 'asc' ? cmp : -cmp;
}

export function PriceHistoryTable({
  history,
  elementName,
}: {
  history: PriceHistory | null;
  elementName: string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'date',
    dir: 'desc',
  });

  // Recorded observations only — drop the derived daily medians.
  const observations = useMemo(
    () =>
      (history?.observations ?? []).filter(
        (o) => o.source !== 'median_aggregate' && o.source_type !== 'aggregate',
      ),
    [history],
  );

  const sorted = useMemo(
    () => [...observations].sort((a, b) => compare(a, b, sort.key, sort.dir)),
    [observations, sort],
  );

  if (observations.length === 0) return null;

  const distinctDays = new Set(observations.map((o) => o.date)).size;
  const sample = `${observations.length} observation${
    observations.length === 1 ? '' : 's'
  } across ${distinctDays} day${distinctDays === 1 ? '' : 's'}`;

  function onSort(col: Column) {
    const key = col.sortKey;
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: col.numeric || key === 'date' ? 'desc' : 'asc' },
    );
  }

  return (
    <section
      className="mb-6 border border-border bg-surface p-4"
      aria-labelledby="price-history-title"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2
          id="price-history-title"
          className="font-serif text-lg font-semibold text-fg"
        >
          Price History
        </h2>
        <span className="font-mono text-2xs uppercase tracking-wide text-fg-muted">
          {sample}
        </span>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-raised">
              {COLUMNS.map((col) => {
                const active = sort.key === col.sortKey;
                return (
                  <th
                    key={col.label}
                    aria-sort={
                      active
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={`cursor-pointer select-none whitespace-nowrap border-b border-border px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-dim hover:text-fg ${
                      col.numeric ? 'text-right' : 'text-left'
                    }`}
                    onClick={() => onSort(col)}
                  >
                    {col.label}
                    <span className="ml-1 text-fg-dim">
                      {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((o, i) => (
              <tr
                key={`${o.date}-${o.tier}-${o.record_id ?? i}`}
                className="border-b border-border last:border-0 odd:bg-surface hover:bg-overlay"
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.label}
                    className={`px-3 py-2 align-top ${
                      col.numeric
                        ? 'whitespace-nowrap text-right font-mono tabular-nums text-fg'
                        : 'text-fg-muted'
                    }`}
                  >
                    {col.render(o)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        {elementName} price observations as a dated table, not a trend line: the
        series is too sparse and unevenly spaced ({sample}) to plot without
        implying movement between points that was never observed. Click a column
        to sort.
      </p>
    </section>
  );
}
