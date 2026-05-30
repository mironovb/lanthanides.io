/** @type {import('next').NextConfig} */
const nextConfig = {
  // Preserve Jekyll's pretty-permalink contract: every page URL keeps its
  // trailing slash. See docs/MIGRATION.md §3 (the hard URL contract).
  trailingSlash: true,

  // Redirects (notably /prices/ → 301 → /elements/, MIGRATION §3.5) and any
  // rewrites are added alongside the routes they target in later prompts, once
  // those destination routes actually exist.
};

export default nextConfig;
