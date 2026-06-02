/**
 * CoverageGrid: the data-coverage heatmap (KEEP/REBUILD, docs/AUDIT.md §3 #7).
 * A categorical tile per element, shaded by how much price data backs it, with
 * the observation count printed on every tile. This is the honest meta-view of
 * sparsity: it turns thin coverage into a transparency signal rather than hiding
 * it.
 *
 * It is a heatmap-style grid, not a trend chart, so the line sufficiency gate
 * does not apply, but every tile still states its own sample size, and the
 * legend states the per-grade totals. Shading is a single monochrome teal
 * density ramp (one meaning: data density), deliberately NOT reusing the
 * price/risk colours.
 *
 * Server component, presentational only.
 */
import Link from 'next/link';
import type { CoverageTally, ElementCoverage } from '@/lib/types';

type Grade = ElementCoverage['quality'];

/**
 * Teal density ramp: darker = more data. Standard Tailwind opacity steps only
 * (/25, /10, /5), so every class is guaranteed to emit; full literals so the
 * content scanner sees them.
 */
const GRADE_TILE: Record<Grade, string> = {
  rich: 'border-accent/40 bg-accent/25 text-fg',
  moderate: 'border-accent/25 bg-accent/10 text-fg',
  sparse: 'border-border bg-accent/5 text-fg-muted',
  none: 'border-dashed border-border bg-surface text-fg-dim',
};

const GRADE_LABEL: Record<Grade, string> = {
  rich: 'Rich',
  moderate: 'Moderate',
  sparse: 'Sparse',
  none: 'None',
};

const LEGEND_ORDER: Grade[] = ['rich', 'moderate', 'sparse', 'none'];

export function CoverageGrid({
  items,
  tally,
}: {
  items: ElementCoverage[];
  tally: CoverageTally;
}) {
  const total = items.length;

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {items.map((el) => (
          <Link
            key={el.symbol}
            href={`/elements/${el.symbol}/`}
            title={`${el.name}: ${el.observations} observation${el.observations === 1 ? '' : 's'} (${GRADE_LABEL[el.quality].toLowerCase()} coverage)`}
            className={`flex flex-col items-center justify-center border px-1 py-2 transition-colors hover:border-accent ${GRADE_TILE[el.quality]}`}
          >
            <span className="font-sans text-sm font-bold">{el.symbol}</span>
            <span className="font-mono text-2xs tabular-nums text-fg-dim">
              {el.observations}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-fg-muted">
        <span className="font-mono uppercase tracking-wider text-fg-dim">
          {total} elements
        </span>
        {LEGEND_ORDER.map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 border ${GRADE_TILE[g]}`}
              aria-hidden="true"
            />
            {GRADE_LABEL[g]}{' '}
            <span className="font-mono tabular-nums text-fg-dim">{tally[g]}</span>
          </span>
        ))}
        <span className="text-fg-dim">· number on each tile = observations</span>
      </div>
    </div>
  );
}
