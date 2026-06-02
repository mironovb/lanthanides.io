/**
 * BarTable: a labeled horizontal bar-in-table. The deliberate, honest
 * alternative to a pie/donut for categorical magnitudes (docs/AUDIT.md §3,
 * Prompt 10): every row shows its label, a proportional bar, and the exact
 * number, so the value is always legible without decoding angles or colour.
 *
 * No data-sufficiency gate is needed because this charts categorical counts, not a
 * trend, so it never implies movement. No animation (bar widths are static
 * inline styles). Server component, presentational only.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';

export interface BarRow {
  /** Row label (left column). */
  label: ReactNode;
  /** Bar magnitude. */
  value: number;
  /** Bar denominator (full-width reference). */
  max: number;
  /** Exact figure shown at the row end (defaults to `value`). */
  display?: string;
  /** Full Tailwind `bg-*` class for the bar fill (literal). */
  barClass?: string;
  /** Optional link target for the whole row label. */
  href?: string;
}

export function BarTable({
  rows,
  ariaLabel,
}: {
  rows: BarRow[];
  ariaLabel?: string;
}) {
  return (
    <table className="w-full border-collapse text-sm" aria-label={ariaLabel}>
      <tbody>
        {rows.map((row, i) => {
          const pct = row.max > 0 ? Math.round((row.value / row.max) * 100) : 0;
          const label = row.href ? (
            <Link href={row.href} className="text-fg hover:text-accent-strong">
              {row.label}
            </Link>
          ) : (
            row.label
          );
          return (
            <tr key={i} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="whitespace-nowrap py-2 pr-3 text-left text-xs font-semibold text-fg"
              >
                {label}
              </th>
              <td className="w-full py-2 pr-3 align-middle">
                <div
                  className="h-2.5 w-full overflow-hidden bg-raised"
                  role="presentation"
                >
                  <div
                    className={`h-full ${row.barClass ?? 'bg-accent'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </td>
              <td className="whitespace-nowrap py-2 text-right font-mono text-xs tabular-nums text-fg-muted">
                {row.display ?? row.value}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
