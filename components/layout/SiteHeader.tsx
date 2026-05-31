/**
 * SiteHeader — the sticky top bar: brand mark + wordmark on the left, primary
 * nav on the right. Server component; the interactive nav (active state, mobile
 * menu) is the <SiteNav> island. `sticky` makes the header itself the
 * positioning context for the mobile dropdown (top-full).
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
          aria-label="lanthanides.io — home"
        >
          <span
            className="inline-block h-4 w-4 shrink-0 bg-accent"
            aria-hidden="true"
          />
          <span className="font-mono text-sm font-semibold tracking-tightish text-fg">
            lanthanides.io
          </span>
          <span className="hidden text-2xs uppercase tracking-caps text-fg-dim lg:inline">
            Strategic Materials Ledger
          </span>
        </Link>
        <SiteNav />
      </Container>
    </header>
  );
}
