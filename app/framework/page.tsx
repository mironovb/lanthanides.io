/**
 * /framework — REE Import/Export Operational Framework (SSG, Prompt 24).
 *
 * The operational companion to the crown-jewel regulatory tracker (AUDIT §5/§6:
 * "preserve verbatim and keep the /framework/ URL"). Ported on the /methodology
 * pattern: the ~440-line prose is relocated to app/framework/framework.md so the
 * Next build never reads legacy/ (hard rule #4), the Jekyll Liquid is resolved
 * (relative_url filters → bare paths; the breadcrumb/disclaimer includes become
 * the BreadcrumbList JSON-LD + a Callout here), and the in-page anchors are
 * preserved — `#pricing` via a raw <a id> (rehype-raw) and
 * `#us-side-tariff-stack-may-14-2026` via the heading-id slugger in <Markdown>.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import matter from 'gray-matter';
import Link from 'next/link';

import '@/components/content/content-body.css';

import { buildMetadata } from '@/lib/seo';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout } from '@/components/ui';
import { Markdown } from '@/components/content/Markdown';
import { BreadcrumbJsonLd } from '@/components/seo';

const source = matter(
  readFileSync(join(process.cwd(), 'app/framework/framework.md'), 'utf8'),
);
const FRONT_MATTER = source.data as {
  title?: string;
  description?: string;
  keywords?: string;
};
const BODY = source.content;

export const metadata: Metadata = buildMetadata({
  title: FRONT_MATTER.title ?? 'Framework',
  description: FRONT_MATTER.description,
  keywords: FRONT_MATTER.keywords,
  path: '/framework/',
});

export default function FrameworkPage() {
  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Framework', path: '/framework/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Framework' }]}
        eyebrow="Operational Reference"
        title="Import / Export Operational Framework"
        lead="How to classify a rare-earth product into a regulatory tier, what tariff stack applies, what a realistic landed cost looks like, and which procurement channel fits which buyer."
      >
        <StoryLink>
          The operational companion to the{' '}
          <Link href="/regulatory/">regulatory tracker</Link> and{' '}
          <Link href="/methodology/">pricing methodology</Link>.
        </StoryLink>
      </PageHeader>

      <div className="content-body mt-10">
        <Markdown>{BODY}</Markdown>
      </div>

      <div className="mt-10 max-w-prose">
        <Callout tone="note" title="Disclaimer">
          All prices shown require source provenance. No data is fabricated or
          interpolated. Prices are normalized to USD/kg for comparability;
          original quoted units are preserved in provenance records. Retail and
          bulk tiers are never merged. Different forms and purities are tracked
          separately. <Link href="/methodology/">Full methodology →</Link>
        </Callout>
      </div>
    </Container>
  );
}
