/**
 * Badge & Chip: the small inline status/label primitives.
 *
 * `Badge` is the semantic, color-coded tag. Its variants are the site's meaning
 * vocabulary and nothing else: the four element categories, the five regulatory
 * states (restricted/monitored/normal/active/suspended), the price-movement trio
 * (up/down/flat), plus `accent` and a neutral `default`. Status badges are mono
 * + uppercase; category/tone badges are sans.
 *
 * `Chip` is a quieter, non-semantic tag: a key/label or legend entry, with an
 * optional leading color dot. For *interactive* multi-select filters use
 * <FilterChips> instead.
 *
 * Class strings are full literals (Tailwind only emits what it can statically
 * see). Category classes intentionally mirror components/elements/categories.ts
 * so the base library carries no dependency on the element feature module.
 */
import { cn } from './cn';

export type BadgeVariant =
  // tones
  | 'default'
  | 'accent'
  // price movement
  | 'up'
  | 'down'
  | 'flat'
  // element categories
  | 'rare_earth_light'
  | 'rare_earth_heavy'
  | 'strategic_metal'
  | 'semiconductor_metal'
  // regulatory / export-control states
  | 'normal'
  | 'monitored'
  | 'active'
  | 'restricted'
  | 'suspended';

const VARIANT: Record<BadgeVariant, string> = {
  default: 'text-fg-muted border-border bg-raised',
  accent: 'text-accent-strong border-accent/40 bg-accent/10',

  up: 'text-up border-up/25 bg-up/10',
  down: 'text-down border-down/25 bg-down/10',
  flat: 'text-neutral border-border bg-raised',

  rare_earth_light:
    'text-category-ree-light border-category-ree-light/40 bg-category-ree-light/10',
  rare_earth_heavy:
    'text-category-ree-heavy border-category-ree-heavy/40 bg-category-ree-heavy/10',
  strategic_metal:
    'text-category-strategic border-category-strategic/40 bg-category-strategic/10',
  semiconductor_metal:
    'text-category-semiconductor border-category-semiconductor/40 bg-category-semiconductor/10',

  normal: 'text-risk-low border-risk-low/25 bg-risk-low/10',
  monitored: 'text-risk-medium border-risk-medium/25 bg-risk-medium/10',
  active: 'text-risk-medium border-risk-medium/30 bg-risk-medium/10',
  restricted: 'text-risk-high border-risk-high/25 bg-risk-high/10',
  suspended: 'text-risk-suspended border-risk-suspended/30 bg-risk-suspended/10',
};

/** Regulatory/control states render mono + uppercase; categories/tones do not. */
const MONO_VARIANTS = new Set<BadgeVariant>([
  'normal',
  'monitored',
  'active',
  'restricted',
  'suspended',
]);

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Render as a link when an href is supplied (e.g. a reg badge → notice). */
  href?: string;
  title?: string;
}

export function Badge({
  children,
  variant = 'default',
  className,
  href,
  title,
}: BadgeProps) {
  const classes = cn(
    'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-semibold leading-none',
    MONO_VARIANTS.has(variant) && 'font-mono uppercase tracking-caps',
    VARIANT[variant],
    href && 'transition-opacity duration-fast hover:opacity-80',
    className,
  );
  if (href) {
    return (
      <a href={href} title={title} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <span title={title} className={classes}>
      {children}
    </span>
  );
}

export interface ChipProps {
  children: React.ReactNode;
  /** A solid color utility for a leading dot (e.g. `bg-up`, `bg-category-strategic`). */
  dot?: string;
  className?: string;
}

export function Chip({ children, dot, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2 py-0.5 text-2xs text-fg-muted',
        className,
      )}
    >
      {dot ? (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full', dot)}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
