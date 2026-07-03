/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve Jekyll's pretty-permalink contract: every page URL keeps its
  // trailing slash. See docs/MIGRATION.md §3 (the hard URL contract).
  trailingSlash: true,

  async redirects() {
    return [
      // The legacy /prices/ ledger lives on the landing page now (the home
      // page IS the price directory since the 2026-07 consolidation).
      // statusCode: 301 (not `permanent: true`, which emits 308) to honour the
      // documented 301 contract verbatim.
      {
        source: '/prices',
        destination: '/',
        statusCode: 301,
      },
      // The About page doubles as the investor-facing About/Vision page
      // (Prompt 15). `/vision` is an alias investors may type directly; it 301s
      // to the canonical `/about/` (which declares `canonical: /about/`), so the
      // vision lives at one URL with no duplicate-content split. `trailingSlash`
      // normalises `/vision` → `/vision/` first, which then 301s here.
      {
        source: '/vision',
        destination: '/about/',
        statusCode: 301,
      },
      // The legacy Jekyll-generated per-element export (/assets/data/elements.json)
      // is superseded by the canonical, always-fresh price-records export. Its
      // only consumer was the retired interactive ledger JS. See MIGRATION §3.4.
      {
        source: '/assets/data/elements.json',
        destination: '/api/export/json/',
        statusCode: 301,
      },
      // 2026-07 refocus: the database-backed layer (seller listings, screened
      // offers, the alerts waitlist, the discussion board) was removed; the
      // site is file-based only, and community contributions flow through the
      // reviewed git pipeline instead. These routes were live and indexed, so
      // each 301s to its nearest surviving surface.
      {
        source: '/sell',
        destination: '/contribute/',
        statusCode: 301,
      },
      {
        source: '/offers',
        destination: '/data/',
        statusCode: 301,
      },
      {
        source: '/alerts',
        destination: '/regulatory/',
        statusCode: 301,
      },
      {
        source: '/discussion',
        destination: '/contribute/',
        statusCode: 301,
      },
      {
        source: '/discussion/:id',
        destination: '/contribute/',
        statusCode: 301,
      },
      // 2026-07-03 simplification: the Market Movements feed was scrapped (its
      // detection windows are too thin to be worth a surface). The page 301s
      // home; the Atom feed 301s to the surviving news feed so subscribed
      // readers keep resolving.
      {
        source: '/movements',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/movements.xml',
        destination: '/feed.xml',
        statusCode: 301,
      },
      // 2026-07-03 audit: /sources merged into /methodology (the registry table
      // moved there; the trust-tier table it also carried was a duplicate).
      {
        source: '/sources',
        destination: '/methodology/',
        statusCode: 301,
      },
      // 2026-07-03 consolidation: the landing page IS the price ledger, so the
      // /elements index merged into / (element detail pages keep their URLs;
      // the category anchors moved with the grid, and fragments survive a 301).
      // The dashboard was removed outright; its brief API follows the exports.
      {
        source: '/elements',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/dashboard',
        destination: '/',
        statusCode: 301,
      },
      {
        source: '/api/dashboard/brief',
        destination: '/api/export/json/',
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
