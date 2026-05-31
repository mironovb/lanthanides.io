/**
 * Build a per-day price series for one tier from an element's price history —
 * the data prep behind the gated <LineChart>. Pure, no I/O (safe on server or
 * client).
 *
 * Mirrors the aggregation the legacy chart did (legacy/assets/js/charts.js
 * `aggregateByDay`): collapse each day's raw observations within a tier to their
 * MEDIAN, and exclude the derived `median_aggregate` rows so the chart never
 * double-counts the daily medians it would otherwise summarise. One point per
 * distinct day — which is exactly the unit the sufficiency gate counts.
 */
import type {
  FluctuationTier,
  PriceHistory,
  PriceObservation,
} from '@/lib/types';

export interface SeriesPoint {
  /** ISO 'YYYY-MM-DD'. */
  date: string;
  /** Epoch ms (Date.parse of `date`) — used for time-proportional x scaling. */
  t: number;
  /** Per-day median USD/kg across the day's raw observations in this tier. */
  value: number;
  /** Number of raw observations contributing to this day's median. */
  n: number;
}

/** Derived daily-median rows are not real offers — never plot them. */
function isAggregate(o: PriceObservation): boolean {
  return (
    o.source === 'median_aggregate' ||
    o.source_type === 'aggregate' ||
    (o.tier as string) === 'median_aggregate'
  );
}

/**
 * Per-day median series for `tier`, raw observations only, sorted ascending by
 * date. Returns `[]` when there is no usable data for the tier.
 */
export function dailyMedianSeries(
  history: PriceHistory | null,
  tier: FluctuationTier,
): SeriesPoint[] {
  if (!history) return [];

  const byDate = new Map<string, number[]>();
  for (const o of history.observations) {
    if (isAggregate(o) || o.tier !== tier) continue;
    const p = o.price_per_kg;
    if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) continue;
    const arr = byDate.get(o.date);
    if (arr) arr.push(p);
    else byDate.set(o.date, [p]);
  }

  const out: SeriesPoint[] = [];
  for (const [date, prices] of byDate) {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    const t = Date.parse(date);
    if (!Number.isNaN(t)) out.push({ date, t, value: median, n: sorted.length });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
