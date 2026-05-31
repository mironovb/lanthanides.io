/**
 * One of the two reference-price cards (Retail Reference · Bulk Benchmark) on an
 * element detail page — a port of the two-card row in
 * legacy/_layouts/element-detail.html. The retail card additionally shows the
 * quoted quantity and the retail-premium multiple; the bulk card shows the
 * incoterm. Records come pre-selected from `getReferencePrices()`. Composes the
 * shared Card primitive (Prompt 12).
 */
import { Card } from '@/components/ui';
import type { PriceRecord } from '@/lib/types';
import { capitalize, fmtQuantity, fmtUsdPrice, formatDate } from './format';

interface ReferencePriceCardProps {
  label: string;
  record: PriceRecord | null;
  /** Shown when no qualifying record exists for this tier. */
  emptyText: string;
  /** 'retail' shows quantity + premium; 'bulk' shows the incoterm. */
  kind: 'retail' | 'bulk';
  /** Pre-formatted premium multiple (e.g. '3.2'); retail card only. */
  premium?: string | null;
}

export function ReferencePriceCard({
  label,
  record,
  emptyText,
  kind,
  premium,
}: ReferencePriceCardProps) {
  return (
    <Card>
      <p className="eyebrow">{label}</p>

      {record ? (
        <>
          <div className="mt-2 font-mono text-3xl font-bold leading-none tabular-nums text-fg">
            {fmtUsdPrice(record.normalized_usd_per_kg)}
            <span className="text-sm font-normal text-fg-muted">/kg</span>
          </div>

          <div className="mt-2 text-sm text-fg-muted">
            {capitalize(record.form)} {record.purity}
            {kind === 'retail' && record.quoted_quantity_kg != null && (
              <> · {fmtQuantity(record.quoted_quantity_kg)}</>
            )}
          </div>

          <div className="mt-1 font-mono text-xs text-fg-dim">
            {record.seller_name}
            {kind === 'bulk' && record.incoterm ? <> · {record.incoterm}</> : null}
            {kind === 'retail' && record.seller_country ? (
              <> · {record.seller_country}</>
            ) : null}
            {' · '}
            {formatDate(record.quote_date)}
          </div>

          {kind === 'retail' && premium && (
            <div className="mt-3 border-t border-dotted border-border pt-2 font-mono text-sm font-semibold text-risk-medium">
              Retail Premium: {premium}×
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-2 font-mono text-2xl text-fg-dim">—</div>
          <div className="mt-1 text-sm text-fg-muted">{emptyText}</div>
        </>
      )}
    </Card>
  );
}
