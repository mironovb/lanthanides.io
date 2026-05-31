'use client';

/**
 * useSortable + SortableTable — the sortable-header table, generalized from the
 * provenance table's proven sort logic (null values always sort last; numbers
 * compare numerically, everything else by locale string). Renders entirely in
 * the initial HTML, so it works without JS and stays crawlable; sorting is the
 * only client behavior.
 *
 * `useSortable` is exposed on its own for tables that need custom cell markup;
 * `SortableTable` is the column-driven convenience for the common case.
 */
import { useMemo, useState } from 'react';
import { Table, THead, TBody, TR, TH, TD } from './Table';

export type SortDir = 'asc' | 'desc';

function compareValues(av: unknown, bv: unknown, dir: SortDir): number {
  if (av == null && bv == null) return 0;
  if (av == null) return 1; // nulls last, regardless of direction
  if (bv == null) return -1;
  const cmp =
    typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
  return dir === 'asc' ? cmp : -cmp;
}

export function useSortable<T>(
  rows: T[],
  initial: { key: keyof T | null; dir?: SortDir } = { key: null },
) {
  const [sort, setSort] = useState<{ key: keyof T | null; dir: SortDir }>({
    key: initial.key,
    dir: initial.dir ?? 'asc',
  });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const key = sort.key;
    return [...rows].sort((a, b) => compareValues(a[key], b[key], sort.dir));
  }, [rows, sort]);

  /** Toggle the active column; first click on a numeric column sorts desc. */
  function toggle(key: keyof T, opts?: { numeric?: boolean }) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: opts?.numeric ? 'desc' : 'asc' },
    );
  }

  return { sorted, sortKey: sort.key, sortDir: sort.dir, toggle };
}

export interface Column<T> {
  /** Field to sort by. Omit for a non-sortable display-only column. */
  key?: keyof T;
  header: React.ReactNode;
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

export interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  initialSort?: { key: keyof T; dir?: SortDir };
  caption?: React.ReactNode;
  /** Footnote line under the table (e.g. record count + a sort hint). */
  footnote?: React.ReactNode;
  emptyMessage?: React.ReactNode;
}

export function SortableTable<T>({
  columns,
  rows,
  getRowKey,
  initialSort,
  caption,
  footnote,
  emptyMessage = 'No records.',
}: SortableTableProps<T>) {
  const { sorted, sortKey, sortDir, toggle } = useSortable<T>(
    rows,
    initialSort ?? { key: null },
  );

  if (rows.length === 0) {
    return (
      <div className="border border-border bg-surface px-4 py-8 text-center text-sm text-fg-dim">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <Table caption={caption}>
        <THead>
          <TR hover={false}>
            {columns.map((col, i) => {
              const sortable = col.key != null;
              const active = sortable && sortKey === col.key;
              return (
                <TH
                  key={i}
                  numeric={col.numeric}
                  align={col.align}
                  sortable={sortable}
                  sortDir={active ? sortDir : sortable ? null : undefined}
                  onSort={
                    col.key != null
                      ? () => toggle(col.key as keyof T, { numeric: col.numeric })
                      : undefined
                  }
                >
                  {col.header}
                </TH>
              );
            })}
          </TR>
        </THead>
        <TBody>
          {sorted.map((row, i) => (
            <TR key={getRowKey(row, i)}>
              {columns.map((col, j) => (
                <TD key={j} numeric={col.numeric} align={col.align}>
                  {col.render(row)}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
      {footnote ? (
        <p className="mt-2 font-mono text-2xs text-fg-dim">{footnote}</p>
      ) : null}
    </div>
  );
}
