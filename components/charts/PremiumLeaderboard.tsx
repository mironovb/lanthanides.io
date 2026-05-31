'use client';

/**
 * PremiumLeaderboard — retail-to-bulk price premium per element, ranked
 * (KEEP, docs/AUDIT.md §3 #6). A table, not a chart: the premium ratio is a
 * genuine differentiator (small-quantity buyers pay a steep markup over
 * commodity pricing), and a sortable table conveys it cleanly.
 *
 * Defensibility (AUDIT §3 #6): a ratio can silently divide metal-retail by
 * oxide-bulk, inflating it. The "Basis" column states the form each side is
 * quoted in, so the number is never presented as a like-for-like spread without
 * disclosure.
 *
 * A client island purely so headers sort in place (mirrors ProvenanceTable /
 * PriceHistoryTable); fully present in the SSR HTML, works without JS. No I/O —
 * rows are passed in from the server.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PremiumLeaderboardRow } from '@/lib/types';
import { fmtPremium, fmtUsd } from '@/components/elements/format';

type SortKey = 'symbol' | 'retail' | 'bulk' | 'premium';
type SortDir = 'asc' | 'desc';

function valueFor(r: PremiumLeaderboardRow, key: SortKey): string | number {
  if (key === 'symbol') return r.symbol;
  if (key === 'retail') return r.retail_usd_per_kg;
  if (key === 'bulk') return r.bulk_usd_per_kg;
  return r.premium;
}

interface Column {
  label: string;
  sortKey: SortKey;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { label: 'Element', sortKey: 'symbol' },
  { label: 'Retail $/kg', sortKey: 'retail', numeric: true },
  { label: 'Bulk $/kg', sortKey: 'bulk', numeric: true },
  { label: 'Premium', sortKey: 'premium', numeric: true },
];

export function PremiumLeaderboard({ rows }: { rows: PremiumLeaderboardRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'premium',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = valueFor(a, sort.key);
      const bv = valueFor(b, sort.key);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sort]);

  if (rows.length === 0) return null;

  function onSort(col: Column) {
    setSort((prev) =>
      prev.key === col.sortKey
        ? { key: col.sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.sortKey, dir: col.numeric ? 'desc' : 'asc' },
    );
  }

  return (
    <div>
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
              <th className="whitespace-nowrap border-b border-border px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-dim">
                Basis
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.symbol}
                className="border-b border-border last:border-0 odd:bg-surface hover:bg-overlay"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/elements/${r.symbol}/`}
                    className="font-medium text-fg hover:text-accent-strong"
                  >
                    <span className="font-mono">{r.symbol}</span>{' '}
                    <span className="text-fg-muted">{r.name}</span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-fg">
                  ${fmtUsd(r.retail_usd_per_kg)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-fg">
                  ${fmtUsd(r.bulk_usd_per_kg)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums font-semibold text-accent-strong">
                  {fmtPremium(r.premium)}×
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-left font-mono text-2xs text-fg-dim">
                  {r.retail_form} / {r.bulk_form}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        Latest retail reference ÷ latest bulk benchmark, ranked by premium. The
        <span className="text-fg-dim"> Basis</span> column shows the form each
        side is quoted in — a metal-retail ÷ oxide-bulk ratio is not a
        like-for-like spread. Click a column to sort.
      </p>
    </div>
  );
}
