/**
 * /news/[slug]: long-form article page (SSG, case-sensitive slugs).
 *
 * Statically generated for the five `_articles/*.md` files via
 * generateStaticParams(); `dynamicParams = false` 404s anything else. The layout
 * matches the old article page: dateline and status badge, title and subtitle,
 * related-element tags, optional hero image, the markdown body, and a back-link.
 * Per-article metadata (title/description/keywords/canonical/OG) comes from the
 * front matter via the Metadata API.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import '@/components/content/content-body.css';

import { getArticleContent, getArticleSlugs } from '@/lib/content';
import { Container } from '@/components/layout';
import { Breadcrumbs } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { buildMetadata } from '@/lib/seo';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { Markdown } from '@/components/content/Markdown';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const article = getArticleContent(params.slug);
  if (!article) return {};
  const { frontMatter: fm } = article;
  return buildMetadata({
    title: fm.title,
    description: fm.description,
    keywords: fm.keywords,
    path: `/news/${params.slug}/`,
    ogType: 'article',
    publishedTime: fm.date,
    ...(fm.image
      ? { image: `/assets/images/${fm.image}`, imageAlt: fm.image_alt ?? fm.title }
      : {}),
  });
}

// In Force is amber (an active export control), Suspended is gray, matching the
// regulatory tracker's status language.
const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: {
    label: 'In Force',
    classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25',
  },
  suspended: {
    label: 'Suspended',
    classes: 'text-fg-dim bg-surface border border-border',
  },
};

function ArticleHeroPlaceholder({
  title,
  elements,
}: {
  title: string;
  elements?: string[];
}) {
  const chips = elements?.slice(0, 12) ?? [];
  const rails = Array.from({ length: 9 }, (_, i) => i);

  return (
    <figure
      className="mb-8 overflow-hidden border border-border bg-raised"
      aria-label={`Editorial source-docket placeholder for ${title}`}
    >
      <div className="relative min-h-[18rem] sm:min-h-[22rem]">
        <div className="absolute inset-0 grid grid-cols-9" aria-hidden="true">
          {rails.map((rail) => (
            <span
              key={rail}
              className="border-r border-border last:border-r-0"
            />
          ))}
        </div>
        <div className="absolute inset-x-5 top-5 flex items-center gap-3" aria-hidden="true">
          <span className="font-mono text-2xs uppercase tracking-caps text-fg-dim">
            Source docket
          </span>
          <span className="h-px flex-1 bg-border-strong" />
        </div>
        <div className="absolute inset-x-5 bottom-5" aria-hidden="true">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {chips.length > 0
              ? chips.map((sym) => (
                  <span
                    key={sym}
                    className="border border-border bg-surface px-2 py-2 text-center font-mono text-xs text-fg-dim"
                  >
                    {sym}
                  </span>
                ))
              : rails.slice(0, 6).map((rail) => (
                  <span key={rail} className="h-8 border border-border bg-surface" />
                ))}
          </div>
          <div className="mt-5 space-y-2">
            <span className="block h-px w-full bg-border-strong" />
            <span className="block h-px w-3/4 bg-border" />
            <span className="block h-px w-5/6 bg-border" />
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function ArticlePage({ params }: { params: Params }) {
  const article = getArticleContent(params.slug);
  if (!article) notFound();

  const { frontMatter: fm, body } = article;
  const status = fm.status ? STATUS_BADGE[fm.status] : undefined;

  return (
    <Container as="main" className="py-10">
      <ArticleJsonLd
        slug={params.slug}
        title={fm.title}
        description={fm.description}
        datePublished={fm.date}
        image={fm.image}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'News', path: '/news/' },
          { name: fm.title, path: `/news/${params.slug}/` },
        ]}
      />
      <div className="mx-auto max-w-[54rem]">
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: 'Home', href: '/' },
            { label: 'News', href: '/news/' },
            { label: fm.title },
          ]}
        />

        <article>
          <header className="mb-6 border-b border-border-strong pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <time
                dateTime={fm.date}
                className="font-mono text-xs uppercase tracking-wider text-fg-dim"
              >
                {formatDate(fm.date)}
              </time>
              {status && (
                <span
                  className={`inline-block rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold ${status.classes}`}
                >
                  {status.label}
                </span>
              )}
            </div>

            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-fg md:text-4xl">
              {fm.title}
            </h1>
            {fm.subtitle && (
              <p className="mt-3 text-md leading-relaxed text-fg-muted">
                {fm.subtitle}
              </p>
            )}

            {fm.elements && fm.elements.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {fm.elements.map((sym) => (
                  <Link
                    key={sym}
                    href={`/elements/${sym}/`}
                    className="rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-2xs text-fg-muted transition-colors hover:border-border-strong hover:text-accent-strong"
                  >
                    {sym}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {fm.image && (
            <figure className="mb-8 overflow-hidden rounded-lg border border-border bg-raised">
              <Image
                src={`/assets/images/${fm.image}`}
                alt={fm.image_alt ?? fm.title}
                width={1200}
                height={721}
                sizes="(max-width: 768px) 100vw, 736px"
                priority
                className="h-auto w-full"
              />
            </figure>
          )}
          {!fm.image && (
            <ArticleHeroPlaceholder title={fm.title} elements={fm.elements} />
          )}

          <div className="content-body mx-auto">
            <Markdown>{body}</Markdown>
          </div>

          <footer className="mt-10 border-t border-border pt-5">
            <Link
              href="/news/"
              className="font-mono text-xs uppercase tracking-wider text-fg-muted hover:text-accent-strong"
            >
              ← All developments
            </Link>
          </footer>
        </article>
      </div>
    </Container>
  );
}
