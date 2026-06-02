/**
 * MarketStructure: how China export control concentrates across the four
 * material categories, as a labeled bar-in-table (Prompt 10). Genuinely
 * informative: it shows that control is concentrated in the rare
 * earths, not spread evenly. A bar-in-table (not a pie) keeps every count
 * legible (docs/VISUALIZATION-AUDIT.md).
 *
 * Server component. Counts come straight from the catalog. No fabrication.
 */
import type { CategoryControl } from '@/lib/types';
import { CATEGORY_STYLE } from '@/components/elements/categories';
import { BarTable, type BarRow } from './BarTable';

export function MarketStructure({ rows }: { rows: CategoryControl[] }) {
  const totalControlled = rows.reduce((n, r) => n + r.controlled, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);

  const barRows: BarRow[] = rows.map((r) => {
    const style = CATEGORY_STYLE[r.category];
    return {
      label: style.label,
      value: r.controlled,
      max: r.total,
      display: `${r.controlled} / ${r.total}`,
      barClass: style.swatch,
    };
  });

  return (
    <div>
      <BarTable
        rows={barRows}
        ariaLabel="China-export-controlled elements by category"
      />
      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        Bars show the share of each category currently under active Chinese
        export control ({totalControlled} of {total} tracked elements). Control
        is concentrated in the rare earths. The count beside each bar is the
        exact figure (controlled / total in the category).
      </p>
    </div>
  );
}
