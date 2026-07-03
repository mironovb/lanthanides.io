/**
 * Navigation model. The single source of truth for the header and footer links,
 * so the two never drift. The old static site (git 56e980f, _includes/nav.html
 * and footer.html) used a flat row of plain links, not grouped dropdown menus,
 * so this is a flat list, not an information-architecture tree.
 */
export interface NavItem {
  href: string;
  label: string;
  /** Off-site link (e.g. GitHub): rendered as a new-tab <a rel="noopener">. */
  external?: boolean;
  /** Same-origin non-page resource (an export endpoint): rendered as a plain <a>. */
  raw?: boolean;
}

/**
 * The header: a flat row of plain links, in the old site's order. "Prices" is
 * the label the static site used for what now lives at /elements/. Contribute
 * points at the on-site pipeline page (/contribute/), the entry point for the
 * community price records this ledger is assembled from.
 */
export const NAV_LINKS: NavItem[] = [
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/elements/', label: 'Prices' },
  { href: '/regulatory/', label: 'Regulatory' },
  { href: '/movements/', label: 'Movements' },
  { href: '/news/', label: 'News' },
  { href: '/data/', label: 'Data' },
  { href: '/methodology/', label: 'Methodology' },
  { href: '/about/', label: 'About' },
  { href: '/contribute/', label: 'Contribute' },
];

/**
 * The footer link row: the same set as the header but with Dashboard dropped
 * and Sources added.
 */
export const FOOTER_LINKS: NavItem[] = [
  { href: '/elements/', label: 'Prices' },
  { href: '/regulatory/', label: 'Regulatory' },
  { href: '/movements/', label: 'Movements' },
  { href: '/news/', label: 'News' },
  { href: '/data/', label: 'Data' },
  { href: '/methodology/', label: 'Methodology' },
  { href: '/about/', label: 'About' },
  { href: '/sources/', label: 'Sources' },
  { href: '/contribute/', label: 'Contribute' },
];

/** The price gauge lives in a low-key secondary footer row, out of the top nav. */
export const FOOTER_TOOLS: NavItem[] = [
  { href: '/tools/price-gauge/', label: 'Price Gauge' },
];

/** Open-data export endpoints, shown as small links in the footer. Real handlers. */
export const OPEN_DATA_EXPORTS: NavItem[] = [
  { href: '/api/export/json/', label: 'JSON', raw: true },
  { href: '/api/export/csv/', label: 'CSV', raw: true },
];
