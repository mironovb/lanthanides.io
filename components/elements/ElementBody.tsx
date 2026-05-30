/**
 * Renders an element's editorial markdown body (HTML-rich, from `_elements/*.md`)
 * and resolves the embedded Jekyll include
 * `{% include provenance-table.html symbol=… %}` by splicing the live
 * <ProvenanceTable> in at that point — the Next equivalent of Jekyll expanding
 * the include before markdown rendering.
 *
 * Server Component: react-markdown (+ remark-gfm for tables, rehype-raw to keep
 * the authored HTML and its class names) runs at build time, so only the spliced
 * <ProvenanceTable> islands hydrate. Body styling lives in element-body.css,
 * imported by the page.
 */
import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import type { PriceRecord } from '@/lib/types';
import { ProvenanceTable } from './ProvenanceTable';

/** Matches the provenance-table include in any whitespace form (all occurrences). */
const PROVENANCE_INCLUDE = /\{%\s*include\s+provenance-table\.html[^%]*%\}/;

export function ElementBody({
  body,
  records,
}: {
  body: string;
  records: PriceRecord[];
}) {
  // String.split on a regex splits on every match, so an element with more than
  // one include (none today, but cheap to support) still resolves each.
  const segments = body.split(PROVENANCE_INCLUDE);

  return (
    <div className="element-body">
      {segments.map((segment, i) => (
        <Fragment key={i}>
          {segment.trim() && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {segment}
            </ReactMarkdown>
          )}
          {i < segments.length - 1 && (
            <div className="my-4">
              <ProvenanceTable records={records} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
