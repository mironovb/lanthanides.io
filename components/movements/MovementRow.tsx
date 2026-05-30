/**
 * One row in the Market Movements feed — a port of the full (non-compact)
 * branch of legacy/_includes/movement-row.html. Renders the event head (date,
 * type chip, tier/window/confidence badges, element link, permalink anchor), the
 * factual description, the sparkline when present, and the type-specific meta
 * block. Purely presentational; the data is the deterministic detector output,
 * shown verbatim with no editorial interpretation.
 */
import Link from 'next/link';
import type { MovementEvent } from '@/lib/types';
import {
  CONFIDENCE_STYLE,
  DIRECTION_COLOR,
  MOVEMENT_FALLBACK,
  MOVEMENT_STYLE,
} from './movements';

const BADGE = 'rounded-sm bg-overlay px-1.5 py-0.5 font-mono text-2xs text-fg-muted';

/** Signed prefix matching the legacy feed: '+' up, U+2212 minus down, none flat. */
function sign(direction?: string): string {
  if (direction === 'up') return '+';
  if (direction === 'down') return '−';
  return '';
}

export function MovementRow({ event }: { event: MovementEvent }) {
  const style = MOVEMENT_STYLE[event.type] ?? MOVEMENT_FALLBACK;
  const dir = DIRECTION_COLOR[event.direction ?? 'flat'];
  const isPriceMove = event.type === 'price_spike' || event.type === 'price_drop';

  return (
    <li
      id={`mv-${event.id}`}
      className={`flex scroll-mt-6 flex-col gap-3 border border-l-[3px] border-border ${style.border} bg-surface px-4 py-4`}
    >
      {/* ── Head ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <time dateTime={event.date} className="font-mono text-xs text-fg-dim">
          {event.date}
        </time>
        <span
          className={`rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide ${style.chip}`}
        >
          {style.chipLabel}
        </span>
        {event.tier_label && (
          <span className={`${BADGE} lowercase`}>{event.tier_label}</span>
        )}
        {event.window && (
          <span className={`${BADGE} lowercase`}>{event.window}</span>
        )}
        {event.confidence && (
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-2xs ${CONFIDENCE_STYLE[event.confidence]}`}
            title={`Confidence: based on ${event.observation_count} observation(s) across ${event.distinct_days} day(s)`}
          >
            {event.confidence} confidence
          </span>
        )}

        <Link
          href={event.element_url}
          className="ml-auto inline-flex items-center gap-2 font-medium text-fg hover:text-accent-strong"
        >
          <code className="rounded-sm bg-accent/10 px-1 py-px font-mono text-xs font-semibold text-accent-strong">
            {event.element}
          </code>
          {event.element_name}
        </Link>
        <a
          href={`#mv-${event.id}`}
          aria-label="Link to this movement"
          className="font-mono text-xs text-fg-dim hover:text-fg"
        >
          #
        </a>
      </div>

      {/* ── Description ───────────────────────────────────────────────── */}
      <p className="text-sm leading-relaxed text-fg-muted">
        {event.description}
      </p>

      {/* ── Sparkline ─────────────────────────────────────────────────── */}
      {event.sparkline?.path && (
        <div className="flex items-center gap-3">
          <svg
            viewBox={`0 0 ${event.sparkline.width} ${event.sparkline.height}`}
            width={event.sparkline.width}
            height={event.sparkline.height}
            role="img"
            aria-label={`Sparkline for ${event.element_name}${
              event.tier_label ? ` ${event.tier_label}` : ''
            } between ${event.start_date} and ${event.end_date}`}
            className="block"
          >
            <path
              d={event.sparkline.path}
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={dir.stroke}
            />
            <circle
              cx={event.sparkline.last_x}
              cy={event.sparkline.last_y}
              r={2.5}
              className={dir.fill}
            />
          </svg>
          <span className="font-mono text-2xs text-fg-dim">
            {event.sparkline.point_count} pts ·{' '}
            {event.start_price_per_kg != null && event.end_price_per_kg != null
              ? `$${event.start_price_per_kg} → $${event.end_price_per_kg}`
              : `$${event.sparkline.min_price}–$${event.sparkline.max_price}`}
          </span>
        </div>
      )}

      {/* ── Meta block ────────────────────────────────────────────────── */}
      {isPriceMove ? (
        <Meta>
          <Cell label="Window">
            {event.start_date} → {event.end_date} ({event.actual_span_days}d)
          </Cell>
          <Cell label="Change">
            <span className={`font-semibold ${dir.text}`}>
              {sign(event.direction)}
              {event.abs_magnitude_pct}%
            </span>
          </Cell>
          <Cell label="From">
            ${event.start_price_per_kg}{' '}
            <span className="text-2xs text-fg-dim">/kg</span>
          </Cell>
          <Cell label="To">
            ${event.end_price_per_kg}{' '}
            <span className="text-2xs text-fg-dim">/kg</span>
          </Cell>
          <Cell label="Observations">
            {event.observation_count} across {event.distinct_days} day
            {event.distinct_days !== 1 ? 's' : ''}
          </Cell>
        </Meta>
      ) : event.type === 'regulatory_change' ? (
        <Meta>
          {event.prior_signature && (
            <Cell label="From">
              {event.prior_signature.replace(/\|/g, ' · ')}
            </Cell>
          )}
          <Cell label="To">
            {event.current_signature?.replace(/\|/g, ' · ')}
          </Cell>
        </Meta>
      ) : event.type === 'new_data' ? (
        <Meta>
          <Cell label="Observations">{event.observation_count}</Cell>
          <Cell label="Distinct days">{event.distinct_days}</Cell>
        </Meta>
      ) : null}
    </li>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-4 gap-y-2 border-t border-border pt-3">
      {children}
    </dl>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-mono text-2xs uppercase tracking-wide text-fg-dim">
        {label}
      </dt>
      <dd className="m-0 font-mono text-xs text-fg">{children}</dd>
    </div>
  );
}
