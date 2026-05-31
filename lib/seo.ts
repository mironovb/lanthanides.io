/**
 * Centralised SEO metadata helper (Prompt 24).
 *
 * Ports the legacy `_includes/head.html` meta contract — title template,
 * default description/keywords, canonical, Open Graph, Twitter card, and the
 * Atom feed discovery links — into one typed builder so every route ships
 * complete, consistent metadata via the Next Metadata API. Page files call
 * `buildMetadata({ title, description, keywords, path, … })` instead of
 * hand-assembling an `openGraph`/`twitter` block each time.
 *
 * The matching JSON-LD lives in `components/seo/*`; the two share `SITE_URL`.
 */
import type { Metadata } from 'next';

/** Canonical origin (matches `CNAME` → www.lanthanides.io; metadataBase too). */
export const SITE_URL = 'https://www.lanthanides.io';

/** Brand name used for og:site_name and the Organization/WebSite JSON-LD. */
export const SITE_NAME = 'lanthanides.io — Strategic Materials Ledger';

/** Default/home title (legacy head.html fallback `<title>`). */
export const SITE_TAGLINE_TITLE =
  'lanthanides.io — Rare Earth Prices, Export Controls & Strategic Materials Intelligence';

/** Brand suffix + separator for the `%s · lanthanides.io` title template. */
export const TITLE_SUFFIX = 'lanthanides.io';
export const TITLE_SEPARATOR = ' · ';

export const DEFAULT_DESCRIPTION =
  'Sourced pricing, supply-chain risk, and regulatory intelligence for rare-earth and strategic materials.';

/** Legacy head.html default keywords (used when a page declares none). */
export const DEFAULT_KEYWORDS =
  'rare earth prices, rare earth elements, lanthanide prices, strategic materials, export controls, China rare earth, critical minerals pricing';

export const DEFAULT_OG_IMAGE = '/assets/images/og-default.png';

/** The two site Atom feeds, surfaced as `<link rel="alternate">` on every page. */
const FEED_ALTERNATES = {
  'application/atom+xml': [
    { url: '/feed.xml', title: `${SITE_NAME} — News` },
    { url: '/movements.xml', title: `${SITE_NAME} — Market Movements` },
  ],
};

export interface PageMetadataInput {
  /** Page title; runs through the `%s · lanthanides.io` template. */
  title?: string;
  /** Full title that bypasses the branding template (the home page only). */
  absoluteTitle?: string;
  description?: string;
  keywords?: string | string[];
  /** Canonical path, e.g. `/elements/` — also becomes og:url. Keep the slash. */
  path: string;
  ogType?: 'website' | 'article';
  /** OG/Twitter image path (defaults to the site card). */
  image?: string;
  imageAlt?: string;
  /** og:article publication / modification times (ISO). */
  publishedTime?: string;
  modifiedTime?: string;
  /** Emit `robots: noindex,nofollow` (placeholders / private surfaces). */
  noindex?: boolean;
}

/**
 * Build a complete `Metadata` object: canonical + feed alternates + Open Graph
 * + Twitter, with og/twitter title and description mirroring the rendered
 * `<title>` and meta description so social cards match the tab.
 */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const {
    title,
    absoluteTitle,
    description = DEFAULT_DESCRIPTION,
    keywords = DEFAULT_KEYWORDS,
    path,
    ogType = 'website',
    image = DEFAULT_OG_IMAGE,
    imageAlt = SITE_NAME,
    publishedTime,
    modifiedTime,
    noindex,
  } = input;

  // The branded string the <title> tag resolves to — reused verbatim for the
  // og:title / twitter:title so the card headline matches the browser tab.
  const brandedTitle = absoluteTitle
    ? absoluteTitle
    : title
      ? `${title}${TITLE_SEPARATOR}${TITLE_SUFFIX}`
      : SITE_TAGLINE_TITLE;

  // Common OG fields; `type` must be a literal at assignment so the OpenGraph
  // discriminated union narrows (a union-typed `type` variable won't).
  const baseOg = {
    url: path,
    siteName: SITE_NAME,
    title: brandedTitle,
    description,
    locale: 'en_US',
    images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
  };
  const openGraph: Metadata['openGraph'] =
    ogType === 'article'
      ? { ...baseOg, type: 'article', publishedTime, modifiedTime }
      : { ...baseOg, type: 'website' };

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    keywords,
    alternates: { canonical: path, types: FEED_ALTERNATES },
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
      images: [image],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
