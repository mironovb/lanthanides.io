/**
 * Price Map: pure geometry and statistics helpers.
 *
 * Everything here is dependency-free and side-effect-free (type-only imports),
 * so the client island can re-derive stats when a filter changes without
 * pulling the gauge engine or any fs-backed loader into the browser bundle.
 * The server-side model builder lives in `price-map-data.ts`.
 *
 * The sufficiency gates below are this page's own instance of the
 * visualization-audit discipline (docs/VISUALIZATION-AUDIT.md): a mark is a
 * datum and always draws, but a statistic must earn its ink. Nothing in the
 * Price Map is ever a line through time.
 *
 * The form law: different forms of the same element (metal, oxide, powder,
 * compound, alloy) are different commodities separated by orders of magnitude,
 * so every statistic is computed per element x tier x FORM. A metal quote is
 * never pooled with an oxide quote; `groupTracks` is where that separation
 * happens and `deriveTierStats` must only ever receive a single-form set.
 */
import type { TierBand } from '@/lib/price-gauge';
import type { ElementCategory, ExportControlStatus, ISODate } from '@/lib/types';

/** Observed span strip (min to max) needs at least two observations. */
export const MIN_STRIP_N = 2;
/**
 * Quartile band + median tick need at least three: with fewer, "quartiles"
 * merely restate the raw points and a median tick would assert a central
 * tendency two quotes cannot establish.
 */
export const MIN_QUARTILE_N = 3;

/** Fixed row-grid columns, shared so gridlines align with every plot cell. */
export const LABEL_COL_PX = 160;
/** Per-track captions (tier glyph + form + n) between label and plot. */
export const CAPTION_COL_PX = 108;
export const VALUE_COL_PX = 88;
/**
 * Minimum width of the whole chart block inside its scroll container:
 * label + caption + value + the same 392px plot the pre-caption layout had.
 */
export const CHART_MIN_PX = 748;

/** One sourced observation, positioned on the log axis. */
export interface MapMark {
  /** PriceRecord id, e.g. 'R-0105'. */
  id: string;
  /** normalized_usd_per_kg. */
  price: number;
  /** Precomputed left position on the axis, 0..100. */
  pct: number;
  band: TierBand;
  form: string;
  purity: string;
  seller: string;
  date: ISODate;
}

/** Descriptive statistics for the visible marks of one element+band. */
export interface TierStats {
  n: number;
  min: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number;
  latestDate: ISODate;
  forms: string[];
  distinctSellers: number;
  /** Geometry (left/width %), present only past each gate. */
  stripPct: { left: number; width: number } | null;
  bandPct: { left: number; width: number } | null;
  medianPct: number | null;
}

/** One element row of the map. */
export interface MapRow {
  symbol: string;
  name: string;
  atomicNumber: number;
  category: ElementCategory;
  exportControlStatus: ExportControlStatus;
  highDemand: boolean;
  retail: MapMark[];
  bulk: MapMark[];
}

export interface AxisTick {
  value: number;
  pct: number;
  label: string;
}

/** The serializable model the server builds and the island renders. */
export interface PriceMapModel {
  rows: MapRow[];
  /**
   * [log10 lo, log10 hi], computed from the data, never hardcoded. `hi`
   * carries 5% right headroom past the dearest observation, so it is not an
   * integer.
   */
  domain: [number, number];
  ticks: AxisTick[];
  totals: {
    records: number;
    elements: number;
    dateFrom: ISODate;
    dateTo: ISODate;
  };
}

/** Round to cents, matching the gauge engine's presentation. */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Position a price on the log axis as a 0..100 percentage. */
export function logPct(price: number, domain: [number, number]): number {
  const [lo, hi] = domain;
  if (!(price > 0) || !(hi > lo)) return 0;
  const p = ((Math.log10(price) - lo) / (hi - lo)) * 100;
  return Math.max(0, Math.min(100, p));
}

/** Compact axis-chrome label: $1, $10, $100, $1k, $10k, $100k, $1M. */
export function fmtAxisTick(value: number): string {
  if (value >= 1_000_000) return `$${value / 1_000_000}M`;
  if (value >= 1_000) return `$${value / 1_000}k`;
  return `$${value}`;
}

/** Decade ticks across the domain (inclusive of both ends). */
export function axisTicks(domain: [number, number]): AxisTick[] {
  const [lo, hi] = domain;
  const ticks: AxisTick[] = [];
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e += 1) {
    const value = 10 ** e;
    ticks.push({ value, pct: logPct(value, domain), label: fmtAxisTick(value) });
  }
  return ticks;
}

