/**
 * Recent Movements: the compact home-page widget. Shows the five newest events
 * from the market-movements feed as slim rows, with a link to the full feed. A
 * port of the old home "Recent Movements" block (the compact branch of the
 * movement row). It reads the feed itself, so a page only has to drop
 * <HomeMovements /> in. Server component, no state.
 */
import Link from 'next/link';
import { getMovements } from '@/lib/data';
import { formatDate, fmtUsdPrice } from '@/lib/format';
import type { MovementEvent } from '@/lib/types';
import { SectionHeading } from '@/components/ui';
import { MOVEMENT_FALLBACK, MOVEMENT_STYLE } from './movements';

const HOME_LIMIT = 5;

/** Signed prefix: '+' up, U+2212 minus down, none flat (matches the full row). */
function sign(direction?: string): string {
  if (direction === 'up') return '+';
  if (direction === 'down') return '−';
  return '';
}

/**
 * The one-line summary, ported from the old compact row: a price move shows the
 * signed magnitude, the span, and the start-to-end price (an arrow for the
 * transition, matching the full row); anything else shows the factual
 * description, trimmed. No fabricated values: every field is read straight from
 * the detector output.
 */
function compactLine(e: MovementEvent): string {
  if (e.abs_magnitude_pct != null) {
    const span = e.actual_span_days != null ? ` over ${e.actual_span_days}d` : '';
    return `${sign(e.direction)}${e.abs_magnitude_pct}%${span}: ${fmtUsdPrice(
      e.start_price_per_kg,
    )} → ${fmtUsdPrice(e.end_price_per_kg)} /kg`;
  }
  const d = e.description ?? '';
  return d.length > 110 ? `${d.slice(0, 109).trimEnd()}…` : d;
}

export function HomeMovements() {
  const { events } = getMovements();
  if (events.length === 0) return null;
  const recent = events.slice(0, HOME_LIMIT);

  return (
    <section className="mt-16">
      <SectionHeading
        title="Recent Movements"
        actions={
          <Link
            href="/movements/"
            className="font-mono text-2xs uppercase tracking-wide text-fg-dim hover:text-accent-strong"
          >
            All movements →
          </Link>
        }
      />
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
        {recent.map((event) => {
          const style = MOVEMENT_STYLE[event.type] ?? MOVEMENT_FALLBACK;
          return (
            <li
              key={event.id}
              className={`grid grid-cols-1 items-baseline gap-x-3 gap-y-1 border-l-[3px] ${style.border} px-4 py-2.5 sm:grid-cols-[auto_auto_minmax(0,11rem)_minmax(0,1fr)]`}
            >
              <time
                dateTime={event.date}
                className="font-mono text-2xs text-fg-dim"
              >
                {formatDate(event.date)}
              </time>
              <span
                className={`justify-self-start rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide ${style.chip}`}
              >
                {style.chipLabel}
              </span>
              <Link
                href={event.element_url}
                className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-fg hover:text-accent-strong"
              >
                <code className="shrink-0 rounded-sm bg-accent/10 px-1 py-px font-mono text-2xs font-semibold text-accent-strong">
                  {event.element}
                </code>
                <span className="truncate">{event.element_name}</span>
              </Link>
              <span className="min-w-0 font-mono text-2xs text-fg-muted sm:truncate">
                {compactLine(event)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
