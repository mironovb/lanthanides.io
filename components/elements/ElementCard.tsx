/**
 * Element tile: a periodic-table cell fused with a price-ledger row.
 *
 * The anatomy follows the periodic convention (atomic number in the top-left
 * corner, the symbol set large, the name beneath) and ends in a two-line
 * ledger (retail, then bulk) whose tabular figures right-align: with the grid
 * rows equalised (auto-rows-fr) the prices line up across neighbouring tiles,
 * so a section scans like one table.
 *
 * One colour voice per axis, nothing decorative (design tokens): the 2px top
 * band is the category; a small dot is the export-control status (risk-high
 * restricted, risk-medium monitored, none for normal); 🔥 marks high demand.
 * The category microlabel, tint wash, left band, and status pill of the old
 * tile are gone: the section heading already names the category, and the dot
 * says more than the pill did in a fraction of the space.
 *
 * The whole tile links to the element detail page. Server component.
 */
import Link from 'next/link';
import type { Element, ExportControlStatus, PriceRecord } from '@/lib/types';
import { CATEGORY_STYLE } from './categories';
import { fmtUsdPrice } from './format';

/**
 * Export-control marks. Colour encodes the risk scale, but the SHAPE carries
 * the distinction (solid dot vs hollow ring): at this size two hues alone are
 * indistinguishable, and shape survives colour-vision deficiency.
 */
const CONTROL_DOT: Partial<
  Record<ExportControlStatus, { classes: string; title: string }>
> = {
  restricted: {
    classes: 'h-2 w-2 rounded-full bg-risk-high',
    title: 'Export licence required',
  },
  monitored: {
    classes: 'h-2 w-2 rounded-full border-2 border-risk-medium',
    title: 'Under surveillance',
  },
};

interface ElementCardProps {
  element: Element;
  retail: PriceRecord | null;
  bulk: PriceRecord | null;
}

export function ElementCard({ element, retail, bulk }: ElementCardProps) {
  const cat = CATEGORY_STYLE[element.category];
  const dot = CONTROL_DOT[element.export_control_status];

  return (
    <Link
      href={`/elements/${element.symbol}/`}
      className={`flex flex-col rounded-lg border border-t-2 border-border ${cat.borderTop} ${cat.hoverBorder} bg-surface p-3.5 shadow-sm transition duration-fast hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
    >
      {/* Corner row: atomic number left (periodic convention), marks right */}
      <div className="flex items-center justify-between leading-none">
        <span className="font-mono text-2xs tabular-nums text-fg-dim">
          {element.atomic_number}
        </span>
        <span className="flex items-center gap-1.5">
          {dot && (
            <span title={dot.title} className={dot.classes}>
              <span className="sr-only">{dot.title}</span>
            </span>
          )}
          {element.high_demand && (
            <span title="High demand" className="text-2xs leading-none">
              🔥<span className="sr-only">High demand</span>
            </span>
          )}
        </span>
      </div>

      {/* Symbol + name */}
      <span className="mt-2 font-serif text-3xl font-bold leading-none tracking-tightish text-fg">
        {element.symbol}
      </span>
      <span className="mb-3 mt-1.5 truncate text-xs leading-snug text-fg-muted">
        {element.name}
      </span>

      {/* Price ledger, pinned to the bottom so figures align across the row */}
      <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-2">
        <PriceRow tier="retail" record={retail} strong />
        <PriceRow tier="bulk" record={bulk} strong={false} />
      </div>
    </Link>
  );
}

/**
 * One ledger line: "tier · form" set small and dim on the left, the USD/kg
 * figure mono + tabular on the right. The quote month lives on the detail
 * page's provenance table, not here.
 */
function PriceRow({
  tier,
  record,
  strong,
}: {
  tier: 'retail' | 'bulk';
  record: PriceRecord | null;
  strong: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate text-2xs leading-none text-fg-dim">
        {tier}
        {record ? (
          // The form matters (metal vs oxide prices differ by orders of
          // magnitude) but yields to the figure on narrow tiles.
          <span className="hidden sm:inline"> · {record.form.toLowerCase()}</span>
        ) : null}
      </span>
      {record ? (
        <span
          className={`whitespace-nowrap font-mono text-xs font-semibold leading-none tabular-nums ${
            strong ? 'text-fg' : 'text-fg-muted'
          }`}
        >
          {fmtUsdPrice(record.normalized_usd_per_kg)}
          <span className="font-normal text-fg-dim">/kg</span>
        </span>
      ) : (
        <span className="font-mono text-xs leading-none text-fg-dim">n/a</span>
      )}
    </div>
  );
}
