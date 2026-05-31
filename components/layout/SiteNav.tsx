'use client';

/**
 * SiteNav — the primary nav links with active-route highlighting (needs the
 * client `usePathname`) and a mobile disclosure menu. Desktop: inline links.
 * Mobile (<md): a toggle button reveals a full-width dropdown beneath the
 * header. A route counts as active for itself and its descendants (so
 * /elements/Dy still lights "Elements").
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/components/ui/cn';
import { PRIMARY_NAV } from './nav';

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href ||
    pathname === `${href}/` ||
    pathname.startsWith(`${href}/`);

  const linkClass = (active: boolean) =>
    cn(
      'rounded-sm px-2.5 py-1 text-sm font-medium transition-colors duration-fast',
      active
        ? 'text-accent-strong'
        : 'text-fg-muted hover:bg-overlay hover:text-fg',
    );

  return (
    <>
      {/* Desktop */}
      <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={linkClass(active)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col gap-1 p-2 md:hidden"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-px w-5 bg-fg-muted"
            aria-hidden="true"
          />
        ))}
      </button>

      {/* Mobile dropdown */}
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="absolute left-0 right-0 top-full flex flex-col border-b border-border bg-surface px-6 py-2 md:hidden"
        >
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'py-2 text-sm font-medium transition-colors duration-fast',
                  active ? 'text-accent-strong' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
