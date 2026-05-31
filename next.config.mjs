/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve Jekyll's pretty-permalink contract: every page URL keeps its
  // trailing slash. See docs/MIGRATION.md §3 (the hard URL contract).
  trailingSlash: true,

  async redirects() {
    return [
      // MIGRATION §3.5 — the one page URL that changes. The legacy interactive
      // "Ledger" (/prices/) is merged into the canonical /elements/ directory.
      // statusCode: 301 (not `permanent: true`, which emits 308) to honour the
      // documented 301 contract verbatim.
      {
        source: '/prices',
        destination: '/elements/',
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
    ];
  },
};

export default nextConfig;
