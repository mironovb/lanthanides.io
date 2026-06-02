/**
 * The data-sufficiency gate: the single, centralized rule that decides whether a
 * trend visualization (line / area / sparkline) has enough DISTINCT data points
 * to be drawn honestly, or must fall back to a table or stat.
 *
 * Why this exists (docs/AUDIT.md §3, §4.9 and docs/VISUALIZATION-AUDIT.md): the
 * price corpus is essentially one or two collection days for most elements. A
 * polyline drawn through ≤2 (or even 3 to 4 unevenly spaced) points implies a
 * shape the data cannot support and reads as broken. So every chart obeys ONE
 * rule defined here; no visualization re-derives its own threshold inline.
 *
 * The unit a line plots is a single SERIES (one tier). So the gate is applied
 * per-series, never per-element: an element whose retail tier has 2 days and bulk
 * tier has 4 days has NO series that clears the line threshold, and is drawn as a
 * table, even though its union of distinct days is 6.
 */

/**
 * Trend lines / areas require ≥5 DISTINCT points (e.g. distinct observation
 * days in one tier). Measured against the live data on 2026-05-31, NO single
 * tier in the catalog reaches 5 distinct days. The deepest are Sc and Te at 4
 * distinct *bulk* days, and those four even mix forms (oxide→metal→compound). So
 * the price-trend line currently renders for ZERO elements; all 31 degrade to
 * the observations table, by design. The line activates automatically the moment
 * the Python pipeline deepens any tier to ≥5 clean days.
 */
export const MIN_LINE_POINTS = 5;

/**
 * Inline event sparklines (the movements feed) use a looser ≥3: a 2-point
 * sparkline is a slope fixed by direction, not by data (the Prompt 9 decision).
 * Kept distinct from the line threshold but routed through the same gate so there
 * is still only one rule.
 */
export const MIN_SPARKLINE_POINTS = 3;

/** Count the distinct values produced by `key` over `items`. */
export function distinctCount<T>(
  items: readonly T[],
  key: (t: T) => string | number,
): number {
  const seen = new Set<string | number>();
  for (const it of items) seen.add(key(it));
  return seen.size;
}

/**
 * The gate. Returns true only when `distinctPoints` clears the configured
 * minimum (default: the line threshold). Below it, the caller must render a
 * table/stat fallback instead of a drawn trend.
 */
export function meetsThreshold(
  distinctPoints: number,
  min: number = MIN_LINE_POINTS,
): boolean {
  return distinctPoints >= min;
}
