/**
 * Navigation model — the single source of truth for the header and footer, so
 * the two never drift (Prompt 14). The link set is organised into the product's
 * information architecture, which expresses the narrative arc:
 *
 *   Data ─────────► the open reference (what the materials cost, who controls them)
 *   Intelligence ─► the decision layer (export controls, movements, analysis)
 *   Tools ────────► the thin commercial layer (gauge a quote, list, screened offers)
 *   Alerts ───────► get told the moment something moves
 *   About ────────► what this is, how it's built, how to contribute
 *
 * Routes that are not yet built (the Tools layer and Alerts — they land in later
 * prompts) are flagged `soon`: they still appear in the IA and link to a
 * clearly-labelled "coming in this build" placeholder, never a dead end.
 */
export interface NavItem {
  href: string;
  label: string;
  /** One-line descriptor — the connective tissue shown in menus and the footer. */
  description?: string;
  /** Off-site link (e.g. GitHub): rendered as a new-tab <a rel="noopener">. */
  external?: boolean;
  /** Same-origin non-page resource (export endpoint): rendered as a plain <a>. */
  raw?: boolean;
  /** Route not yet ported — links to a labelled placeholder and shows a "Soon" tag. */
  soon?: boolean;
}

export interface NavGroup {
  /** Group label — the header menu trigger and the footer column heading. */
  heading: string;
  items: NavItem[];
}

const GITHUB = 'https://github.com/mironovb/lanthanides.io';

/**
 * Primary header IA — four grouped menus. Each top-level group is a story beat;
 * the standalone Alerts link (a single surface) sits between Tools and About.
 */
export const PRIMARY_NAV: NavGroup[] = [
  {
    heading: 'Data',
    items: [
      {
        href: '/elements',
        label: 'Elements',
        description: 'Directory + price ledger, all 31',
      },
      {
        href: '/dashboard',
        label: 'Market Dashboard',
        description: 'Premiums, controls & coverage at a glance',
      },
      {
        href: '/data',
        label: 'Open Data',
        description: 'Download the full dataset · CC BY 4.0',
      },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      {
        href: '/regulatory',
        label: 'Regulatory Tracker',
        description: 'China export-control announcements',
      },
      {
        href: '/movements',
        label: 'Market Movements',
        description: 'Auto-detected price & control changes',
      },
      {
        href: '/news',
        label: 'News & Analysis',
        description: 'Long-form research + developments',
      },
    ],
  },
  {
    heading: 'Tools',
    items: [
      {
        href: '/tools/price-gauge',
        label: 'Price Gauge',
        description: 'Estimate a fair price range for a buy or sell',
      },
      {
        href: '/sell',
        label: 'Sell / List',
        description: 'List material + instant price gauge',
      },
      {
        href: '/offers',
        label: 'Offer Feed',
        description: 'Offers ranked by value vs. the references',
      },
    ],
  },
  {
    heading: 'About',
    items: [
      {
        href: '/about',
        label: 'About / Vision',
        description: 'What this is and why it exists',
      },
      {
        href: '/methodology',
        label: 'Methodology',
        description: 'How prices are collected & verified',
      },
      {
        href: '/sources',
        label: 'Sources & Trust Tiers',
        description: 'The curated source registry',
      },
      {
        href: '/contribute',
        label: 'Contribute Data',
        description: 'Two human checkpoints — how data gets in',
      },
      {
        href: GITHUB,
        label: 'GitHub Repository',
        description: 'Source code, issues & data files',
        external: true,
      },
    ],
  },
];

/**
 * The alerts layer is a single surface, so it's a standalone top-level link
 * rather than a menu. Telegram fires today via the regulatory monitor; the
 * subscribe form (Telegram + email) lands in a later prompt.
 */
export const ALERTS_LINK: NavItem = {
  href: '/alerts',
  label: 'Alerts',
  description: 'Telegram & email when something moves',
  soon: true,
};

/** Open-data export endpoints — footer-only, appended under the Data column. */
export const OPEN_DATA_EXPORTS: NavItem[] = [
  { href: '/api/export/json/', label: 'JSON export', raw: true },
  { href: '/api/export/csv/', label: 'CSV export', raw: true },
];
