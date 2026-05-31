/**
 * PriceGaugeResult — renders one engine result transparently: the price RANGE
 * (weighted P25 / P50 / P75 USD/kg), a confidence grade, and a full BASIS
 * disclosure (how many records, how many sellers, the date span, the method, and
 * the contributing record ids linking back to the element's provenance table) so
 * the number is auditable, never a black box.
 *
 * Honesty (CLAUDE.md hard rule #1): a zero-match query renders the engine's
 * explicit "insufficient data" path with guidance — no fabricated price. A thin
 * but non-empty match renders the range with a prominent "indicative only"
 * caveat. Form-widening and multi-form samples are called out, not hidden.
 *
 * Server component — pure presentation over the engine result passed in.
 */
import Link from 'next/link';
import { Callout, LinkButton, Panel, cn } from '@/components/ui';
import { capitalize, fmtUsdPrice, formatDate } from '@/lib/format';
import type { PriceGaugeResult as GaugeResult } from '@/lib/price-gauge';
import type { Element } from '@/lib/types';
import { ConfidenceMeter } from './ConfidenceMeter';

export function PriceGaugeResult({
  result,
  element,
}: {
  result: GaugeResult;
  element: Element;
}) {
  const b = result.basis;
  const tierLabel = b.tier === 'bulk' ? 'Bulk' : 'Retail';
  const availableTotal = b.availableByTier.retail + b.availableByTier.bulk;

  // ── Insufficient: the engine produced no price (zero matches) ───────────────
  if (!result.sufficient) {
    return (
      <Panel
        title="No estimate — insufficient data"
        eyebrow={`${element.name} (${element.symbol})`}
      >
        <Callout tone="warning" title="Not enough matching records">
          {result.message}
        </Callout>

        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          We won&rsquo;t invent a figure from thin air. On file for{' '}
          <span className="text-fg">{element.name}</span>:{' '}
          <span className="font-mono text-fg">{b.availableByTier.retail}</span>{' '}
          retail and{' '}
          <span className="font-mono text-fg">{b.availableByTier.bulk}</span> bulk
          record{availableTotal === 1 ? '' : 's'}.
        </p>

        <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-fg-muted">
          <li>
            <span className="text-fg-dim">›</span> Switch the tier override, or
            change the quantity so it lands in a tier that has data.
          </li>
          <li>
            <span className="text-fg-dim">›</span> Set Form to{' '}
            <span className="text-fg">Any form</span> to widen the search.
          </li>
          <li>
            <span className="text-fg-dim">›</span> Inspect every quoted price for
            this element directly on its page.
          </li>
        </ul>

        <div className="mt-5 border-t border-border pt-4">
          <LinkButton
            href={`/elements/${element.symbol}/`}
            variant="secondary"
            size="sm"
          >
            View {element.symbol} prices &amp; provenance →
          </LinkButton>
        </div>
      </Panel>
    );
  }

  // ── Sufficient: a range was produced ────────────────────────────────────────
  const caveats: string[] = [];
  if (b.matchMode === 'form-widened') {
    caveats.push(
      `No ${b.requestedForm} records in the ${tierLabel.toLowerCase()} tier, so the estimate widens to all available forms (${b.matchedForms
        .map(capitalize)
        .join(', ')}). Compare like-for-like before relying on it.`,
    );
  }
  if (result.confidence === 'low') {
    caveats.push(
      `Indicative only — based on ${b.matchedRecords} record${
        b.matchedRecords === 1 ? '' : 's'
      } from ${b.distinctSellers} seller${
        b.distinctSellers === 1 ? '' : 's'
      }. Treat it as a sanity check, not a benchmark.`,
    );
  } else if (b.matchMode !== 'form-widened' && b.matchedForms.length > 1) {
    caveats.push(
      `The sample spans multiple forms (${b.matchedForms
        .map(capitalize)
        .join(', ')}); different forms can price very differently.`,
    );
  }

  const dateSpan =
    b.dateRange && b.dateRange.from !== b.dateRange.to
      ? `${formatDate(b.dateRange.from)} – ${formatDate(b.dateRange.to)}`
      : b.dateRange
        ? formatDate(b.dateRange.from)
        : '—';

  return (
    <div className="space-y-4">
      <Panel
        title="Estimated fair price"
        eyebrow={`${element.name} (${element.symbol}) · ${tierLabel} tier`}
      >
        {/* Range numbers ------------------------------------------------- */}
        <div className="flex items-end justify-between gap-4">
          <RangeStop label="Low · P25" value={result.low} />
          <RangeStop label="Mid · P50" value={result.mid} emphasis />
          <RangeStop label="High · P75" value={result.high} align="right" />
        </div>
        <p className="mt-1 text-center font-mono text-2xs uppercase tracking-caps text-fg-dim">
          {result.currency} per {result.unit}
        </p>

        <GaugeBar
          low={result.low}
          mid={result.mid}
          high={result.high}
          observed={b.observedRange}
        />

        {/* Confidence + one-line basis ----------------------------------- */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <ConfidenceMeter level={result.confidence} />
          <p className="font-mono text-2xs text-fg-dim">
            {b.matchedRecords} record{b.matchedRecords === 1 ? '' : 's'} ·{' '}
            {b.distinctSellers} seller{b.distinctSellers === 1 ? '' : 's'} ·{' '}
            {dateSpan}
          </p>
        </div>

        {caveats.length > 0 ? (
          <Callout tone="warning" title="Read this before you quote it" className="mt-4">
            <ul className="space-y-1.5">
              {caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </Panel>

      {/* Basis & provenance ---------------------------------------------- */}
      <Panel title="Basis & provenance" eyebrow="How this was calculated">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Records matched" value={b.matchedRecords} />
          <Fact label="Distinct sellers" value={b.distinctSellers} />
          <Fact label="Quote date range" value={dateSpan} />
          <Fact label="Tier band" value={tierLabel} />
          <Fact
            label="Forms in sample"
            value={b.matchedForms.map(capitalize).join(', ') || '—'}
          />
          <Fact
            label="Avg record confidence"
            value={
              b.avgConfidenceScore != null
                ? b.avgConfidenceScore.toFixed(2)
                : '—'
            }
          />
          <Fact
            label="Observed price range"
            value={
              b.observedRange
                ? `${fmtUsdPrice(b.observedRange.min)} – ${fmtUsdPrice(b.observedRange.max)}`
                : '—'
            }
          />
          <Fact label="Match mode" value={b.matchMode.replace(/-/g, ' ')} />
        </dl>

        <div className="mt-4 border-t border-border pt-3">
          <p className="text-2xs font-semibold uppercase tracking-caps text-fg-dim">
            Method
          </p>
          <p className="mt-1 font-mono text-2xs leading-relaxed text-fg-muted">
            {b.method}
          </p>
        </div>

        {b.recordIds.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-2xs font-semibold uppercase tracking-caps text-fg-dim">
              Source records ({b.recordIds.length})
            </p>
            <ul className="mt-2 flex flex-wrap gap-1">
              {b.recordIds.map((id) => (
                <li
                  key={id}
                  className="rounded-sm border border-border bg-raised px-1.5 py-0.5 font-mono text-2xs text-fg-dim"
                >
                  {id}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-fg-muted">
              Every record above is listed with full seller, date, quantity, and
              verification detail on the{' '}
              <Link
                href={`/elements/${element.symbol}/`}
                className="font-medium text-accent hover:text-accent-strong"
              >
                {element.name} provenance table
              </Link>{' '}
              ({availableTotal} record{availableTotal === 1 ? '' : 's'} total).
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function RangeStop({
  label,
  value,
  emphasis = false,
  align = 'left',
}: {
  label: string;
  value: number | null;
  emphasis?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono tabular-nums text-fg',
          emphasis ? 'text-3xl' : 'text-lg text-fg-muted',
        )}
      >
        {fmtUsdPrice(value)}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-caps text-fg-dim">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}

/**
 * A static, non-animated bar placing the interquartile band [low, high] and the
 * median marker on the axis of ALL observed prices [min, max] — a faithful
 * picture of the numbers already stated above (not a trend line; the
 * visualization audit's low-data gate doesn't apply to a single-value summary).
 * Skipped when the observed prices collapse to one value.
 */
function GaugeBar({
  low,
  mid,
  high,
  observed,
}: {
  low: number | null;
  mid: number | null;
  high: number | null;
  observed: { min: number; max: number } | null;
}) {
  if (!observed || low == null || mid == null || high == null) return null;
  const span = observed.max - observed.min;
  if (!(span > 0)) return null;

  const pct = (x: number) =>
    Math.max(0, Math.min(100, ((x - observed.min) / span) * 100));
  const left = pct(low);
  const width = Math.max(0, pct(high) - left);

  return (
    <div className="mt-5" aria-hidden="true">
      <div className="relative h-2 rounded-sm border border-border bg-raised">
        <div
          className="absolute inset-y-0 bg-accent/25"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <div
          className="absolute inset-y-[-2px] w-0.5 bg-accent-strong"
          style={{ left: `${pct(mid)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-2xs text-fg-dim">
        <span>{fmtUsdPrice(observed.min)}</span>
        <span>observed min – max</span>
        <span>{fmtUsdPrice(observed.max)}</span>
      </div>
    </div>
  );
}
