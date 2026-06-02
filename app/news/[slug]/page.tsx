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

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: 'In Force', classes: 'text-up bg-up/10 border border-up/25' },
  suspended: {
    label: 'Suspended',
    classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25',
  },
};

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

          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight text-fg">
            {fm.title}
          </h1>
          {fm.subtitle && (
            <p className="mt-3 max-w-prose text-md leading-relaxed text-fg-muted">
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
          <figure className="mb-8 overflow-hidden border border-border bg-raised">
            <Image
              src={`/assets/images/${fm.image}`}
              alt={fm.image_alt ?? fm.title}
              width={1200}
              height={721}
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
              className="h-auto w-full"
            />
          </figure>
        )}

        <div className="content-body">
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
    </Container>
  );
}
