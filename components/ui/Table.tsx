/**
 * Table primitives — compact, zebra-free, hairline-ruled. Numeric cells are
 * monospace, tabular, and right-aligned (the core data convention). These are
 * plain presentational components with no hooks, so they render in BOTH server
 * components (static tables) and client components (the sortable table below).
 *
 * `TH` carries the sortable affordance: pass `sortable` plus `sortDir`
 * ('asc' | 'desc' | null) and `onSort`; it wires `aria-sort`, the cursor, and
 * the ↑/↓/↕ glyph. Compose them, or use <SortableTable> for the common case.
 */
import { cn } from './cn';

type Align = 'left' | 'right' | 'center';

const ALIGN: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table({
  children,
  className,
  caption,
  bordered = true,
}: {
  children: React.ReactNode;
  className?: string;
  caption?: React.ReactNode;
  /** Outer border + scroll container. Set false when nested in a Card/Panel. */
  bordered?: boolean;
}) {
  return (
    <div className={cn('overflow-x-auto', bordered && 'border border-border')}>
      <table className={cn('w-full border-collapse text-sm', className)}>
        {caption ? (
          <caption className="px-3 py-2 text-left text-2xs text-fg-dim">
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  hover = true,
  className,
}: {
  children: React.ReactNode;
  /** Row hover wash (default true). Disable for header/summary rows. */
  hover?: boolean;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'border-b border-border last:border-0',
        hover && 'transition-colors duration-fast hover:bg-overlay',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export interface THProps {
  children?: React.ReactNode;
  numeric?: boolean;
  align?: Align;
  sortable?: boolean;
  /** Active sort direction for this column, or null when sortable-but-inactive. */
  sortDir?: 'asc' | 'desc' | null;
  onSort?: () => void;
  scope?: 'col' | 'row';
  className?: string;
}

export function TH({
  children,
  numeric = false,
  align,
  sortable = false,
  sortDir = null,
  onSort,
  scope = 'col',
  className,
}: THProps) {
  const a = align ?? (numeric ? 'right' : 'left');
  const ariaSort = !sortable
    ? undefined
    : sortDir === 'asc'
      ? 'ascending'
      : sortDir === 'desc'
        ? 'descending'
        : 'none';
  return (
    <th
      scope={scope}
      aria-sort={ariaSort}
      onClick={sortable ? onSort : undefined}
      className={cn(
        'whitespace-nowrap border-b border-border bg-raised px-3 py-2 text-2xs font-semibold uppercase tracking-caps text-fg-dim',
        ALIGN[a],
        sortable && 'cursor-pointer select-none hover:text-fg',
        className,
      )}
    >
      {children}
      {sortable ? (
        <span className="ml-1 text-fg-dim" aria-hidden="true">
          {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '↕'}
        </span>
      ) : null}
    </th>
  );
}

export interface TDProps {
  children?: React.ReactNode;
  numeric?: boolean;
  align?: Align;
  className?: string;
  colSpan?: number;
}

export function TD({ children, numeric = false, align, className, colSpan }: TDProps) {
  const a = align ?? (numeric ? 'right' : 'left');
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-3 py-2 align-top',
        ALIGN[a],
        numeric ? 'whitespace-nowrap font-mono tabular-nums text-fg' : 'text-fg-muted',
        className,
      )}
    >
      {children}
    </td>
  );
}
