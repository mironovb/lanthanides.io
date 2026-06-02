/**
 * SiteHeader. The sticky top bar from the old static site: the brand on the
 * left, a flat nav row on the right. Server component; the interactive nav
 * (active state, mobile toggle) is the <SiteNav> island. `sticky` makes the
 * header the positioning context for the mobile panel (top-full).
 *
 * The brand mark is a teal square for now; prompt 13 swaps in the real logo
 * image at the same 24px footprint.
 */
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
          <span
            className="inline-block h-6 w-6 shrink-0 rounded-md bg-accent"
            aria-hidden="true"
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
