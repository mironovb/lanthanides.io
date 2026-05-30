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
    <main className="mx-auto max-w-content px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">News</span>
      </nav>

      <header className="border-b border-border-strong pb-6">
        <h1 className="font-serif text-3xl font-semibold text-fg">
          News &amp; Analysis
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-fg-muted">
          Export controls, market research, and supply chain intelligence for rare
          earth and strategic metals.
        </p>
      </header>

      {/* ── Featured analysis (the _articles collection) ─────────────────── */}
      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 flex items-baseline gap-2 font-serif text-lg font-semibold text-fg">
            Featured Analysis
            <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
              {articles.length} articles
            </span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* ── Regulatory & trade developments (news.yml) ───────────────────── */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-baseline gap-2 border-t border-border-strong pt-8 font-serif text-lg font-semibold text-fg">
          Regulatory &amp; Trade Developments
          <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
            {developments.length} entries
          </span>
        </h2>
        <p className="mb-5 max-w-prose text-sm leading-relaxed text-fg-muted">
          A dated timeline of China export-control announcements and related trade
          measures since 2023. For the structured, filterable view of every active
          control regime, see the{' '}
          <Link
            href="/regulatory/"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            Regulatory Tracker
          </Link>
          .
        </p>
        <DevelopmentTimeline items={developments} />
      </section>
    </main>
  );
}
