/**
 * MovementsSummary: the dashboard's movement-events panel. It reports how many
 * detector events the feed carries, broken down by type and (for price moves) by
 * window depth and confidence, then points to the full /movements feed.
 *
 * Its real job is to make the no-movers-board decision legible with numbers
 * instead of prose: most price-move windows rest on just two observation days,
 * so ranking them would surface oxide-versus-metal artefacts as if they were
 * real moves (docs/VISUALIZATION-AUDIT.md section 2). The panel states that
 * thinness straight from the data, so the dashboard can omit a "30-day movers"
 * board without hand-waving.
 *
 * Server component, presentational. Monochrome by design: like MarketSnapshot it
 * reserves colour for the dashboard's regulatory risk scale, so the counts read
 * as a plain instrument readout. Every figure comes from the summary prop,
 * derived from _data/ via summarizeMovements; nothing is fabricated (CLAUDE.md
 * hard rule #1). No trend line is drawn at any point: the panel is a tally, and
 * the per-window sufficiency it reports is the very thing that gates the
 * /movements sparkline.
 */
import Link from 'next/link';
import { Panel } from '@/components/ui';
import { MIN_SPARKLINE_POINTS } from '@/components/charts/sufficiency';
import type { MovementType } from '@/lib/types';
import type { MovementSummary } from './movement-summary';

/** Short plural labels for the type tally (aligned with the feed's chip labels). */
const TYPE_LABEL: Record<MovementType, string> = {
  price_spike: 'Spikes',
  price_drop: 'Drops',
  regulatory_change: 'Regulatory',
  new_data: 'New data',
};

export interface MovementsSummaryProps {
  summary: MovementSummary;
  /** Detection threshold percent (e.g. 10), for labelling what a price move is. */
  threshold: number;
  /** Detection window label (e.g. '30d'). */
  windowLabel: string;
  className?: string;
}

export function MovementsSummary({
  summary,
  threshold,
  windowLabel,
  className,
}: MovementsSummaryProps) {
  const { total, byType, priceMoves, multiDay, thin, confidence } = summary;

  return (
    <Panel
      eyebrow="Market feed"
      title="Movement events"
      className={className}
      actions={
        <Link
          href="/movements/"
          className="text-xs text-accent hover:text-accent-strong"
        >
          View feed →
        </Link>
      }
    >
      {total === 0 ? (
        <p className="text-sm leading-relaxed text-fg-muted">
          No movement events have been detected yet. The detector runs as part of
          the data pipeline whenever new price observations land. See the{' '}
          <Link href="/movements/" className="text-accent hover:text-accent-strong">
            Market Movements
          </Link>{' '}
          feed.
        </p>
      ) : (
        <>
          {/* Availability: total + per-type tally, a plain part-to-whole readout
              (the type counts sum to the total). */}
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <span className="font-mono text-2xl tabular-nums text-fg">
                {total}
              </span>{' '}
              <span className="text-xs text-fg-dim">
                detected event{total === 1 ? '' : 's'}, from price moves
                (&gt;{threshold}% over {windowLabel}) and new-data points
              </span>
            </div>
            <ul
              aria-label="Events by type"
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5"
            >
              {byType.map((t) => (
                <li
                  key={t.type}
                  className="text-2xs uppercase tracking-caps text-fg-dim"
                >
                  <span className="font-mono text-sm normal-case tracking-normal text-fg">
                    {t.count}
                  </span>{' '}
                  {TYPE_LABEL[t.type]}
                </li>
              ))}
            </ul>
          </div>

          {/* Data sufficiency: the case for no movers board, stated in counts.
              Shown only when there are price moves to characterise. */}
          {priceMoves > 0 ? (
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <dt className="eyebrow">Window depth</dt>
                <dd className="mt-1 text-sm leading-relaxed text-fg-muted">
                  <strong className="font-mono font-semibold text-fg">
                    {multiDay}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-mono font-semibold text-fg">
                    {priceMoves}
                  </strong>{' '}
                  price moves reach {MIN_SPARKLINE_POINTS} or more observation
                  days; the other{' '}
                  <strong className="font-mono font-semibold text-fg">
                    {thin}
                  </strong>{' '}
                  rest on two.
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Confidence</dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-fg-muted">
                  {confidence.low} low &middot; {confidence.medium} medium &middot;{' '}
                  {confidence.high} high
                </dd>
              </div>
            </dl>
          ) : null}

          {/* No-movers explanation, shortened: the counts above carry the case,
              so this only states the consequence. */}
          <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-fg-muted">
            This dashboard does not rank a &ldquo;30-day movers&rdquo; board. Most
            windows span only two observation days, so ranking them would surface
            oxide-versus-metal artefacts as real moves. The{' '}
            <Link href="/movements/" className="text-accent hover:text-accent-strong">
              Market Movements
            </Link>{' '}
            feed shows every event with its confidence and sample size instead.
          </p>
        </>
      )}
    </Panel>
  );
}
