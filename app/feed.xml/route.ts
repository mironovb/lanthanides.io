/**
 * /feed.xml: the News & Analysis Atom feed (Prompt 24).
 *
 * Replaces jekyll-feed. The legacy plugin fed from `site.posts`, but this repo
 * has no `_posts` (the news content lives in the `_articles` collection), so
 * the legacy feed shipped empty. This handler populates the same `/feed.xml`
 * URL from the five articles (newest first), so feed discovery (advertised via
 * `<link rel="alternate">` on every page) resolves to real content. Mirrors the
 * shape and conventions of the companion /movements.xml feed.
 *
 * The URL is preserved exactly (`/feed.xml`, no trailing slash, a machine
 * endpoint). `force-static` emits it as a build-time file.
 */
import { getAllArticles } from '@/lib/content';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

const AUTHOR = 'Bogdan Mironov';
// Host for the tag: URI scheme, scheme + slashes stripped (matches movements.xml).
const HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\//g, '');

/** Escape the five XML metacharacters. */
function xmlEscape(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function GET(): Response {
  const articles = getAllArticles();
  const updated = articles[0]?.frontMatter.date
    ? `${articles[0].frontMatter.date}T00:00:00Z`
    : '1970-01-01T00:00:00Z';

  const entries = articles
    .map((a) => {
      const fm = a.frontMatter;
      const url = `${SITE_URL}/news/${a.slug}/`;
      const dt = `${fm.date}T00:00:00Z`;
      const summary = fm.subtitle || fm.description || '';
      const lines = [
        '  <entry>',
        `    <title>${xmlEscape(fm.title)}</title>`,
        `    <link href="${url}" rel="alternate" type="text/html"/>`,
        `    <id>tag:${HOST},${fm.date}:/news/${a.slug}/</id>`,
        `    <published>${dt}</published>`,
        `    <updated>${dt}</updated>`,
        `    <author><name>${xmlEscape(AUTHOR)}</name></author>`,
        ...(fm.elements ?? []).map(
          (s) => `    <category term="element-${xmlEscape(s)}"/>`,
        ),
        summary ? `    <summary type="text">${xmlEscape(summary)}</summary>` : '',
        '  </entry>',
      ];
      return lines.filter(Boolean).join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <title>${xmlEscape(SITE_NAME)} · News &amp; Analysis</title>
  <subtitle>Long-form research and developments on rare earth and strategic-metal markets and Chinese export controls.</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE_URL}/news/" rel="alternate" type="text/html"/>
  <id>${SITE_URL}/feed.xml</id>
  <updated>${updated}</updated>
  <author>
    <name>${xmlEscape(AUTHOR)}</name>
    <uri>${SITE_URL}/</uri>
  </author>
  <rights>CC BY 4.0: https://creativecommons.org/licenses/by/4.0/</rights>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
