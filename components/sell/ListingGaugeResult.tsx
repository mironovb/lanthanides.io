/**
 * ListingGaugeResult: the instant, dataset-derived response shown after a seller
 * submits a listing. It renders the engine's price RANGE (weighted P25/P50/P75
 * USD/kg) + confidence + basis, and positions the seller's own asking price
 * against that band (below / in / above), so they immediately see where their
 * number sits relative to the sourced evidence.
 *
 * Honesty (CLAUDE.md hard rule #1): a zero-match query renders the engine's
 * explicit "insufficient data" path, no fabricated range to compare against. The
 * positioning is computed only for USD asking prices, because the dataset is
 * USD-normalized and we apply no live exchange rate (hard rule #3); a non-USD
 * quote shows the USD band with a plain note rather than a cross-converted guess.
 *
 * Presentational only (no hooks), safe inside the client form bundle.
 */
import Link from 'next/link';
import { Callout, Panel, cn } from '@/components/ui';
import { ConfidenceMeter } from '@/components/tools/ConfidenceMeter';
import { capitalize, fmtUsdPrice, formatDate } from '@/lib/format';
import type {
  AskingAssessment,
  CreateListingResponse,
  PricePosition,
} from './sell';

const POSITION_LABEL: Record<PricePosition, string> = {
  below: 'Below the sourced range',
  in: 'Within the sourced range',
  above: 'Above the sourced range',
};

const POSITION_GLYPH: Record<PricePosition, string> = {
  below: '↓',
  in: '↔',
  above: '↑',
};

const POSITION_NOTE: Record<PricePosition, string> = {
  below:
    'Your asking price sits under the P25 of the matching sourced records. It would read as keenly priced against the dataset. Double-check you’re not under-selling.',
  in: 'Your asking price sits inside the interquartile band of the matching sourced records, consistent with what the data shows for this material.',
  above:
    'Your asking price sits over the P75 of the matching sourced records. Buyers comparing against sourced quotes may treat it as a premium. Be ready to justify it (purity, form, lot size, provenance).',
};