/**
 * Unweighted quantile with linear interpolation (type R-7) over an ascending
 * array. Deliberately NOT the gauge's weighted estimator: the map describes
 * the observed spread of raw records; the gauge estimates a fair price.
 */
export function quantile(sortedAsc: number[], q: number): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  const h = (n - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, n - 1);
  return sortedAsc[lo] + (h - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

/** Keep only marks of one form (null = all forms). */
export function filterByForm(marks: MapMark[], form: string | null): MapMark[] {
  return form == null ? marks : marks.filter((m) => m.form === form);
}

/** One drawable track: the marks of a single element x tier x form group. */
export interface Track {
  band: TierBand;
  form: string;
  marks: MapMark[];
}

/**
 * Group filtered marks into per-form tracks: retail block first, then bulk;
 * within a block, forms by observation count descending, alphabetical
 * tiebreak. Marks arrive price-ascending from the model and Map preserves
 * insertion order, so each track's marks stay price-sorted. This is the form
 * law's enforcement point: statistics downstream only ever see one track.
 */
export function groupTracks(
  retailMarks: MapMark[],
  bulkMarks: MapMark[],
): Track[] {
  const block = (marks: MapMark[], band: TierBand): Track[] => {
    const byForm = new Map<string, MapMark[]>();
    for (const m of marks) {
      const list = byForm.get(m.form);
      if (list) list.push(m);
      else byForm.set(m.form, [m]);
    }
    return [...byForm.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([form, ms]) => ({ band, form, marks: ms }));
  };
  return [...block(retailMarks, 'retail'), ...block(bulkMarks, 'bulk')];
}

/**
 * Derive the descriptive stats + band geometry for a set of visible marks.
 * The one derivation feeding the chart, the printed labels, and the table
 * twin, so they can never disagree. Returns null for an empty set (the row
 * then states the absence honestly instead of drawing nothing).
 */
export function deriveTierStats(
  marks: MapMark[],
  domain: [number, number],
): TierStats | null {
  if (marks.length === 0) return null;

  const prices = marks.map((m) => m.price).sort((a, b) => a - b);
  const n = prices.length;
  const min = prices[0];
  const max = prices[n - 1];
  const span = max - min;

  const hasQuartiles = n >= MIN_QUARTILE_N;
  const p25 = hasQuartiles ? round2(quantile(prices, 0.25)) : null;
  const median = hasQuartiles ? round2(quantile(prices, 0.5)) : null;
  const p75 = hasQuartiles ? round2(quantile(prices, 0.75)) : null;

  // Geometry gates: strip needs >=2 observations AND a real span (GaugeBar's
  // collapse guard generalized); the band/tick need the quartiles.
  const minPct = logPct(min, domain);
  const maxPct = logPct(max, domain);
  const stripPct =
    n >= MIN_STRIP_N && span > 0
      ? { left: minPct, width: Math.max(0, maxPct - minPct) }
      : null;
  const bandPct =
    hasQuartiles && p25 != null && p75 != null
      ? {
          left: logPct(p25, domain),
          width: Math.max(0, logPct(p75, domain) - logPct(p25, domain)),
        }
      : null;
  const medianPct = median != null ? logPct(median, domain) : null;

  let latestDate = marks[0].date;
  for (const m of marks) if (m.date > latestDate) latestDate = m.date;

  return {
    n,
    min,
    p25,
    median,
    p75,
    max,
    latestDate,
    forms: [...new Set(marks.map((m) => m.form))].sort(),
    distinctSellers: new Set(marks.map((m) => m.seller)).size,
    stripPct,
    bandPct,
    medianPct,
  };
}

/**
 * Vertical stacking offsets for exact-duplicate prices (e.g. the two $2 La
 * retail quotes): without an offset the marks coincide and the printed n
 * looks wrong. Y carries no meaning inside a sub-track, so a small
 * deterministic stack misstates nothing; horizontal jitter would.
 */
export function dupOffsets(marks: MapMark[]): Map<string, number> {
  const seen = new Map<number, number>();
  const offsets = new Map<string, number>();
  for (const m of [...marks].sort((a, b) => a.price - b.price)) {
    const count = seen.get(m.price) ?? 0;
    seen.set(m.price, count + 1);
    if (count > 0) offsets.set(m.id, count);
  }
  return offsets;
}
