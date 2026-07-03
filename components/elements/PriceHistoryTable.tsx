'use client';

/**
 * Price History: a sortable table of an element's dated price observations
 * (date, tier, form, USD/kg, source). It replaces the legacy line chart
 * because most elements have observations on at most 2 distinct days, too few
 * to support a line (docs/VISUALIZATION-AUDIT.md). Derived `median_aggregate`
 * rows are excluded so raw listings are not double-counted; renders nothing
 * when there are no recorded observations. Client island so headers sort in
 * place, fully present in the SSR HTML.
 */
import { useMemo, useState } from 'react';
import type { PriceHistory, PriceObservation } from '@/lib/types';
import { Panel, Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { capitalize, fmtUsdPrice } from './format';

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
  { label: 'Form', sortKey: 'form', render: (o) => (o.form ? capitalize(o.form) : 'n/a') },
  {
    label: 'USD/kg',
    sortKey: 'price_per_kg',
    numeric: true,
    render: (o) => fmtUsdPrice(o.price_per_kg),
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

  // Recorded observations only. Drop the derived daily medians.
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
    <Panel
      title="Price History"
      className="mb-6"
      actions={
        <span className="font-mono text-2xs uppercase tracking-caps text-fg-muted">
          {sample}
        </span>
      }
    >
      <Table bordered={false}>
        <THead>
          <TR hover={false}>
            {COLUMNS.map((col) => {
              const active = sort.key === col.sortKey;
              return (
                <TH
                  key={col.label}
                  numeric={col.numeric}
                  sortable
                  sortDir={active ? sort.dir : null}
                  onSort={() => onSort(col)}
                >
                  {col.label}
                </TH>
              );
            })}
          </TR>
        </THead>
        <TBody>
          {sorted.map((o, i) => (
            <TR key={`${o.date}-${o.tier}-${o.record_id ?? i}`}>
              {COLUMNS.map((col) => (
                <TD key={col.label} numeric={col.numeric}>
                  {col.render(o)}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>

      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        The {elementName} series is too sparse to chart as a trend line, so
        each observation is listed instead.
      </p>
    </Panel>
  );
}
