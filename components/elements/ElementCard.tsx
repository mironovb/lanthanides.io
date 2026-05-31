/**
 * Compact element tile for the `/elements` category grid — a port of the tile in
 * legacy/_includes/element-grid.html. Shows the category accent, atomic number,
 * symbol/name, the China-export-control (❗) and high-demand (🔥) indicators, the
 * export-control status tag, and the retail + bulk reference prices. The whole
 * tile links to the element's detail page.
 */
import Link from 'next/link';
import type { Element, PriceRecord } from '@/lib/types';
import { CATEGORY_STYLE, CONTROL_STYLE } from './categories';
import { fmtUsdPrice } from './format';

interface ElementCardProps {
  element: Element;
  retail: PriceRecord | null;
  bulk: PriceRecord | null;
}

export function ElementCard({ element, retail, bulk }: ElementCardProps) {
  const cat = CATEGORY_STYLE[element.category];
  const ctrl = CONTROL_STYLE[element.export_control_status];

  return (
    <Link
      href={`/elements/${element.symbol}/`}
      className={`flex flex-col border border-t-2 border-border ${cat.borderTop} bg-surface p-3 transition-colors hover:bg-overlay`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-2xs font-semibold uppercase tracking-wide ${cat.text}`}>
          {cat.short}
        </span>
        <span className="flex items-center gap-1 font-mono text-2xs text-fg-dim">
          {element.cn_export_control && (
            <span title="China export control">❗</span>
          )}
          {element.high_demand && <span title="High demand">🔥</span>}
          <span className="tabular-nums">{element.atomic_number}</span>
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-sans text-2xl font-bold text-fg">
          {element.symbol}
        </span>
        <span className="truncate text-sm text-fg-muted">{element.name}</span>
      </div>

      <div className="mt-1">
        <span
          className={`inline-block rounded-sm px-1 py-px font-mono text-2xs font-semibold ${ctrl.classes}`}
        >
          {ctrl.label}
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-2 font-mono text-xs">
        <PriceRow label="Retail" record={retail} className="text-fg" />
        <PriceRow label="Bulk" record={bulk} className="text-fg-muted" />
      </div>
    </Link>
  );
}

function PriceRow({
  label,
  record,
  className,
}: {
  label: string;
  record: PriceRecord | null;
  className: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-2xs uppercase tracking-wide text-fg-dim">{label}</span>
      {record ? (
        <span className={`tabular-nums ${className}`}>
          {fmtUsdPrice(record.normalized_usd_per_kg)}
          <span className="text-2xs text-fg-dim">/kg</span>
        </span>
      ) : (
        <span className="text-fg-dim">—</span>
      )}
    </div>
  );
}
