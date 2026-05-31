/**
 * JSON-LD primitives (Prompt 24).
 *
 * <JsonLd> renders one or more schema.org objects in a single
 * `<script type="application/ld+json">`, server-side, with the `<` → `<`
 * escape that stops a `</script>` sequence inside any string value from
 * breaking out of the tag. This is the one rendering path for every structured-
 * data component in this folder (it replaces the per-page inline blocks).
 */
import { SITE_URL } from '@/lib/seo';

export { SITE_URL };

/** Organization node, referenced by @id from WebSite / Article / Dataset. */
export const ORG_ID = `${SITE_URL}/#organization`;

/** Absolute URL for a site-relative path (schema @id / url / item must be absolute). */
export function abs(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data)
    ? data.length === 1
      ? data[0]
      : data
    : data;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
      }}
    />
  );
}
