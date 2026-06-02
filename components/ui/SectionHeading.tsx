/**
 * SectionHeading. The standard section title used across reference and content
 * pages: an optional category/status swatch, a serif heading, an optional
 * right-aligned count or actions slot, an underline rule, and an optional
 * description below. Replaces the hand-rolled `<h2 class="… border-b …">`
 * pattern (e.g. the elements index) with one prop-driven component.
 *
 * Server component (no interactivity). Pass `id` to make the heading a
 * deep-link anchor; the scroll margin keeps it clear of the sticky header.
 */
import { cn } from './cn';

export interface SectionHeadingProps {
  title: React.ReactNode;
  /** Heading level: `h2` (default) or `h3`. */
  as?: 'h2' | 'h3';
  /** Deep-link anchor id (e.g. `display-price`). */
  id?: string;
  /** A solid swatch utility (e.g. `bg-category-ree-light`) shown before the title. */
  swatch?: string;
  /** Right-aligned mono count (e.g. element tally). Ignored when `actions` is set. */
  count?: React.ReactNode;
  /** Right-aligned controls (filters, links). Takes precedence over `count`. */
  actions?: React.ReactNode;
  /** Supporting copy rendered under the rule. */
  description?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  as: Tag = 'h2',
  id,
  swatch,
  count,
  actions,
  description,
  className,
}: SectionHeadingProps) {
  const size = Tag === 'h2' ? 'text-lg' : 'text-base';
  return (
    <div className={cn('mb-3', className)}>
      <Tag
        id={id}
        className={cn(
          'flex items-center gap-2 border-b border-border pb-2 font-serif font-semibold text-fg',
          size,
          id && 'scroll-mt-16',
        )}
      >
        {swatch ? (
          <span
            className={cn('inline-block h-3.5 w-[3px]', swatch)}
            aria-hidden="true"
          />
        ) : null}
        {title}
        {actions ? (
          <span className="ml-auto flex items-center gap-2">{actions}</span>
        ) : count != null ? (
          <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
            {count}
          </span>
        ) : null}
      </Tag>
      {description ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
