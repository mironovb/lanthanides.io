/**
 * SiteFooter — the site-wide footer (Prompt 14). Mirrors the header IA so the
 * two never drift (both read from `nav.ts`): a brand band carrying the licence,
 * the alerts entry, and the project contact, then the four IA columns
 * (Data · Intelligence · Tools · About), with the open-data export endpoints
 * appended under Data.
 *
 * The open-data + CC BY 4.0 framing is load-bearing: the dataset *is* the
 * product. No fabricated stats (counts live on the pages) and no fabricated
 * Telegram bot link — the alerts entry points at the /alerts subscribe surface.
 *
 * Server component.
 */
import Link from 'next/link';
import { Container } from './Container';
import {
  ALERTS_LINK,
  OPEN_DATA_EXPORTS,
  PRIMARY_NAV,
  type NavItem,
} from './nav';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const MIT_URL = 'https://opensource.org/licenses/MIT';

// TODO(owner): set the real project contact address. `hello@lanthanides.io` is a
// neutral placeholder on the project's own domain (replaces the old .edu address,
// per AUDIT §4.1) — confirm the alias is live before launch.
const CONTACT_EMAIL = 'hello@lanthanides.io';

function SoonTag() {
  return (
    <span className="rounded-sm border border-border px-1 font-mono text-2xs uppercase tracking-caps text-fg-dim">
      soon
    </span>
  );
}

const LINK_CLASS =
  'inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors duration-fast hover:text-fg';

function FooterLink({ item }: { item: NavItem }) {
  const content = (
    <>
      {item.label}
      {item.soon ? <SoonTag /> : null}
      {item.external ? (
        <span aria-hidden="true" className="text-fg-dim">
          ↗
        </span>
      ) : null}
    </>
  );
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {content}
      </a>
    );
  }
  if (item.raw) {
    return (
      <a href={item.href} className={LINK_CLASS}>
        {content}
      </a>
    );
  }
  return (
    <Link href={item.href} className={LINK_CLASS}>
      {content}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-strong">
      <Container className="py-10">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* ── Brand band: blurb, licence, alerts, contact ──────────────── */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 bg-accent"
                aria-hidden="true"
              />
              <p className="font-mono text-sm font-semibold text-fg">
                lanthanides.io
              </p>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-fg-dim">
              An open ledger of sourced pricing, supply-chain risk, and Chinese
              export-control intelligence for rare-earth and strategic materials.
            </p>

            {/* Alerts entry (Telegram live + email waitlist; no fabricated bot link). */}
            <Link
              href={ALERTS_LINK.href}
              className="mt-4 inline-flex items-center gap-2 border border-border-strong px-2.5 py-1.5 text-xs font-medium text-fg transition-colors duration-fast hover:border-accent hover:text-accent-strong"
            >
              <span aria-hidden="true">◷</span>
              Get alerts — Telegram &amp; email
            </Link>

            <p className="mt-4 text-2xs leading-relaxed text-fg-dim">
              Data licensed{' '}
              <a
                href={LICENSE_URL}
                rel="license noopener noreferrer"
                target="_blank"
                className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
              >
                CC BY 4.0
              </a>{' '}
              · code{' '}
              <a
                href={MIT_URL}
                rel="noopener noreferrer"
                target="_blank"
                className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
              >
                MIT
              </a>
            </p>

            {/* Open-data prominence: a direct route to the download hub. */}
            <p className="mt-2">
              <Link
                href="/data/"
                className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors duration-fast hover:text-fg"
              >
                Browse &amp; download the open dataset
                <span aria-hidden="true">→</span>
              </Link>
            </p>
          </div>

          {/* ── IA columns (mirror the header groups) ────────────────────── */}
          {PRIMARY_NAV.map((group) => {
            const items =
              group.heading === 'Data'
                ? [...group.items, ...OPEN_DATA_EXPORTS]
                : group.items;
            return (
              <nav key={group.heading} aria-label={group.heading}>
                <p className="eyebrow">{group.heading}</p>
                <ul className="mt-3 space-y-2">
                  {items.map((item) => (
                    <li key={item.href}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-2xs text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© lanthanides.io · Strategic Materials Ledger</p>
          <p className="max-w-2xl sm:text-right">
            Corrections &amp; data:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-fg-muted underline decoration-dotted underline-offset-2 hover:text-fg"
            >
              {CONTACT_EMAIL}
            </a>
            . Prices are sourced, normalized estimates — verify before
            transacting.
          </p>
        </div>
      </Container>
    </footer>
  );
}
