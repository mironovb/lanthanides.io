/**
 * /news: News & Analysis index (SSG). Combines two sources:
 *   • the `_articles` collection, shown as featured long-form analysis tiles, and
 *   • `_data/news.yml`, the full "Regulatory & Trade Developments" timeline,
 *     whose article-backed entries link through to the full pieces.
 *
 * The article grid matches the old news page, and adds the regulatory
 * developments feed that previously had no standalone home.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getNews } from '@/lib/data';
import { getAllArticles } from '@/lib/content';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { ArticleCard } from '@/components/news/ArticleCard';
import { DevelopmentTimeline } from '@/components/news/DevelopmentTimeline';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Rare Earth News & Analysis',
  description:
    'Export controls, market research, and supply chain analysis for rare earth and strategic metals.',
  path: '/news/',
});

export default function NewsIndexPage() {
  const articles = getAllArticles();
  const developments = [...getNews()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'News', path: '/news/' }]} />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
        eyebrow="Editorial"
        title="News & Analysis"
        lead="Export controls, market research, and supply chain intelligence for rare earth and strategic metals."
        actions={
          <span className="font-mono text-xs text-fg-dim">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </span>
        }
      >
        <StoryLink>
          For the structured, filterable record behind these developments, see
          the <Link href="/regulatory/">Regulatory Tracker</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── Feature cards (the _articles collection, newest first) ───────── */}
      {articles.length > 0 && (
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* ── Regulatory & trade developments (news.yml) ───────────────────── */}
      <section className="mt-12">
        <SectionHeading
          title="Regulatory & Trade Developments"
          count={`${developments.length} entries`}
          description="A dated record of China export-control announcements and related trade measures since 2023, newest first."
        />
        <DevelopmentTimeline items={developments} />
      </section>
    </Container>
  );
}
