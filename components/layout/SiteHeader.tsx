/**
 * SiteHeader. The sticky top bar from the old static site: the brand on the
 * left, a flat nav row on the right. Server component; the interactive nav
 * (active state, mobile toggle) is the <SiteNav> island. `sticky` makes the
 * header the positioning context for the mobile panel (top-full).
 *
 * The brand mark is the real logo image at a 24px footprint with the wordmark
 * beside it, matching the old _includes/nav.html.
 *
 * The "Add a price" button is the site-wide contribute CTA: contributions are
 * the point of the site, so the entry to /contribute/ is one visible tap from
 * every page. It sits OUTSIDE the collapsible nav so it stays visible on
 * mobile without opening the menu.
 *
 * The bar is solid white by default and goes translucent-with-blur only where
 * backdrop-filter is supported, so content scrolling under it stays legible
 * everywhere.
 */
import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui';
import { Container } from './Container';
import { SiteNav } from './SiteNav';
import { CONTRIBUTE_CTA } from './nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface supports-[backdrop-filter]:bg-surface/85 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="lanthanides.io home"
        >
          <Image
            src="/assets/images/logo-48.png"
            alt="lanthanides.io"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0"
            priority
          />
          <span className="font-mono text-sm font-semibold tracking-tightish text-fg">
            lanthanides.io
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteNav />
          <Link
            href={CONTRIBUTE_CTA.href}
            className={buttonClasses('primary', 'sm')}
          >
            <span aria-hidden="true">+</span> {CONTRIBUTE_CTA.label}
          </Link>
        </div>
      </Container>
    </header>
  );
}
