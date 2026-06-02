/**
 * Grid legend from the old home (_layouts/home.html, .grid-legend): the four
 * category swatches with their live counts, and the two tile indicator icons
 * (China export control, high demand). Counts come from the data layer. Reuses
 * the shared category styles so names and colours match the elements index.
 *
 * Presentational, server component.
 */
import type { ElementCategory } from '@/lib/types';
import {
  CATEGORY_ORDER,
  CATEGORY_STYLE,
} from '@/components/elements/categories';

export function CategoryLegend({
  counts,
}: {
  counts: Record<ElementCategory, number>;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {CATEGORY_ORDER.map((cat) => {
          const style = CATEGORY_STYLE[cat];
          return (
            <span
              key={cat}
              className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted"
            >
              <span
                className={`inline-block h-3 w-3 shrink-0 rounded-sm ${style.swatch}`}
                aria-hidden="true"
              />
              {style.label}
              <span className="font-mono text-2xs font-normal text-fg-dim">
                {counts[cat]}
              </span>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-dim">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true">❗</span> China export control
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true">🔥</span> High demand
        </span>
      </div>
    </div>
  );
}
