/**
 * Pure helpers for the dashboard's movement-events summary (the panel that
 * reports how much of the /movements feed is genuine, multi-day signal versus
 * thin two-day windows). Side-effect-free and framework-free so the logic is
 * testable and the panel (MovementsSummary) stays presentational, mirroring the
 * lens.ts / offers / sell pure-helper modules.
 *
 * Every figure is a real tally of the detector output passed in; nothing is
 * fabricated (CLAUDE.md hard rule #1). The sufficiency call routes through the
 * one centralized gate (components/charts/sufficiency.ts), never a threshold
 * re-derived here, so this summary and the /movements sparkline agree by
 * construction.
 */
import {
  meetsThreshold,
  MIN_SPARKLINE_POINTS,
} from '@/components/charts/sufficiency';
import type { Confidence, MovementEvent, MovementType } from '@/lib/types';

/** One event-type tally (only types actually present in the feed are emitted). */
export interface MovementTypeTally {
  type: MovementType;
  count: number;
}

export interface MovementSummary {
  /** Total detector events in the feed. */
  total: number;
  /** Per-type counts, in display order, present types only. */
  byType: MovementTypeTally[];
  /** Price-move events (spike + drop): the rows a "movers" board would rank. */
  priceMoves: number;
  /**
   * Price moves whose window clears the sufficiency gate (>= MIN_SPARKLINE_POINTS
   * distinct observation days): the few that rest on more than a single slope.
   */
  multiDay: number;
  /** Price moves below the gate (the thin two-day majority). */
  thin: number;
  /** Confidence tally across the price-move events. */
  confidence: Record<Confidence, number>;
  /** ISO date of the newest event, or null when the feed is empty. */
  latestEvent: string | null;
}

/** Fixed display order for the type breakdown (price moves first, then context). */
const TYPE_ORDER: readonly MovementType[] = [
  'price_spike',
  'price_drop',
  'regulatory_change',
  'new_data',
];

const PRICE_MOVE_TYPES: ReadonlySet<MovementType> = new Set([
  'price_spike',
  'price_drop',
]);

/**
 * Distinct observation days behind a price-move window. Prefers the sparkline
 * point count (exactly what the /movements gate counts), falling back to the
 * event's distinct_days. Either path feeds the one centralized gate, so the
 * "multi-day" tally equals the number of sparklines that actually render.
 */
function windowDays(e: MovementEvent): number {
  return e.sparkline?.point_count ?? e.distinct_days ?? 0;
}

/** Summarize the feed's availability and per-window data sufficiency. */
export function summarizeMovements(
  events: readonly MovementEvent[],
): MovementSummary {
  const counts = new Map<MovementType, number>();
  const confidence: Record<Confidence, number> = { low: 0, medium: 0, high: 0 };
  let priceMoves = 0;
  let multiDay = 0;
  let latestEvent: string | null = null;

  for (const e of events) {
    counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    // ISO YYYY-MM-DD strings order lexicographically, so a plain compare finds
    // the newest without assuming the authored order.
    if (latestEvent === null || e.date > latestEvent) latestEvent = e.date;
    if (PRICE_MOVE_TYPES.has(e.type)) {
      priceMoves += 1;
      if (e.confidence) confidence[e.confidence] += 1;
      if (meetsThreshold(windowDays(e), MIN_SPARKLINE_POINTS)) multiDay += 1;
    }
  }

  const byType: MovementTypeTally[] = TYPE_ORDER.filter((t) =>
    counts.has(t),
  ).map((type) => ({ type, count: counts.get(type) as number }));

  return {
    total: events.length,
    byType,
    priceMoves,
    multiDay,
    thin: priceMoves - multiDay,
    confidence,
    latestEvent,
  };
}
