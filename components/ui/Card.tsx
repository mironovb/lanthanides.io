/**
 * Card & Panel — the two container primitives.
 *
 * `Card` is a bare bordered graphite surface (sharp corners, no shadow — the
 * system uses borders for separation, never elevation). `Panel` adds a header
 * bar with an optional eyebrow, a serif title, and an actions slot, with the
 * body padded below a divider. Both are server components.
 */
import { cn } from './cn';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export interface CardProps {
  children: React.ReactNode;
  /** Inner padding step (default `md`). Use `none` to pad children yourself. */
  padding?: Padding;
  /** Adds a hover affordance for clickable cards (border brightens). */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
}

export function Card({
  children,
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className,
}: CardProps) {
  return (
    <Tag
      className={cn(
        'border border-border bg-surface',
        PADDING[padding],
        interactive &&
          'transition-colors duration-fast hover:border-border-strong',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export interface PanelProps {
  children: React.ReactNode;
  title: React.ReactNode;
  /** Mono uppercase kicker above the title. */
  eyebrow?: React.ReactNode;
  /** Right-aligned controls in the header (links, filters, counts). */
  actions?: React.ReactNode;
  /** Heading level for the title (default `h2`). */
  titleAs?: 'h2' | 'h3';
  /** Body padding step (default `md`). */
  padding?: Padding;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  children,
  title,
  eyebrow,
  actions,
  titleAs: TitleTag = 'h2',
  padding = 'md',
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section className={cn('border border-border bg-surface', className)}>
      <header className="flex items-baseline gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <TitleTag className="truncate font-serif text-base font-semibold text-fg">
            {title}
          </TitleTag>
        </div>
        {actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>
      <div className={cn(PADDING[padding], bodyClassName)}>{children}</div>
    </section>
  );
}
