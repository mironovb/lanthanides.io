/**
 * Shared server-side markdown renderer for the long-form content collections
 * (`/methodology`, `/news/[slug]`). react-markdown runs at build time (remark-gfm
 * for tables/strikethrough, rehype-raw to keep authored inline HTML such as
 * `<sub>`/`<sup>`), so nothing hydrates — the HTML ships complete and crawlable.
 * Body styling lives in content-body.css, imported by the page.
 *
 * Heading anchors are preserved: kramdown-style `## Heading {#explicit-id}`
 * attributes (deep-linked across the site, e.g. /methodology/#display-price) are
 * honoured, and every other heading gets a slug id so in-page links keep working.
 * Done via `components` overrides (not a rehype plugin) to stay free of hast
 * typings.
 */
import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const EXPLICIT_ID = /\s*\{#([\w-]+)\}\s*$/;

/** Flatten React children to their visible text. */
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

/** GitHub-style slug from heading text (after stripping any explicit `{#id}`). */
function slugify(text: string): string {
  return text
    .replace(EXPLICIT_ID, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** Build a heading renderer that assigns a stable id (explicit `{#id}` or slug). */
function makeHeading(Tag: HeadingTag) {
  return function Heading({ children }: { children?: ReactNode }) {
    const text = nodeText(children);
    const explicit = text.match(EXPLICIT_ID);
    const id = explicit ? explicit[1] : slugify(text);
    // Our explicit-id headings are plain-text, so the string branch covers them;
    // strip the `{#id}` token so it never renders as visible text.
    const content =
      explicit && typeof children === 'string'
        ? children.replace(EXPLICIT_ID, '')
        : children;
    return <Tag id={id || undefined}>{content}</Tag>;
  };
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: makeHeading('h1'),
        h2: makeHeading('h2'),
        h3: makeHeading('h3'),
        h4: makeHeading('h4'),
        h5: makeHeading('h5'),
        h6: makeHeading('h6'),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
