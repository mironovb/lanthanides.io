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
 * price/risk colours. The CoverageTable drilldown below it decodes what each
 * grade means in observations and distinct days, so the colour is never hidden
 * meaning; grade vocabulary is shared via ./coverage so the two never drift.
 *
 * Server component, presentational only.
 */
import Link from 'next/link';
import type { CoverageTally, ElementCoverage } from '@/lib/types';
import { GRADE_LABEL, GRADE_ORDER, GRADE_TILE } from './coverage';

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
        {GRADE_ORDER.map((g) => (
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
