'use client';

/**
 * SiteNav — the primary navigation island (Prompt 14). Renders the grouped IA
 * (Data · Intelligence · Tools · Alerts · About) two ways:
 *
 *   • Desktop (≥md): a dense bar of disclosure menus. Each group is a <button>
 *     that opens a dropdown of links (open on hover/focus/click, close on
 *     mouse-leave, Escape, outside-click, or focus leaving the group). This is
 *     the W3C "disclosure navigation" pattern — links stay real links, so it
 *     works with a keyboard and without JS hydration's help.
 *   • Mobile (<md): a 44px hamburger toggles a full-width panel listing every
 *     group expanded, with 44px link targets.
 *
 * Active state (needs the client `usePathname`): a route is active for itself
 * and its descendants, so /elements/Dy still lights the "Data" group + Elements.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { ALERTS_LINK, PRIMARY_NAV, type NavGroup, type NavItem } from './nav';

function useIsActive() {
  const pathname = usePathname();
  return useCallback(
    (href: string) =>
      pathname === href ||
      pathname === `${href}/` ||
      pathname.startsWith(`${href}/`),
    [pathname],
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Small "Soon" tag for not-yet-built routes. */
function SoonTag() {
  return (
    <span className="rounded-sm border border-border bg-raised px-1 py-px font-mono text-2xs uppercase tracking-caps text-fg-dim">
      Soon
    </span>
  );
}

/** A link row inside a dropdown / mobile panel: label (+ Soon) over a descriptor. */
function MenuItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span
          className={cn(
            'font-medium',
            active ? 'text-accent-strong' : 'text-fg',
          )}
        >
          {item.label}
        </span>
        {item.soon ? <SoonTag /> : null}
        {item.external ? (
          <span aria-hidden="true" className="text-2xs text-fg-dim">
            ↗
          </span>
        ) : null}
      </span>
      {item.description ? (
        <span className="mt-0.5 block text-2xs leading-snug text-fg-dim">
          {item.description}
        </span>
      ) : null}
    </>
  );

  const className =
    'block px-3 py-2 transition-colors duration-fast hover:bg-overlay';

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
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
      {inner}
    </Link>
  );
}

/** One desktop disclosure menu (a group + its dropdown). */
function GroupMenu({
  group,
  open,
  setOpen,
  isActive,
  align = 'left',
}: {
  group: NavGroup;
  open: boolean;
  setOpen: (heading: string | null) => void;
  isActive: (href: string) => boolean;
  /** Anchor the panel left or right of the trigger (right for right-of-bar groups). */
  align?: 'left' | 'right';
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupActive = group.items.some((i) => !i.external && isActive(i.href));
  const panelId = `nav-menu-${slug(group.heading)}`;

  const close = () => setOpen(null);

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(group.heading)}
      onMouseLeave={close}
      onBlur={(e) => {
        // Close when focus leaves the group entirely (Tab past the last link).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(open ? null : group.heading)}
        className={cn(
          'flex items-center gap-1 rounded-sm px-2.5 py-1 text-sm font-medium transition-colors duration-fast',
          groupActive || open
            ? 'text-accent-strong'
            : 'text-fg-muted hover:bg-overlay hover:text-fg',
        )}
      >
        {group.heading}
        <span
          aria-hidden="true"
          className={cn(
            'text-2xs text-fg-dim transition-transform duration-fast',
            open && 'rotate-180',
          )}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close();
              triggerRef.current?.focus();
            }
          }}
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[16rem] border border-border-strong bg-surface py-1',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <MenuItem
                  item={item}
                  active={!item.external && isActive(item.href)}
                  onNavigate={close}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

export function SiteNav() {
  const isActive = useIsActive();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close any open desktop menu on outside-click or Escape (safety net beyond
  // the per-group handlers — covers clicks elsewhere in the header/page).
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openGroup]);

  const alertsActive = isActive(ALERTS_LINK.href);

  return (
    <nav ref={navRef} aria-label="Primary">
      {/* ── Desktop ──────────────────────────────────────────────────────── */}
      <ul className="hidden items-center gap-0.5 md:flex">
        {PRIMARY_NAV.map((group, i) => (
          <GroupMenu
            key={group.heading}
            group={group}
            open={openGroup === group.heading}
            setOpen={setOpenGroup}
            isActive={isActive}
            // Right-anchor the panels in the right half of the right-clustered
            // bar so a wide dropdown never overflows the viewport edge.
            align={i >= PRIMARY_NAV.length / 2 ? 'right' : 'left'}
          />
        ))}
        <li>
          <Link
            href={ALERTS_LINK.href}
            aria-current={alertsActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm font-medium transition-colors duration-fast',
              alertsActive
                ? 'text-accent-strong'
                : 'text-fg-muted hover:bg-overlay hover:text-fg',
            )}
          >
            {ALERTS_LINK.label}
            {ALERTS_LINK.soon ? <SoonTag /> : null}
          </Link>
        </li>
      </ul>

      {/* ── Mobile toggle — 44px touch target (a11y minimum). ────────────── */}
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        onClick={() => setMobileOpen((v) => !v)}
        className="-mr-2.5 flex h-11 w-11 flex-col items-center justify-center gap-1 text-fg-muted hover:text-fg md:hidden"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-px w-5 bg-current"
            aria-hidden="true"
          />
        ))}
      </button>

      {/* ── Mobile panel — every group expanded, 44px link rows. ─────────── */}
      {mobileOpen ? (
        <div
          id="mobile-nav"
          className="absolute left-0 right-0 top-full max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-border bg-surface px-6 py-4 md:hidden"
        >
          {PRIMARY_NAV.map((group) => (
            <section key={group.heading} className="mb-5 last:mb-0">
              <p className="eyebrow mb-1">{group.heading}</p>
              <ul>
                {group.items.map((item) => {
                  const active = !item.external && isActive(item.href);
                  const label = (
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-medium',
                          active ? 'text-accent-strong' : 'text-fg',
                        )}
                      >
                        {item.label}
                      </span>
                      {item.soon ? <SoonTag /> : null}
                      {item.external ? (
                        <span aria-hidden="true" className="text-2xs text-fg-dim">
                          ↗
                        </span>
                      ) : null}
                    </span>
                  );
                  const rowClass =
                    'flex min-h-[44px] items-center border-b border-border/60 last:border-0';
                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={rowClass}
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={rowClass}
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* Alerts (standalone top-level link) */}
          <section className="mb-0">
            <p className="eyebrow mb-1">Alerts</p>
            <Link
              href={ALERTS_LINK.href}
              aria-current={alertsActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-[44px] items-center gap-2"
            >
              <span
                className={cn(
                  'font-medium',
                  alertsActive ? 'text-accent-strong' : 'text-fg',
                )}
              >
                {ALERTS_LINK.label}
              </span>
              {ALERTS_LINK.soon ? <SoonTag /> : null}
            </Link>
          </section>
        </div>
      ) : null}
    </nav>
  );
}
