/**
 * Navigation model — the single source of truth for the header and footer link
 * sets, so the two never drift. Only routes that exist today are listed (the
 * commercial stubs /sell, /offers, /alerts, /tools land in a later prompt and
 * are added here when they do). The /framework page is not yet ported, so it is
 * deliberately absent.
 */
export interface NavItem {
  href: string;
  label: string;
}

/** Primary header nav — the high-traffic reference + intelligence surfaces. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/elements', label: 'Elements' },
  { href: '/regulatory', label: 'Regulatory' },
  { href: '/movements', label: 'Movements' },
  { href: '/news', label: 'News' },
  { href: '/data', label: 'Data' },
];

/** Footer link groups. */
export const FOOTER_NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Reference',
    items: [
      { href: '/elements', label: 'Element directory' },
      { href: '/regulatory', label: 'Regulatory tracker' },
      { href: '/movements', label: 'Market movements' },
    ],
  },
  {
    heading: 'Editorial',
    items: [
      { href: '/news', label: 'News & analysis' },
      { href: '/methodology', label: 'Methodology' },
      { href: '/sources', label: 'Sources & trust tiers' },
      { href: '/about', label: 'About' },
    ],
  },
];
