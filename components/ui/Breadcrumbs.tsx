/**
 * Breadcrumbs — the trail shown under the header on interior pages. Formalizes
 * the inline `<nav aria-label="Breadcrumb">` markup that every page currently
 * hand-rolls. The last item is the current page (no link, `aria-current`).
 *
 * Server component. Visual-only — the machine-readable BreadcrumbList JSON-LD
 * is emitted separately by the structured-data layer, so this stays presentational.
 */
import Link from 'next/link';
import { cn } from './cn';

export interface Crumb {
  label: React.ReactNode;
  /** Omit on the final (current) crumb. */
  href?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('text-sm text-fg-dim', className)}
    >
      <ol className="flex flex-wrap items-center">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors duration-fast hover:text-fg"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-fg' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span className="px-2 text-border-strong" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
