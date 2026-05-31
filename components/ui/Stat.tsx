/**
 * Stat & StatGrid — big-number callouts for the dense "instrument readout"
 * blocks (coverage tallies, price headlines, dashboard summaries). The value is
 * always monospace + tabular; an optional delta carries up/down/flat color.
 *
 * Server components. `StatGrid` renders a <dl>; each `Stat` is a label/value
 * pair, so a grid of them stays semantic for assistive tech.
 */
import { cn } from './cn';

type Trend = 'up' | 'down' | 'flat';

const TREND_COLOR: Record<Trend, string> = {
  up: 'text-up',
  down: 'text-down',
  flat: 'text-neutral',
};

const VALUE_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
} as const;

export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Small trailing unit (e.g. `USD/kg`, `elements`). */
  unit?: React.ReactNode;
  /** A change/secondary figure, colored by `trend`. */
  delta?: React.ReactNode;
  trend?: Trend;
  /** Fine print under the value. */
  hint?: React.ReactNode;
  size?: keyof typeof VALUE_SIZE;
  className?: string;
}

export function Stat({
  label,
  value,
  unit,
  delta,
  trend,
  hint,
  size = 'md',
  className,
}: StatProps) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className={cn('font-mono tabular-nums text-fg', VALUE_SIZE[size])}>
          {value}
        </span>
        {unit ? <span className="text-xs text-fg-dim">{unit}</span> : null}
      </dd>
      {delta != null ? (
        <p
          className={cn(
            'mt-0.5 font-mono text-xs tabular-nums',
            trend ? TREND_COLOR[trend] : 'text-fg-muted',
          )}
        >
          {delta}
        </p>
      ) : null}
      {hint ? <p className="mt-0.5 text-2xs text-fg-dim">{hint}</p> : null}
    </div>
  );
}

export interface StatGridProps {
  children: React.ReactNode;
  /** Columns at the widest breakpoint (default 4). */
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}

const GRID_COLS: Record<NonNullable<StatGridProps['cols']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

export function StatGrid({ children, cols = 4, className }: StatGridProps) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', GRID_COLS[cols], className)}>
      {children}
    </dl>
  );
}
