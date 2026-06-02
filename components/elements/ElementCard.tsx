/**
 * Compact element tile for the /elements category grid. Matches the tile from
 * the last static site (the .element-tile rule in _sass/_home.scss): a 4px
 * category band down the left edge, a faint category tint along the top, the
 * category microlabel, atomic number, the China export control and high demand
 * markers, the symbol set large with the name beneath, the export control status
 * tag, and the retail and bulk reference prices with form and quote month. The
 * whole tile links to the element detail page.
 */
import Link from 'next/link';
import type { Element, PriceRecord } from '@/lib/types';
import { CATEGORY_STYLE, CONTROL_STYLE } from './categories';
import { capitalize, fmtUsdPrice } from './format';

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
      className={`relative flex flex-col overflow-hidden rounded-xl border-y border-r border-l-4 border-border ${cat.borderLeft} ${cat.hoverBorder} bg-surface px-4 pb-2 pt-3 transition duration-fast hover:-translate-y-px hover:shadow-md`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-8 ${cat.tint}`}
      />

      <div className="relative flex items-center justify-between leading-none">
        <span
          className={`font-mono text-2xs font-semibold uppercase tracking-caps ${cat.text}`}
        >
          {cat.short}
        </span>
        <span className="flex items-center gap-1 text-2xs leading-none text-fg-dim">
          {element.cn_export_control && (
            <span title="China export control">❗</span>
          )}
          {element.high_demand && <span title="High demand">🔥</span>}
          <span className="ml-1 font-mono tabular-nums">
            {element.atomic_number}
          </span>
        </span>
      </div>

      <div className="relative mt-2 flex flex-col gap-0.5">
        <span className="font-serif text-2xl font-bold leading-none tracking-tightish text-fg">
          {element.symbol}
        </span>
        <span className="truncate text-xs text-fg-muted">{element.name}</span>
      </div>

      <div className="relative mt-2">
        <span
          className={`inline-block rounded-sm px-1 py-px font-mono text-2xs font-semibold ${ctrl.classes}`}
        >
          {ctrl.label}
        </span>
      </div>

      <div className="relative mt-auto flex flex-col gap-1 border-t border-border pb-1 pt-2">
        <PriceRow label="Retail" record={retail} muted={false} />
        <PriceRow label="Bulk" record={bulk} muted />
      </div>
    </Link>
  );
}

function PriceRow({
  label,
  record,
  muted,
}: {
  label: string;
  record: PriceRecord | null;
  muted: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1 overflow-hidden">
      <span className="w-9 flex-shrink-0 text-2xs leading-none text-fg-dim">
        {label}
      </span>
      {record ? (
        <>
          <span
            className={`whitespace-nowrap font-mono text-xs font-semibold leading-none ${muted ? 'text-fg-muted' : 'text-fg'}`}
          >
            {fmtUsdPrice(record.normalized_usd_per_kg)}
            <span className="text-2xs font-normal text-fg-muted">/kg</span>
          </span>
          <span className="ml-auto min-w-0 truncate text-2xs leading-none text-fg-dim">
            {capitalize(record.form)}{' '}
            <span className="font-mono">{record.quote_date.slice(0, 7)}</span>
          </span>
        </>
      ) : (
        <span className="text-fg-dim">n/a</span>
      )}
    </div>
  );
}
