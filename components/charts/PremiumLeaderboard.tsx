'use client';

/**
 * PremiumLeaderboard: retail-to-bulk price premium per element, ranked
 * (KEEP, docs/AUDIT.md §3 #6). A table, not a chart: the premium ratio is a
 * genuine differentiator (small-quantity buyers pay a steep markup over
 * commodity pricing), and a sortable table conveys it cleanly.
 *
 * Basis disclosure is the load-bearing feature here. A ratio can silently divide
 * metal-retail by oxide-bulk, which inflates it and is NOT a like-for-like spread
 * (the two largest premiums in the live data, Ce and Li, are exactly this). So
 * every row states the form AND the source date each side is quoted in, and is
 * tagged like-for-like (same form) or cross-form (forms differ). Two filters let
 * a reader isolate the trustworthy same-form spreads or the inverse (<1×) edge
 * cases, and the footnote separates this "premium multiple" from a price trend
 * over time (CLAUDE.md hard rule #1: never imply a like-for-like spread when the
 * forms differ).
 *
 * A client island purely so headers sort in place and the two filters toggle
 * (mirrors ProvenanceTable / PriceHistoryTable); the full, unfiltered table is
 * present in the SSR HTML and works without JS. No I/O: rows are passed in from
 * the server. Composes the shared Table primitives (P12). Numerics stay mono +
 * tabular via the `numeric` prop on <TD>/<TH>.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PremiumLeaderboardRow } from '@/lib/types';
import { Table, THead, TBody, TR, TH, TD, cn } from '@/components/ui';
import { fmtPremium, fmtUsdPrice } from '@/components/elements/format';

type SortKey = 'symbol' | 'retail' | 'bulk' | 'premium' | 'comparison';
type SortDir = 'asc' | 'desc';

/** A row is like-for-like only when both sides are quoted in the same form. */
function isSameForm(r: PremiumLeaderboardRow): boolean {
  return r.retail_form === r.bulk_form;
}

function valueFor(r: PremiumLeaderboardRow, key: SortKey): string | number {
  if (key === 'symbol') return r.symbol;
  if (key === 'retail') return r.retail_usd_per_kg;
  if (key === 'bulk') return r.bulk_usd_per_kg;
  if (key === 'comparison') return isSameForm(r) ? 1 : 0;
  return r.premium;
}

interface Column {
  label: string;
  sortKey: SortKey;
  numeric?: boolean;
  /** Sort descending first when newly selected (numeric + the comparison group). */
  defaultDesc?: boolean;
}

const COLUMNS: Column[] = [
  { label: 'Element', sortKey: 'symbol' },
  { label: 'Retail $/kg', sortKey: 'retail', numeric: true },
  { label: 'Bulk $/kg', sortKey: 'bulk', numeric: true },
  { label: 'Premium', sortKey: 'premium', numeric: true },
  { label: 'Comparison', sortKey: 'comparison', defaultDesc: true },
];

/** Filter-toggle chip, styled to match the shared FilterChips active state. */
function Toggle({
  pressed,
  onClick,
  title,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-sm border px-2 py-0.5 font-mono text-2xs font-semibold transition-colors duration-fast',
        pressed
          ? 'border-accent bg-accent text-white'
          : 'border-border bg-raised text-fg-muted hover:border-accent hover:text-accent-strong',
      )}
    >
      {children}
    </button>
  );
}

/** like-for-like / cross-form tag. Monochrome by design: colour on this site
 *  only encodes movement/risk/category, never a data caveat, so cross-form is
 *  set apart by weight and a stronger hairline, not a hue. */
function Comparison({ row }: { row: PremiumLeaderboardRow }) {
  if (isSameForm(row)) {
    return (
      <span
        title="Both sides quoted in the same form: a like-for-like spread."
        className="inline-flex items-center rounded-sm border border-border bg-raised px-1.5 py-0.5 text-2xs text-fg-muted"
      >
        like-for-like
      </span>
    );
  }
  return (
    <span
      title={`Forms differ (retail ${row.retail_form} vs bulk ${row.bulk_form}); this multiple is not a like-for-like spread.`}
      className="inline-flex items-center rounded-sm border border-border-strong bg-raised px-1.5 py-0.5 text-2xs font-medium text-fg"
    >
      cross-form
    </span>
  );
}

/** Form + source date for each side; purity rides in the tooltip (hard rule #1:
 *  show what the number rests on, including where the two sides aren't strictly
 *  comparable). */
function Basis({ row }: { row: PremiumLeaderboardRow }) {
  const title =
    `Retail: ${row.retail_form}, ${row.retail_purity ?? 'purity unstated'}, quoted ${row.retail_date}. ` +
    `Bulk: ${row.bulk_form}, ${row.bulk_purity ?? 'purity unstated'}, quoted ${row.bulk_date}.`;
  return (
    <span
      title={title}
      className="block font-mono text-2xs leading-snug text-fg-dim"
    >
      <span className="block tabular-nums">
        <span className="text-fg-muted">retail</span> {row.retail_form} ·{' '}
        {row.retail_date}
      </span>
      <span className="block tabular-nums">
        <span className="text-fg-muted">bulk</span> {row.bulk_form} ·{' '}
        {row.bulk_date}
      </span>
    </span>
  );
}

