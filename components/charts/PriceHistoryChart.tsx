/**
 * PriceHistoryChart — the element-page price trend, gated. Renders an inline-SVG
 * line ONLY for tiers that clear the sufficiency gate (≥ MIN_LINE_POINTS distinct
 * days in that tier); otherwise it renders nothing and the always-present Price
 * History observations table (Prompt 9) stands in below it.
 *
 * Measured against the live data on 2026-05-31, no single tier reaches the
 * threshold — the deepest are Sc and Te at 4 distinct *bulk* days — so this
 * component returns null for ALL 31 elements today, and every element shows the
 * table. That is the intended, honest outcome (docs/VISUALIZATION-AUDIT.md): the
 * gate provably prevents choppy output. The line activates automatically when
 * the pipeline deepens any tier to ≥5 clean days; the build verifies the render
 * path stays correct.
 *
 * Server component: pure SVG via <LineChart>, no client JS.
 */
import type { PriceHistory } from '@/lib/types';
import { LineChart, type LineChartSeries } from './LineChart';
import { dailyMedianSeries, type SeriesPoint } from './price-series';
import { MIN_LINE_POINTS } from './sufficiency';

/** Tier presentation — full literal classes so Tailwind emits them. */
const TIERS: {
  key: 'retail' | 'bulk';
  label: string;
  stroke: string;
  fill: string;
  swatch: string;
}[] = [
  {
    key: 'retail',
    label: 'Retail',
    stroke: 'stroke-accent-strong',
    fill: 'fill-accent-strong',
    swatch: 'bg-accent-strong',
  },
  {
    key: 'bulk',
    label: 'Bulk',
    stroke: 'stroke-fg-muted',
    fill: 'fill-fg-muted',
    swatch: 'bg-fg-muted',
  },
];

function spanSummary(points: SeriesPoint[]): string {
  const obs = points.reduce((n, p) => n + p.n, 0);
  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;
  const span = first === last ? first : `${first} → ${last}`;
  return `${points.length} daily median${points.length === 1 ? '' : 's'} across ${span} (${obs} observation${obs === 1 ? '' : 's'})`;
}

export function PriceHistoryChart({
  history,
  elementName,
}: {
  history: PriceHistory | null;
  elementName: string;
}) {
  // Build each tier's per-day median series, keep only those that clear the gate.
  const built = TIERS.map((t) => ({
    ...t,
    points: dailyMedianSeries(history, t.key),
  })).filter((t) => t.points.length >= MIN_LINE_POINTS);

  // No tier deep enough for an honest line — the table below carries the data.
  if (built.length === 0) return null;

  const series: LineChartSeries[] = built.map((t) => ({
    key: t.key,
    label: t.label,
    stroke: t.stroke,
    fill: t.fill,
    points: t.points,
  }));

  return (
    <section
      className="mb-6 border border-border bg-surface p-4"
      aria-labelledby="price-trend-title"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
        <h2
          id="price-trend-title"
          className="font-serif text-lg font-semibold text-fg"
        >
          Price Trend{' '}
          <span className="font-sans text-xs font-normal text-fg-dim">
            (USD/kg, daily medians)
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {built.map((t) => (
            <span
              key={t.key}
              className="flex items-center gap-1.5 font-mono text-2xs text-fg-muted"
            >
              <span
                className={`inline-block h-2 w-3 ${t.swatch}`}
                aria-hidden="true"
              />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <LineChart
        series={series}
        ariaLabel={`${elementName} price trend, USD per kilogram, by tier`}
      />

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-fg-muted">
        {built.map((t) => (
          <p key={t.key}>
            <span className="font-semibold text-fg-dim">{t.label}:</span>{' '}
            {spanSummary(t.points)}.
          </p>
        ))}
        <p>
          Each point is a per-day median of that day&rsquo;s recorded offers;
          derived aggregate rows are excluded. A tier is only drawn once it spans
          at least {MIN_LINE_POINTS} distinct observation days — otherwise it
          appears in the Price History table below instead of as a line.
        </p>
      </div>
    </section>
  );
}
