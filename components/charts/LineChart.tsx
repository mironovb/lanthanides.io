/**
 * LineChart — the shared, dependency-light inline-SVG trend primitive with the
 * data-sufficiency gate built in. This is the ONE component that draws a line;
 * everything else on the site is a table.
 *
 * The gate (components/charts/sufficiency.ts): a series is only plotted when it
 * has at least `min` DISTINCT points (default `MIN_LINE_POINTS`). The filter is
 * applied PER SERIES — a 2-point retail line is never drawn just because the bulk
 * series alongside it is longer. If NO series clears the bar, the chart refuses
 * to render and returns `fallback` (typically a table) instead, so a choppy
 * 2-dot "trend" can never ship.
 *
 * Server component: pure, deterministic SVG (no client JS, no animation). Each
 * point is expected to already be a per-day aggregate (see price-series.ts) so
 * the x axis is one mark per distinct day.
 */
import type { ReactNode } from 'react';
import type { SeriesPoint } from './price-series';
import { distinctCount, meetsThreshold, MIN_LINE_POINTS } from './sufficiency';

export interface LineChartSeries {
  key: string;
  label: string;
  /** Full Tailwind `stroke-*` class (literal, so Tailwind emits it). */
  stroke: string;
  /** Full Tailwind `fill-*` class for the point markers. */
  fill: string;
  points: SeriesPoint[];
}

export interface LineChartProps {
  series: LineChartSeries[];
  /** Minimum distinct points a series needs to be drawn. Defaults to the line rule. */
  min?: number;
  /** Rendered when no series clears the gate (e.g. the observations table). */
  fallback?: ReactNode;
  ariaLabel: string;
  /** y-axis tick formatter (default: compact USD). */
  format?: (n: number) => string;
}

// viewBox geometry; CSS scales the chart to its container width.
const W = 760;
const H = 240;
const M = { top: 16, right: 18, bottom: 30, left: 56 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}`;
}

function compactUsd(v: number): string {
  if (v >= 10000) return `$${Math.round(v / 1000)}k`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return `$${Math.round(v)}`;
  if (v >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  if (v <= 1) return Math.ceil(v * 10) / 10;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

export function LineChart({
  series,
  min = MIN_LINE_POINTS,
  fallback = null,
  ariaLabel,
  format = compactUsd,
}: LineChartProps) {
  // The gate: keep only series with enough DISTINCT days to imply a shape.
  const drawn = series.filter((s) =>
    meetsThreshold(distinctCount(s.points, (p) => p.date), min),
  );
  if (drawn.length === 0) return <>{fallback}</>;

  const all = drawn.flatMap((s) => s.points);
  const xs = all.map((p) => p.t);
  const ys = all.map((p) => p.value);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = niceCeil(Math.max(...ys));
  const xRange = xMax - xMin || 1;
  const yRange = yMax || 1;

  const xScale = (t: number) =>
    xMax === xMin ? M.left + PLOT_W / 2 : M.left + ((t - xMin) / xRange) * PLOT_W;
  const yScale = (v: number) => M.top + PLOT_H - (v / yRange) * PLOT_H;

  const yTicks = [0, yMax / 2, yMax];

  // x labels: first / middle / last distinct day across the drawn series.
  const days = Array.from(new Set(all.map((p) => p.date)))
    .map((d) => ({ date: d, t: Date.parse(d) }))
    .sort((a, b) => a.t - b.t);
  const xLabels =
    days.length <= 2
      ? days
      : [days[0], days[Math.floor((days.length - 1) / 2)], days[days.length - 1]];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className="block h-auto w-full"
    >
      {/* y gridlines + labels */}
      {yTicks.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={M.left}
            y1={yScale(v)}
            x2={M.left + PLOT_W}
            y2={yScale(v)}
            className="stroke-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={M.left - 8}
            y={yScale(v) + 3}
            textAnchor="end"
            fontSize={11}
            className="fill-fg-dim font-mono"
          >
            {format(v)}
          </text>
        </g>
      ))}

      {/* x axis baseline + labels */}
      <line
        x1={M.left}
        y1={M.top + PLOT_H}
        x2={M.left + PLOT_W}
        y2={M.top + PLOT_H}
        className="stroke-border-strong"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {xLabels.map((d, i) => (
        <text
          key={d.date}
          x={xScale(d.t)}
          y={M.top + PLOT_H + 18}
          textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
          fontSize={11}
          className="fill-fg-dim font-mono"
        >
          {shortDate(d.date)}
        </text>
      ))}

      {/* series */}
      {drawn.map((s) => {
        const pts = [...s.points].sort((a, b) => a.t - b.t);
        const path = pts
          .map((p) => `${xScale(p.t).toFixed(1)},${yScale(p.value).toFixed(1)}`)
          .join(' ');
        return (
          <g key={s.key}>
            <polyline
              points={path}
              fill="none"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={s.stroke}
            />
            {pts.map((p) => (
              <circle
                key={p.date}
                cx={xScale(p.t)}
                cy={yScale(p.value)}
                r={3}
                className={s.fill}
              >
                <title>
                  {s.label}: {compactUsd(p.value)}/kg on {p.date}
                  {p.n > 1 ? ` (median of ${p.n})` : ''}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
