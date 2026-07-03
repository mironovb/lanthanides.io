/**
 * Navigation model. The single source of truth for the header and footer links,
 * so the two never drift. A flat list, not an information-architecture tree,
 * matching the old static site's plain link row.
 *
 * 2026-07 simplification: the header carries the five core sections plus
 * About; everything else (Methodology, Framework, Price Gauge, the open-data
 * exports) lives in the single footer row. Contribute is deliberately NOT a
 * nav link: it is the always-visible "Add a price" button in SiteHeader,
 * present on every page including mobile, because contributions are the point
 * of the site.
 */
export interface NavItem {
  href: string;
  label: string;
  /** Off-site link (e.g. GitHub): rendered as a new-tab <a rel="noopener">. */
  external?: boolean;
  /** Same-origin non-page resource (an export endpoint): rendered as a plain <a>. */
  raw?: boolean;
}

/** The header: Prices first (the core), then the other sections. */
export const NAV_LINKS: NavItem[] = [
  { href: '/elements/', label: 'Prices' },
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/regulatory/', label: 'Regulatory' },
  { href: '/news/', label: 'News' },
  { href: '/data/', label: 'Open Data' },
  { href: '/about/', label: 'About' },
];

/** The site-wide contribute CTA, rendered by SiteHeader on every page. */
export const CONTRIBUTE_CTA: NavItem = {
  href: '/contribute/',
  label: 'Add a price',
};

/**
 * The single footer row: the header set plus the reference and tool pages that
 * stay out of the header (Methodology, Framework, Price Gauge, Contribute).
 */
export const FOOTER_LINKS: NavItem[] = [
  { href: '/elements/', label: 'Prices' },
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/regulatory/', label: 'Regulatory' },
  { href: '/news/', label: 'News' },
  { href: '/data/', label: 'Open Data' },
  { href: '/methodology/', label: 'Methodology' },
  { href: '/framework/', label: 'Framework' },
  { href: '/tools/price-gauge/', label: 'Price Gauge' },
  { href: '/about/', label: 'About' },
  { href: '/contribute/', label: 'Contribute' },
];

/** Open-data export endpoints, appended to the footer row. Real handlers. */
export const OPEN_DATA_EXPORTS: NavItem[] = [
  { href: '/api/export/json/', label: 'JSON', raw: true },
  { href: '/api/export/csv/', label: 'CSV', raw: true },
];
