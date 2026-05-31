/**
 * SiteFooter — license, open-data, contribute/contact, and secondary nav.
 * Server component. The open-data + CC BY 4.0 framing is load-bearing for the
 * product (the dataset *is* the product); contact is the real corrections
 * channel from humans.txt. No fabricated stats — counts live on the pages.
 */
import Link from 'next/link';
import { Container } from './Container';
import { FOOTER_NAV } from './nav';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const CONTACT_EMAIL = 'mironovb@berea.edu';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-strong">
      <Container className="py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand + blurb */}
          <div>
            <p className="font-mono text-sm font-semibold text-fg">
              lanthanides.io
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-fg-dim">
              Sourced pricing, supply-chain risk, and regulatory intelligence
              for rare-earth and strategic materials.
            </p>
          </div>

          {/* Secondary nav groups */}
          {FOOTER_NAV.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="eyebrow">{group.heading}</p>
              <ul className="mt-3 space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-xs text-fg-muted transition-colors duration-fast hover:text-fg"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Open data + contribute */}
          <nav aria-label="Open data">
            <p className="eyebrow">Open data</p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <Link
                  href="/data"
                  className="text-xs text-fg-muted transition-colors duration-fast hover:text-fg"
                >
                  Dataset &amp; downloads
                </Link>
              </li>
              <li>
                <a
                  href="/api/export/json/"
                  className="text-xs text-fg-muted transition-colors duration-fast hover:text-fg"
                >
                  JSON export
                </a>
              </li>
              <li>
                <a
                  href="/api/export/csv/"
                  className="text-xs text-fg-muted transition-colors duration-fast hover:text-fg"
                >
                  CSV export
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-xs text-fg-muted transition-colors duration-fast hover:text-fg"
                >
                  Contribute / corrections
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 text-2xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© lanthanides.io · Strategic Materials Ledger</p>
          <p className="max-w-xl sm:text-right">
            Open data licensed{' '}
            <a
              href={LICENSE_URL}
              rel="license noopener noreferrer"
              target="_blank"
              className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
            >
              CC BY 4.0
            </a>
            . Prices are sourced, normalized estimates — verify before
            transacting.
          </p>
        </div>
      </Container>
    </footer>
  );
}
