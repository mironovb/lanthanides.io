/**
 * Active export controls banner from the old home and element pages
 * (_includes/regulatory-banner.html, .reg-alert-banner). A red alert strip
 * listing the elements currently under an active Chinese export licence
 * requirement (regulatory_status === 'active'), each linked to its element
 * page, with a link through to the full regulatory tracker. Renders nothing
 * when no element is under active control.
 *
 * Presentational, server component. Pass the active set from the data layer
 * (getRegulatedElements()).
 */
import Link from 'next/link';
import type { Element } from '@/lib/types';

export function RegulatoryBanner({ elements }: { elements: Element[] }) {
  if (elements.length === 0) return null;
  const plural = elements.length !== 1;

  return (
    <div className="mt-6 flex items-center gap-3 rounded-sm border border-l-[3px] border-risk-high/20 border-l-risk-high bg-risk-high/10 px-4 py-3">
      <span className="shrink-0 text-lg leading-none" aria-hidden="true">
        ⚠
      </span>
      <div className="flex-1 text-sm leading-normal">
        <strong className="block font-semibold text-fg">
          Active export controls
        </strong>
        <span className="text-xs text-fg-muted">
          {elements.length} element{plural ? 's' : ''} currently under Chinese
          export licence requirements:{' '}
          {elements.map((el, i) => (
            <span key={el.symbol}>
              <Link
                href={`/elements/${el.symbol}/`}
                className="font-mono font-semibold text-risk-high hover:underline"
              >
                {el.symbol}
              </Link>
              {i < elements.length - 1 ? ' ' : ''}
            </span>
          ))}
        </span>
      </div>
      <Link
        href="/regulatory/"
        className="shrink-0 whitespace-nowrap text-xs text-fg-dim hover:text-fg"
      >
        Details →
      </Link>
    </div>
  );
}