export function PremiumLeaderboard({ rows }: { rows: PremiumLeaderboardRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'premium',
    dir: 'desc',
  });
  const [likeForLikeOnly, setLikeForLikeOnly] = useState(false);
  const [inverseOnly, setInverseOnly] = useState(false);

  // Stable totals (from the full input), shown so the basis of the board is
  // legible at a glance and a filtered view never hides its denominator.
  const sameFormCount = useMemo(
    () => rows.filter(isSameForm).length,
    [rows],
  );
  const inverseCount = useMemo(
    () => rows.filter((r) => r.premium < 1).length,
    [rows],
  );
  const crossFormCount = rows.length - sameFormCount;

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!likeForLikeOnly || isSameForm(r)) &&
          (!inverseOnly || r.premium < 1),
      ),
    [rows, likeForLikeOnly, inverseOnly],
  );

  const sorted = useMemo(() => {
    const out = [...filtered];
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
  }, [filtered, sort]);

  if (rows.length === 0) return null;

  const filterActive = likeForLikeOnly || inverseOnly;
  function clearFilters() {
    setLikeForLikeOnly(false);
    setInverseOnly(false);
  }

  function onSort(col: Column) {
    setSort((prev) =>
      prev.key === col.sortKey
        ? { key: col.sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : {
            key: col.sortKey,
            dir: col.numeric || col.defaultDesc ? 'desc' : 'asc',
          },
    );
  }

  return (
    <div>
      {/* Summary + filters: the board's denominator stays visible, and a reader
          can isolate the trustworthy same-form spreads or the inverse cases. */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="font-mono text-2xs text-fg-dim">
          <span className="text-fg-muted">{rows.length}</span> rows{' · '}
          <span className="text-fg-muted">{sameFormCount}</span> like-for-like
          {' · '}
          <span className="text-fg-muted">{crossFormCount}</span> cross-form
          {inverseCount > 0 ? (
            <>
              {' · '}
              <span className="text-fg-muted">{inverseCount}</span> inverse
            </>
          ) : null}
          {filterActive ? (
            <>
              {' · showing '}
              <span className="text-fg-muted">{sorted.length}</span>
            </>
          ) : null}
        </p>
        <div
          role="group"
          aria-label="Filter rows"
          className="flex flex-wrap items-center gap-1"
        >
          <Toggle
            pressed={likeForLikeOnly}
            onClick={() => setLikeForLikeOnly((v) => !v)}
            title="Show only rows where retail and bulk are quoted in the same form (a true like-for-like spread)."
          >
            Like-for-like only
          </Toggle>
          <Toggle
            pressed={inverseOnly}
            onClick={() => setInverseOnly((v) => !v)}
            title="Show only inverse rows, below 1×, where the retail reference is cheaper than the bulk benchmark."
          >
            Inverse only
          </Toggle>
          {filterActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="px-1 text-2xs text-fg-dim underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-fg"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <Table>
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
            <TH>Basis (form · date)</TH>
          </TR>
        </THead>
        <TBody>
          {sorted.length === 0 ? (
            <TR hover={false}>
              <TD colSpan={6} align="center" className="text-fg-dim">
                No rows match these filters.{' '}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="underline decoration-dotted underline-offset-2 hover:text-fg"
                >
                  Clear
                </button>
              </TD>
            </TR>
          ) : (
            sorted.map((r) => {
              const inverse = r.premium < 1;
              return (
                <TR key={r.symbol}>
                  <TD>
                    <Link
                      href={`/elements/${r.symbol}/`}
                      className="font-medium text-fg hover:text-accent-strong"
                    >
                      <span className="font-mono">{r.symbol}</span>{' '}
                      <span className="text-fg-muted">{r.name}</span>
                    </Link>
                  </TD>
                  <TD numeric>{fmtUsdPrice(r.retail_usd_per_kg)}</TD>
                  <TD numeric>{fmtUsdPrice(r.bulk_usd_per_kg)}</TD>
                  <TD numeric>
                    {inverse ? (
                      <span
                        className="font-semibold text-neutral"
                        title="Inverse: retail undercuts the bulk benchmark (below 1×)."
                      >
                        {fmtPremium(r.premium)}×
                      </span>
                    ) : (
                      <span className="font-semibold text-fg">
                        {fmtPremium(r.premium)}×
                      </span>
                    )}
                  </TD>
                  <TD>
                    <Comparison row={r} />
                  </TD>
                  <TD>
                    <Basis row={r} />
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      {/* The methodology caveat: what a premium multiple is, and what it is not. */}
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-fg-muted">
        <p>
          <span className="font-semibold text-fg">
            A premium multiple, not a market trend.
          </span>{' '}
          Each premium is the latest retail reference price divided by the latest
          bulk benchmark for that element: a snapshot of the markup a
          small-quantity buyer pays over wholesale, taken at one point in time. It
          is not a price change over time and not a market trend. For movement
          over time, see{' '}
          <Link
            href="/movements/"
            className="text-accent hover:text-accent-strong"
          >
            Market Movements
          </Link>
          .
        </p>
        <p>
          <span className="font-semibold text-fg">
            Like-for-like vs cross-form.
          </span>{' '}
          A multiple is a clean spread only when both sides are quoted in the same
          form. Rows where the forms differ (for example metal vs oxide) compare
          different materials and are tagged{' '}
          <span className="font-medium text-fg">cross-form</span>; their multiple
          is not a like-for-like spread. Use{' '}
          <span className="font-medium text-fg">Like-for-like only</span> to limit
          the table to same-form rows. Purity can still differ within a form
          (shown on hover over the Basis cell), so treat every multiple as
          indicative. A premium below 1× (inverse) means the retail reference is
          cheaper than the bulk benchmark, usually a form or purity mismatch
          rather than a real discount. Click any column to sort.
        </p>
      </div>
    </div>
  );
}
