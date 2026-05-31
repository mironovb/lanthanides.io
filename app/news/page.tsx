/**
 * /news — News & Analysis index (SSG, Prompt 8). Combines the two sources the
 * task calls for:
 *   • the `_articles` collection → featured long-form analysis tiles, and
 *   • `_data/news.yml` → the full "Regulatory & Trade Developments" timeline,
 *     whose article-backed entries link through to the full pieces.
 *
 * Ports the intent of legacy/pages/news.html (the article grid) and surfaces the
 * regulatory developments feed that previously had no standalone home.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getNews } from '@/lib/data';
import { getAllArticles } from '@/lib/content';
import { Container, PageHeader } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { ArticleCard } from '@/components/news/ArticleCard';
import { DevelopmentTimeline } from '@/components/news/DevelopmentTimeline';

export const metadata: Metadata = {
  title: 'Rare Earth News & Analysis',
  description:
    'Export controls, market research, and supply chain analysis for rare earth and strategic metals.',
  alternates: { canonical: '/news/' },
};

export default function NewsIndexPage() {
  const articles = getAllArticles();
  const developments = [...getNews()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <Container as="main" className="py-10">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
        eyebrow="Editorial"
        title="News & Analysis"
        lead="Export controls, market research, and supply chain intelligence for rare earth and strategic metals."
      />

      {/* ── Featured analysis (the _articles collection) ─────────────────── */}
      {articles.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title="Featured Analysis"
            count={`${articles.length} articles`}
          />
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
          description={
            <>
              A dated timeline of China export-control announcements and related
              trade measures since 2023. For the structured, filterable view of
              every active control regime, see the{' '}
              <Link
                href="/regulatory/"
                className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
              >
                Regulatory Tracker
              </Link>
              .
            </>
          }
        />
        <DevelopmentTimeline items={developments} />
      </section>
    </Container>
  );
}
