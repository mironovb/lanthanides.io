'use client';

/**
 * SiteNav. A flat row of plain links, matching the old static site
 * (_includes/nav.html, _sass/_header.scss, assets/js/main.js):
 *
 *   Desktop (>= md): one inline row. The active link is teal and semibold.
 *   Mobile (< md): a single toggle button (two bars) shows and hides a stacked
 *     list of the same links, the way the old main.js flipped a class and
 *     aria-expanded.
 *
 * Real links throughout, so it works with a keyboard and without JS. The active
 * route gets aria-current="page".
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/components/ui/cn';
import { NAV_LINKS, type NavItem } from './nav';

/** Strip a trailing slash (except for root) so trailing-slash URLs compare cleanly. */
const trim = (p: string) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const className = cn(
    'rounded-md px-3 py-1.5 text-sm transition-colors duration-fast',
    // Full-width 44px rows in the mobile panel; inline on desktop.
    'max-md:flex max-md:min-h-[44px] max-md:w-full max-md:items-center',
    active
      ? 'bg-accent/10 font-semibold text-accent'
      : 'font-medium text-fg-muted hover:bg-overlay/60 hover:text-fg',
  );

  // Status pill after the label (the Badge `accent` recipe, inlined: this row
  // is the one place a Badge would sit inside a link). Deliberately NOT
  // aria-hidden — "Preliminary" belongs in the link's accessible name. The
  // inline-block box renders identically inside the desktop inline link and
  // the 44px mobile flex row.
  const badge = item.badge ? (
    <span className="ml-1.5 inline-block rounded-sm border border-accent/40 bg-accent/10 px-1 py-px font-mono text-2xs uppercase tracking-caps text-accent-strong">
      {item.badge}
    </span>
  ) : null;

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.label}
        {badge}
      </a>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={className}
    >
      {item.label}
      {badge}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const h = trim(href);
    const p = trim(pathname);
    return p === h || p.startsWith(`${h}/`);
  };

  return (
    <>
      {/* Mobile toggle (two bars), matching the old nav. */}
      <button
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((v) => !v)}
        className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5 md:hidden"
      >
        <span aria-hidden="true" className="block h-0.5 w-5 rounded-sm bg-fg" />
        <span aria-hidden="true" className="block h-0.5 w-5 rounded-sm bg-fg" />
      </button>

      <nav
        id="site-nav"
        aria-label="Main navigation"
        className={cn(
          'items-center gap-1 md:flex',
          open
            ? 'absolute left-0 right-0 top-full flex flex-col gap-0.5 border-b border-border bg-surface px-4 py-3 shadow-lg'
            : 'hidden',
        )}
      >
        {NAV_LINKS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={!item.external && isActive(item.href)}
            onNavigate={() => setOpen(false)}
          />
        ))}
      </nav>
    </>
  );
}
