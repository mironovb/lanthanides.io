/**
 * /news: news index (SSG). Feature cards from the `_articles` collection. The
 * dated developments timeline was removed in the 2026-07 simplification: it
 * duplicated the /regulatory tracker entry for entry.
 */
import type { Metadata } from 'next';
import { getAllArticles } from '@/lib/content';
import { Container, PageHeader } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { ArticleCard } from '@/components/news/ArticleCard';
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
  const [leadArticle, ...otherArticles] = articles;

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'News', path: '/news/' }]} />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
        eyebrow="Editorial"
        title="News & Analysis"
        lead="Source-linked explainers, market research, and supply chain analysis for rare earth and strategic metals."
        actions={
          <span className="font-mono text-xs text-fg-dim">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </span>
        }
      />

      {leadArticle && (
        <section className="mt-10" aria-labelledby="lead-explainer">
          <SectionHeading id="lead-explainer" title="Latest Explainer" />
          <ArticleCard article={leadArticle} featured />
        </section>
      )}

      {otherArticles.length > 0 && (
        <section className="mt-12" aria-labelledby="analysis-library">
          <SectionHeading
            id="analysis-library"
            title="Analysis Library"
            count={`${otherArticles.length} pieces`}
            description="Long-form briefings, methodology notes, and market surveys."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

    </Container>
  );
}
