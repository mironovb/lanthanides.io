/**
 * /methodology — how prices are collected, normalised, verified, and displayed
 * (SSG, Prompt 8). A primary trust asset: the full methodology prose is ported
 * verbatim from the (relocated) `methodology.md`, and the one dynamic block — the
 * "Data sources breakdown" table — is re-implemented live from
 * `_data/source_breakdown.yml` via <SourceBreakdownTable>, spliced in exactly
 * where the legacy Liquid loop sat.
 *
 * The markdown is co-located (app/methodology/methodology.md) so the Next build
 * never depends on legacy/ (CLAUDE.md hard rule #4 — legacy/ is removed in P25).
 * Deep-link anchors (#display-price, #oxide-to-metal, #provenance-chain,
 * #data-sources-breakdown) are preserved by the heading-id plugin in <Markdown>.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import matter from 'gray-matter';

import '@/components/content/content-body.css';

import Link from 'next/link';
import { getSourceBreakdown } from '@/lib/data';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Markdown } from '@/components/content/Markdown';
import { SourceBreakdownTable } from '@/components/content/SourceBreakdownTable';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';

// The Liquid block (assign → if → for → endif) that rendered the breakdown table.
const BREAKDOWN_BLOCK = /\{%\s*assign\s+breakdown[\s\S]*?\{%\s*endif\s*%\}/;

const source = matter(
  readFileSync(join(process.cwd(), 'app/methodology/methodology.md'), 'utf8'),
);
const FRONT_MATTER = source.data as {
  title?: string;
  description?: string;
  keywords?: string;
};
const BODY = source.content;

export const metadata: Metadata = buildMetadata({
  title: FRONT_MATTER.title ?? 'Methodology',
  description: FRONT_MATTER.description,
  keywords: FRONT_MATTER.keywords,
  path: '/methodology/',
});

export default function MethodologyPage() {
  const breakdown = getSourceBreakdown();
  // Splice the live breakdown table in where the Liquid block was.
  const [before, after] = BODY.split(BREAKDOWN_BLOCK);

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Methodology', path: '/methodology/' }]} />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Methodology' }]}
        eyebrow="Trust & Method"
        title="Methodology"
        lead={FRONT_MATTER.description}
      >
        <StoryLink>
          See the data this governs in the{' '}
          <Link href="/elements/">element directory</Link>, or the registry it
          draws from in <Link href="/sources/">Sources</Link>.
        </StoryLink>
      </PageHeader>

      {/* Two prose blocks with the live breakdown table spliced between them.
          The table is a sibling (not nested in .content-body) so the prose-table
          CSS never double-styles it. */}
      <div className="content-body mt-10">
        <Markdown>{before}</Markdown>
      </div>
      <div className="max-w-prose">
        <SourceBreakdownTable breakdown={breakdown} />
      </div>
      {after && (
        <div className="content-body">
          <Markdown>{after}</Markdown>
        </div>
      )}
    </Container>
  );
}
