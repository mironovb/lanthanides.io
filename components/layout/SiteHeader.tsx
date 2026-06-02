/**
 * SiteHeader. The sticky top bar from the old static site: the brand on the
 * left, a flat nav row on the right. Server component; the interactive nav
 * (active state, mobile toggle) is the <SiteNav> island. `sticky` makes the
 * header the positioning context for the mobile panel (top-full).
 *
 * The brand mark is the real logo image at a 24px footprint with the wordmark
 * beside it, matching the old _includes/nav.html.
 */
import Image from 'next/image';
import Link from 'next/link';
import { Container } from './Container';
import { SiteNav } from './SiteNav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <Container className="flex h-12 items-center justify-between gap-4">
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
        <SiteNav />
      </Container>
    </header>
  );
}
