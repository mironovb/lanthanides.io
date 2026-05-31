'use client';

/**
 * FilterChips — a controlled single-select chip strip (the generalized base of
 * the regulatory tracker's element filter). The parent owns the selection;
 * this renders one <button> per option (plus an optional "All" that clears),
 * keyboard-accessible with `aria-pressed`. Clicking the active chip clears it.
 *
 * For static, non-interactive tags use <Chip>; for tabbed views use <Tabs>.
 */
import { cn } from './cn';

export interface ChipOption {
  value: string;
  label: React.ReactNode;
}

export function FilterChips({
  options,
  value,
  onChange,
  label,
  allLabel = 'All',
  showAll = true,
  className,
}: {
  options: ChipOption[];
  /** Selected value, or null for "All"/none. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Visible group label (also the accessible name). */
  label?: string;
  allLabel?: React.ReactNode;
  /** Render the leading clear-all chip (default true). */
  showAll?: boolean;
  className?: string;
}) {
  const labelId = label ? 'filterchips-label' : undefined;
  const base =
    'rounded-sm border px-2 py-0.5 font-mono text-2xs font-semibold transition-colors duration-fast';
  const chipClass = (active: boolean) =>
    cn(
      base,
      active
        ? 'border-accent bg-accent text-base'
        : 'border-border bg-raised text-fg-muted hover:border-accent hover:text-accent-strong',
    );

  return (
    <div
      className={cn(
        'flex flex-col gap-2 border border-border bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3',
        className,
      )}
    >
      {label ? (
        <span
          id={labelId}
          className="shrink-0 text-2xs font-semibold uppercase tracking-caps text-fg-dim"
        >
          {label}
        </span>
      ) : null}
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1"
      >
        {showAll ? (
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            className={chipClass(value === null)}
          >
            {allLabel}
          </button>
        ) : null}
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : opt.value)}
              className={chipClass(active)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
