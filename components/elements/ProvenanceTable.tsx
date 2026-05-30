'use client';

/**
 * The full provenance / all-offers table for one element — every tracked price
 * record with its seller, origin, date, form, purity, quantity, MOQ, normalized
 * USD/kg, original price + currency, source type, verification status, and
 * confidence. This provenance is a core trust asset (Prompt 6), so the table is
 * complete and sortable.
 *
 * It is the single interactive island on the detail page: a Client Component so
 * column headers sort in place (default: newest first). Everything renders in the
 * initial SSR HTML too, so it works without JS and stays crawlable. Records are
 * passed in from the server (`getPriceRecords(symbol)`); this component does no
 * I/O. Expands the legacy 6-column `provenance-table.html` to the full schema.
 */
import { useMemo, useState } from 'react';
import type { PriceRecord } from '@/lib/types';
import { capitalize, fmtUsd, humanize } from './format';

type SortKey =
  | 'quote_date'
  | 'form'
  | 'normalized_usd_per_kg'
  | 'quoted_quantity_kg'
  | 'confidence_score'
  | 'seller_name'
  | 'seller_country';

type SortDir = 'asc' | 'desc';

interface Column {
  label: string;
  sortKey?: SortKey;
  numeric?: boolean;
  render: (r: PriceRecord) => React.ReactNode;
}

const COLUMNS: Column[] = [
  { label: 'Date', sortKey: 'quote_date', render: (r) => r.quote_date },
  { label: 'Form', sortKey: 'form', render: (r) => capitalize(r.form) },
  { label: 'Purity', render: (r) => r.purity || '—' },
  {
    label: 'Qty',
    sortKey: 'quoted_quantity_kg',
    numeric: true,
    render: (r) =>
      r.quoted_quantity_kg != null ? `${r.quoted_quantity_kg} kg` : '—',
  },
  {
    label: 'MOQ',
    numeric: true,
    render: (r) => (r.moq_kg != null ? `${r.moq_kg} kg` : '—'),
  },
  {
    label: 'USD/kg',
    sortKey: 'normalized_usd_per_kg',
    numeric: true,
    render: (r) => `$${fmtUsd(r.normalized_usd_per_kg)}`,
  },
  {
    label: 'Original',
    numeric: true,
    render: (r) =>
      r.original_price_per_unit != null
        ? `${fmtUsd(r.original_price_per_unit)} ${r.original_currency ?? ''}/${
            r.original_unit ?? ''
          }`
        : '—',
  },
  { label: 'Source', render: (r) => humanize(r.source_type) },
  { label: 'Seller', sortKey: 'seller_name', render: (r) => r.seller_name || '—' },
  {
    label: 'Country',
    sortKey: 'seller_country',
    render: (r) => r.seller_country || '—',
  },
  { label: 'Verification', render: (r) => humanize(r.verification_status) },
  {
    label: 'Conf.',
    sortKey: 'confidence_score',
    numeric: true,
    render: (r) => r.confidence_score.toFixed(2),
  },
];

function compare(a: PriceRecord, b: PriceRecord, key: SortKey, dir: SortDir) {
  const av = a[key];
  const bv = b[key];
  // Nulls always sort last, regardless of direction.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const cmp =
    typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
  return dir === 'asc' ? cmp : -cmp;
}

export function ProvenanceTable({ records }: { records: PriceRecord[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'quote_date',
    dir: 'desc',
  });

  const sorted = useMemo(
    () => [...records].sort((a, b) => compare(a, b, sort.key, sort.dir)),
    [records, sort],
  );

  function onSort(col: Column) {
    if (!col.sortKey) return;
    const key = col.sortKey;
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: col.numeric || key === 'quote_date' ? 'desc' : 'asc' },
    );
  }

  if (records.length === 0) {
    return (
      <div className="border border-border bg-surface px-4 py-8 text-center text-sm text-fg-dim">
        No price records for this element.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-raised">
              {COLUMNS.map((col) => {
                const active = col.sortKey && sort.key === col.sortKey;
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
                    className={`whitespace-nowrap border-b border-border px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-dim ${
                      col.numeric ? 'text-right' : 'text-left'
                    } ${col.sortKey ? 'cursor-pointer select-none hover:text-fg' : ''}`}
                    onClick={() => onSort(col)}
                  >
                    {col.label}
                    {col.sortKey ? (
                      <span className="ml-1 text-fg-dim">
                        {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
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
                    {col.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-2xs text-fg-dim">
        {records.length} record{records.length !== 1 ? 's' : ''} · click a column
        to sort
      </p>
    </div>
  );
}
