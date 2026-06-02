/**
 * Markdown-body loader for the in-place Jekyll content collections
 * (`_elements/*.md` and `_articles/*.md`; see docs/ARCHITECTURE.md §1,
 * "keep in place").
 *
 * The element/article markdown carries Jekyll-era YAML front matter plus an
 * HTML-rich body (tables, `<div>` blocks, `&thinsp;` entities, and embedded
 * Liquid `{% include %}` tags). This module splits the two with `gray-matter`;
 * the body is returned VERBATIM so the page renderer can resolve the includes
 * and hand the HTML to react-markdown.
 *
 * Read-only and server-only (uses `fs`): import from Server Components / route
 * handlers, never from a Client Component. Each file is parsed at most once per
 * process.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ELEMENTS_DIR = join(process.cwd(), '_elements');
const ARTICLES_DIR = join(process.cwd(), '_articles');

/** Front matter authored on every `_elements/<Symbol>.md` (verbatim keys). */
export interface ElementFrontMatter {
  symbol: string;
  name: string;
  atomic_number: number;
  category: string;
  title?: string;
  description?: string;
  keywords?: string;
  element_name?: string;
  element_symbol?: string;
  permalink?: string;
}

export interface ElementContent {
  frontMatter: ElementFrontMatter;
  /** HTML-rich markdown body; Liquid `{% include %}` tags left intact for the page renderer. */
  body: string;
}

const elementCache = new Map<string, ElementContent | null>();

/**
 * Load the editorial body + front matter for an element symbol (case-sensitive,
 * e.g. 'Dy'). Returns `null` when no `_elements/<symbol>.md` exists; the detail
 * page then falls back to the auto-rendered offers table (legacy
 * `element-detail.html` behaviour). Symbol is validated to keep the filename a
 * plain element symbol (defence-in-depth against path traversal, though callers
 * pass catalog symbols).
 */
export function getElementContent(symbol: string): ElementContent | null {
  if (elementCache.has(symbol)) return elementCache.get(symbol) ?? null;

  let result: ElementContent | null = null;
  if (/^[A-Za-z]{1,3}$/.test(symbol)) {
    try {
      const raw = readFileSync(join(ELEMENTS_DIR, `${symbol}.md`), 'utf8');
      const { data, content } = matter(raw);
      result = { frontMatter: data as ElementFrontMatter, body: content };
    } catch {
      result = null; // missing file → caller renders the fallback table
    }
  }

  elementCache.set(symbol, result);
  return result;
}

// ── Articles (_articles/*.md) ────────────────────────────────────────────────

/**
 * Front matter authored on every `_articles/<slug>.md` (verbatim keys). Mirrors
 * the fields the legacy `_layouts/article.html` and `pages/news.html` consume.
 * `date` is normalised to an ISO `YYYY-MM-DD` string in the loader (gray-matter
 * parses an unquoted YAML date into a JS `Date`).
 */
export interface ArticleFrontMatter {
  title: string;
  subtitle?: string;
  description?: string;
  keywords?: string;
  date: string; // 'YYYY-MM-DD' (normalised)
  status?: string; // 'active' | 'suspended' | ...
  elements?: string[]; // related element symbols
  image?: string; // hero image filename under /assets/images/
  image_thumb?: string; // card thumbnail filename
  image_alt?: string;
}

export interface ArticleContent {
  slug: string;
  frontMatter: ArticleFrontMatter;
  /** Markdown body (GFM + occasional inline HTML); rendered by the page. */
  body: string;
}

/** Normalise a front-matter date (string or gray-matter `Date`) to 'YYYY-MM-DD'. */
function toISODate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

let slugCache: string[] | undefined;

/** All article slugs (filenames without `.md`), discovered from `_articles/`. */
export function getArticleSlugs(): string[] {
  if (slugCache) return slugCache;
  let files: string[];
  try {
    files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));
  } catch (err) {
    throw new Error(
      `[lib/content] could not list _articles: ${(err as Error).message}`,
    );
  }
  slugCache = files.map((f) => f.replace(/\.md$/, '')).sort();
  return slugCache;
}

const articleCache = new Map<string, ArticleContent | null>();

/**
 * Load an article's front matter + body by slug. Returns `null` when no
 * `_articles/<slug>.md` exists (the `/news/[slug]` page then 404s). Slug is
 * validated to a plain article slug (defence-in-depth against path traversal).
 */
export function getArticleContent(slug: string): ArticleContent | null {
  if (articleCache.has(slug)) return articleCache.get(slug) ?? null;

  let result: ArticleContent | null = null;
  if (/^[A-Za-z0-9-]+$/.test(slug)) {
    try {
      const raw = readFileSync(join(ARTICLES_DIR, `${slug}.md`), 'utf8');
      const { data, content } = matter(raw);
      result = {
        slug,
        frontMatter: { ...(data as ArticleFrontMatter), date: toISODate(data.date) },
        body: content,
      };
    } catch {
      result = null;
    }
  }

  articleCache.set(slug, result);
  return result;
}

/** Every article, newest first by `date`; the source for the `/news` index. */
export function getAllArticles(): ArticleContent[] {
  return getArticleSlugs()
    .map((slug) => getArticleContent(slug))
    .filter((a): a is ArticleContent => a !== null)
    .sort((a, b) => b.frontMatter.date.localeCompare(a.frontMatter.date));
}
