/**
 * The announcement timeline — a port of `.reg-timeline` in
 * legacy/pages/regulatory.html. A clean vertical timeline of published
 * export-control announcements (a KEEP visualization, AUDIT §3 — rendered as a
 * crisp connected list, not a choppy chart). Newest first.
 *
 * Receives an already-filtered, already-sorted list of policy events from
 * <RegulatoryView>; rendering only the entries to show means the connecting
 * line clips naturally at the first/last visible entry (no DOM juggling like the
 * legacy JS). Presentational only.
 */
import Link from 'next/link';
import type { PolicyEvent } from '@/lib/types';
import { EVENT_TYPE_STYLE, fmtLongDate } from './regulatory';

const ELEM_CHIP =
  'rounded-sm border border-border bg-raised px-1.5 py-px font-mono text-2xs font-semibold text-fg-muted transition-colors hover:border-accent hover:text-accent-strong';

export function RegulatoryTimeline({ events }: { events: PolicyEvent[] }) {
  const n = events.length;

  return (
    <ol className="space-y-6 pt-1">
      {events.map((event, i) => {
        const tag = EVENT_TYPE_STYLE[event.event_type] ?? {
          label: event.event_type,
          classes: 'text-fg-muted bg-overlay border border-border-strong',
        };

        // Connector segment: clip at the dot for the first/last visible entry,
        // bridge the inter-entry gap (-bottom-6 == the <ol> space-y-6) otherwise.
        const isFirst = i === 0;
        const isLast = i === n - 1;
        const line =
          n === 1
            ? 'hidden'
            : isFirst
              ? 'top-3 -bottom-6'
              : isLast
                ? 'top-0 h-3'
                : 'top-0 -bottom-6';

        return (
          <li key={event.id} className="relative flex gap-3">
            <time
              dateTime={event.date}
              className="w-20 shrink-0 pt-2.5 text-right font-mono text-2xs leading-snug tabular-nums text-fg-dim sm:w-24 sm:text-xs"
            >
              {fmtLongDate(event.date)}
            </time>

            <div className="relative w-3 shrink-0" aria-hidden="true">
              <span
                className={`absolute left-1/2 w-px -translate-x-1/2 bg-border-strong ${line}`}
              />
              <span className="absolute left-1/2 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent ring-2 ring-base" />
            </div>

            <div className="min-w-0 flex-1 border border-border bg-surface px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide ${tag.classes}`}
                >
                  {tag.label}
                </span>
              </div>

              <div className="font-sans text-base font-semibold leading-snug tracking-tightish text-fg">
                {event.title}
              </div>

              <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                {event.description}
              </p>

              {event.source_name && (
                <div className="mt-2 font-mono text-2xs font-medium text-fg-dim">
                  {event.source_name}
                </div>
              )}

              {event.affected_elements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.affected_elements.map((sym) => (
                    <Link
                      key={sym}
                      href={`/elements/${sym}/`}
                      className={ELEM_CHIP}
                    >
                      {sym}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
