/**
 * Markdown-body loader for the in-place Jekyll content collections
 * (`_elements/*.md` now; `_articles/*.md` joins in the news prompt — see
 * docs/ARCHITECTURE.md §1, "keep in place").
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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ELEMENTS_DIR = join(process.cwd(), '_elements');

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
 * e.g. 'Dy'). Returns `null` when no `_elements/<symbol>.md` exists — the detail
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