export function ListingGaugeResult({
  response,
  elementName,
}: {
  response: CreateListingResponse;
  elementName: string;
}) {
  const { gauge, assessment, assessmentNote, listing } = response;
  const b = gauge.basis;
  const tierLabel = b.tier === 'bulk' ? 'Bulk' : 'Retail';
  const symbol = listing.elementSymbol;
  const askingUsd = listing.currency === 'USD' ? listing.askingPricePerKg : null;

  // ── Insufficient: no dataset range to compare the asking price against ───────
  if (!gauge.sufficient) {
    return (
      <Panel
        title="No dataset range to compare against"
        eyebrow={`Instant gauge · ${elementName} (${symbol})`}
      >
        <Callout tone="warning" title="Not enough matching records">
          {gauge.message}
        </Callout>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Your listing is saved either way. We just won’t invent a benchmark to
          rate it against. On file for {elementName}:{' '}
          <span className="font-mono text-fg">{b.availableByTier.retail}</span>{' '}
          retail and{' '}
          <span className="font-mono text-fg">{b.availableByTier.bulk}</span> bulk
          record(s).
        </p>
        <div className="mt-4 border-t border-border pt-3 text-sm">
          <Link
            href={`/elements/${symbol}/`}
            className="font-medium text-accent hover:text-accent-strong"
          >
            See every sourced {symbol} price &amp; its provenance →
          </Link>
        </div>
      </Panel>
    );
  }

  const dateSpan =
    b.dateRange && b.dateRange.from !== b.dateRange.to
      ? `${formatDate(b.dateRange.from)} to ${formatDate(b.dateRange.to)}`
      : b.dateRange
        ? formatDate(b.dateRange.from)
        : 'n/a';

  return (
    <div className="space-y-4">
      {/* ── Verdict: asking price vs the band ──────────────────────────────── */}
      <Panel
        title="Your price vs. the sourced range"
        eyebrow={`Instant gauge · ${elementName} (${symbol}) · ${tierLabel} tier`}
      >
        {assessment ? (
          <Verdict
            assessment={assessment}
            askingUsd={listing.askingPricePerKg}
          />
        ) : (
          <Callout tone="note" title="Range shown in USD/kg">
            {assessmentNote ??
              'The sourced dataset is USD-denominated and we don’t apply a live exchange rate, so the band below is in USD/kg for reference rather than a direct comparison to your quote.'}
          </Callout>
        )}

        {/* Range numbers ------------------------------------------------- */}
        <div className="mt-5 flex items-end justify-between gap-4">
          <RangeStop label="Low · P25" value={gauge.low} />
          <RangeStop label="Mid · P50" value={gauge.mid} emphasis />
          <RangeStop label="High · P75" value={gauge.high} align="right" />
        </div>
        <p className="mt-1 text-center font-mono text-2xs uppercase tracking-caps text-fg-dim">
          {gauge.currency} per {gauge.unit}
        </p>

        <GaugeBar
          low={gauge.low}
          mid={gauge.mid}
          high={gauge.high}
          observed={b.observedRange}
          asking={askingUsd}
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <ConfidenceMeter level={gauge.confidence} />
          <p className="font-mono text-2xs text-fg-dim">
            {b.matchedRecords} record{b.matchedRecords === 1 ? '' : 's'} ·{' '}
            {b.distinctSellers} seller{b.distinctSellers === 1 ? '' : 's'} ·{' '}
            {dateSpan}
          </p>
        </div>

        {gauge.confidence === 'low' ? (
          <Callout
            tone="warning"
            title="Indicative only"
            className="mt-4"
          >
            Based on {b.matchedRecords} record
            {b.matchedRecords === 1 ? '' : 's'} from {b.distinctSellers} seller
            {b.distinctSellers === 1 ? '' : 's'}. Treat the comparison as a sanity
            check, not a benchmark.
          </Callout>
        ) : null}
      </Panel>

      {/* ── Basis & provenance ─────────────────────────────────────────────── */}
      <Panel title="Basis & provenance" eyebrow="How this was calculated">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Records matched" value={b.matchedRecords} />
          <Fact label="Distinct sellers" value={b.distinctSellers} />
          <Fact label="Quote date range" value={dateSpan} />
          <Fact label="Tier band" value={tierLabel} />
          <Fact
            label="Forms in sample"
            value={b.matchedForms.map(capitalize).join(', ') || 'n/a'}
          />
          <Fact
            label="Observed price range"
            value={
              b.observedRange
                ? `${fmtUsdPrice(b.observedRange.min)} to ${fmtUsdPrice(b.observedRange.max)}`
                : 'n/a'
            }
          />
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
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-fg-muted">
            Every contributing record ({b.recordIds.length}) is listed with full
            seller, date, quantity, and verification detail on the{' '}
            <Link
              href={`/elements/${symbol}/`}
              className="font-medium text-accent hover:text-accent-strong"
            >
              {elementName} provenance table
            </Link>
            .
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function Verdict({
  assessment,
  askingUsd,
}: {
  assessment: AskingAssessment;
  askingUsd: number;
}) {
  const { position, deltaVsMid } = assessment;
  const pct =
    deltaVsMid != null ? Math.round(Math.abs(deltaVsMid) * 100) : null;
  const vsMid =
    pct == null
      ? null
      : pct === 0
        ? 'right at the median'
        : `${pct}% ${deltaVsMid! > 0 ? 'above' : 'below'} the median`;

  return (
    <div className="border border-border-strong bg-raised px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Your asking price</p>
          <p className="mt-0.5 font-mono text-2xl tabular-nums text-fg">
            {fmtUsdPrice(askingUsd)}
            <span className="ml-1 text-xs text-fg-dim">USD/kg</span>
          </p>
        </div>
        <p
          className="flex items-center gap-1.5 font-mono text-2xs font-semibold uppercase tracking-caps text-fg"
          title="Where your asking price falls relative to the weighted P25 to P75 of the matching sourced records."
        >
          <span aria-hidden="true" className="text-base leading-none">
            {POSITION_GLYPH[position]}
          </span>
          {POSITION_LABEL[position]}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {POSITION_NOTE[position]}
        {vsMid ? <span className="text-fg-dim"> ({vsMid}).</span> : null}
      </p>
    </div>
  );
}

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
 * A static, non-animated bar placing the interquartile band [low, high], the
 * median, and (for a USD quote) the seller's asking-price marker on the axis of
 * all observed prices [min, max]. Faithful to the numbers stated above, not a
 * trend line, so the visualization audit's low-data gate doesn't apply. The
 * asking marker is monochrome (fg) to stay off the teal band; the axis stretches
 * to include the asking price when it lands outside the observed window.
 */
function GaugeBar({
  low,
  mid,
  high,
  observed,
  asking,
}: {
  low: number | null;
  mid: number | null;
  high: number | null;
  observed: { min: number; max: number } | null;
  asking: number | null;
}) {
  if (!observed || low == null || mid == null || high == null) return null;
  const axisMin = asking != null ? Math.min(observed.min, asking) : observed.min;
  const axisMax = asking != null ? Math.max(observed.max, asking) : observed.max;
  const span = axisMax - axisMin;
  if (!(span > 0)) return null;

  const pct = (x: number) => Math.max(0, Math.min(100, ((x - axisMin) / span) * 100));
  const left = pct(low);
  const width = Math.max(0, pct(high) - left);

  return (
    <div className="mt-5">
      <div className="relative h-2 rounded-sm border border-border bg-raised">
        <div
          className="absolute inset-y-0 bg-accent/25"
          style={{ left: `${left}%`, width: `${width}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-[-2px] w-0.5 bg-accent-strong"
          style={{ left: `${pct(mid)}%` }}
          aria-hidden="true"
          title="Median (P50)"
        />
        {asking != null ? (
          <div
            className="absolute inset-y-[-4px] w-0.5 bg-fg"
            style={{ left: `${pct(asking)}%` }}
            aria-hidden="true"
            title="Your asking price"
          />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between font-mono text-2xs text-fg-dim">
        <span>{fmtUsdPrice(axisMin)}</span>
        <span>
          {asking != null
            ? 'band (teal) · your price (white)'
            : 'observed min to max'}
        </span>
        <span>{fmtUsdPrice(axisMax)}</span>
      </div>
    </div>
  );
}
