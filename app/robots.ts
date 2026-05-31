/**
 * /robots.txt (Prompt 24) — replaces the Liquid-templated robots.txt. Ports its
 * intent (Allow: / + sitemap pointer) and additionally keeps the JSON/CSV API
 * endpoints out of the search index (they're data downloads, not pages — still
 * fully fetchable by tools; robots only governs crawler indexing). `host` and
 * the sitemap URL are absolute against the canonical origin.
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
