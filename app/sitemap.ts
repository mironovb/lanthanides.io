/**
 * /sitemap.xml (Prompt 24): replaces jekyll-sitemap. Covers every indexable
 * page: the static reference/commercial routes, all 31 case-sensitive element
 * pages, and all 5 news articles. URLs are absolute (via metadataBase/SITE_URL)
 * and carry the trailing slash that matches the canonical contract. Machine
 * endpoints (/feed.xml, /movements.xml, /api/*) and the sitemap itself are
 * intentionally excluded.
 *
 * lastModified uses the dataset's generated-at stamp for data-backed pages and
 * the article date for each article, both real values, never fabricated.
 */
import type { MetadataRoute } from 'next';
import { getDataGeneratedAt, getElements } from '@/lib/data';
import { getAllArticles } from '@/lib/content';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency'];

// [path, priority, changeFrequency], ordered roughly by importance.
const STATIC_PAGES: Array<[string, number, ChangeFreq]> = [
  ['/', 1.0, 'daily'],
  ['/elements/', 0.9, 'daily'],
  ['/regulatory/', 0.9, 'daily'],
  ['/movements/', 0.8, 'daily'],
  ['/dashboard/', 0.8, 'daily'],
  ['/data/', 0.8, 'weekly'],
  ['/framework/', 0.7, 'weekly'],
  ['/news/', 0.7, 'weekly'],
  // The discussion board landing: a stable, crawlable URL in the header/footer
  // nav. Only the board index is listed; individual /discussion/[id] threads are
  // dynamic, unbounded, and DB-backed, so they stay out of the static sitemap.
  ['/discussion/', 0.6, 'daily'],
  ['/offers/', 0.6, 'weekly'],
  ['/methodology/', 0.6, 'monthly'],
  ['/sources/', 0.6, 'monthly'],
  ['/about/', 0.6, 'monthly'],
  ['/tools/price-gauge/', 0.6, 'monthly'],
  ['/contribute/', 0.5, 'monthly'],
  ['/sell/', 0.5, 'monthly'],
  ['/alerts/', 0.5, 'monthly'],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const dataUpdated = getDataGeneratedAt();
  const url = (path: string) => `${SITE_URL}${path}`;

  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map(
    ([path, priority, changeFrequency]) => ({
      url: url(path),
      lastModified: dataUpdated,
      changeFrequency,
      priority,
    }),
  );

  const elements: MetadataRoute.Sitemap = getElements().map((e) => ({
    url: url(`/elements/${e.symbol}/`),
    lastModified: dataUpdated,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const articles: MetadataRoute.Sitemap = getAllArticles().map((a) => ({
    url: url(`/news/${a.slug}/`),
    lastModified: a.frontMatter.date ?? dataUpdated,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...pages, ...elements, ...articles];
}
