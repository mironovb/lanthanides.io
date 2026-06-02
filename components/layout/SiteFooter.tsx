/**
 * SiteFooter. The old static site footer (git 56e980f, _includes/footer.html):
 * a centered, calm block of a link row, a live stats line, one methodology note,
 * and a license line. A small secondary row carries the tools, alerts, and the
 * open-data exports, which the old site kept out of the top nav.
 *
 * Stats are read live from the data layer, never hardcoded. Server component.
 */
import Link from 'next/link';
import { getElements, getPriceRecords } from '@/lib/data';
import { Container } from './Container';
import {
  FOOTER_LINKS,
  FOOTER_TOOLS,
  OPEN_DATA_EXPORTS,
  type NavItem,
} from './nav';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const MIT_URL = 'https://opensource.org/licenses/MIT';

const LINK_CLASS = 'transition-colors duration-fast hover:text-fg';
const DOTTED_LINK =
  'text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg';

function FooterLink({ item }: { item: NavItem }) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {item.label}
      </a>
    );
  }
  if (item.raw) {
    return (
      <a href={item.href} className={LINK_CLASS}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={LINK_CLASS}>
      {item.label}
    </Link>
  );
}

export function SiteFooter() {
  const elementCount = getElements().length;
  const records = getPriceRecords();
  const recordCount = records.length;

  // Latest data date: the newest quote_date across all price records (ISO dates
  // sort lexically), the same value the old footer computed.
  let latest = '';
  for (const r of records) if (r.quote_date > latest) latest = r.quote_date;

  const year = new Date().getFullYear();

  return (
    <footer role="contentinfo" className="mt-16 border-t border-fg">
      <Container className="flex flex-col items-center gap-4 py-8 text-center">
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-fg-muted"
        >
          {FOOTER_LINKS.map((item) => (
            <FooterLink key={item.href} item={item} />
          ))}
        </nav>

        <nav
          aria-label="Tools and data"
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-2xs text-fg-dim"
        >
          {[...FOOTER_TOOLS, ...OPEN_DATA_EXPORTS].map((item) => (
            <FooterLink key={item.href} item={item} />
          ))}
        </nav>

        <p className="font-mono text-xs text-fg-muted">
          {elementCount} elements · {recordCount} price records
          {latest ? ` · Latest data: ${latest}` : ''}
        </p>

        <p className="max-w-prose text-sm leading-relaxed text-fg-dim">
          Prices shown are retail reference prices, the lowest verified in stock
          price from an established retailer for a practical quantity, with bulk
          benchmarks shown separately.{' '}
          <Link href="/methodology/#display-price" className={DOTTED_LINK}>
            Full methodology
          </Link>
        </p>

        <p className="text-xs text-fg-dim">
          © {year} lanthanides.io ·{' '}
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="license noopener noreferrer"
            className={DOTTED_LINK}
          >
            CC BY 4.0
          </a>{' '}
          ·{' '}
          <a
            href={MIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={DOTTED_LINK}
          >
            MIT
          </a>
        </p>
      </Container>
    </footer>
  );
}
