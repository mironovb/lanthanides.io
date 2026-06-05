/**
 * A feature-article tile for the /news index. The migrated site has uneven
 * legacy art, so articles with no image fall back to consistent source-docket
 * placeholders. Element chips sit at the bottom so cards line up in the grid.
 */
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import { formatDate } from '@/lib/format';
import type { ArticleContent } from '@/lib/content';

function ArticleVisual({
  article,
  href,
  featured = false,
}: {
  article: ArticleContent;
  href: string;
  featured?: boolean;
}) {
  const { frontMatter: fm } = article;
  const image = fm.image_thumb ?? fm.image;

  if (image) {
    return (
      <Link
        href={href}
        aria-label={`Read ${fm.title}`}
        className={cn(
          'relative block overflow-hidden bg-raised',
          featured
            ? 'min-h-[18rem] border-t border-border md:h-full md:border-l md:border-t-0'
            : 'aspect-[16/9] border-b border-border',
        )}
      >
        <Image
          src={`/assets/images/${image}`}
          alt=""
          fill
          sizes={featured ? '(max-width: 768px) 100vw, 42vw' : '(max-width: 640px) 100vw, 33vw'}
          className="object-cover"
        />
      </Link>
    );
  }

  const chips = fm.elements?.slice(0, featured ? 8 : 5) ?? [];
  const rails = Array.from({ length: 7 }, (_, i) => i);

  return (
    <Link
      href={href}
      aria-label={`Read ${fm.title}`}
      className={cn(
        'relative block overflow-hidden bg-raised',
        featured
          ? 'min-h-[18rem] border-t border-border md:h-full md:border-l md:border-t-0'
          : 'aspect-[16/9] border-b border-border',
      )}
    >
      <div className="absolute inset-0 grid grid-cols-7 opacity-80" aria-hidden="true">
        {rails.map((rail) => (
          <span
            key={rail}
            className="border-r border-border last:border-r-0"
          />
        ))}
      </div>
      <div className="absolute inset-x-4 top-4 flex items-center gap-2" aria-hidden="true">
        <span className="h-px flex-1 bg-border-strong" />
        <span className="font-mono text-2xs uppercase tracking-caps text-fg-dim">
          Source docket
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-4 space-y-3" aria-hidden="true">
        <div className="grid grid-cols-5 gap-1.5">
          {chips.length > 0
            ? chips.map((sym) => (
                <span
                  key={sym}
                  className="border border-border bg-surface px-1.5 py-1 text-center font-mono text-2xs text-fg-dim"
                >
                  {sym}
                </span>
              ))
            : rails.slice(0, 5).map((rail) => (
                <span key={rail} className="h-6 border border-border bg-surface" />
              ))}
        </div>
        <div className="space-y-1.5">
          <span className="block h-px w-full bg-border-strong" />
          <span className="block h-px w-2/3 bg-border" />
          <span className="block h-px w-5/6 bg-border" />
        </div>
      </div>
    </Link>
  );
}

function ArticleText({
  article,
  href,
  featured = false,
}: {
  article: ArticleContent;
  href: string;
  featured?: boolean;
}) {
  const { frontMatter: fm } = article;

  return (
    <div
      className={cn(
        'flex flex-1 flex-col',
        featured ? 'p-5 md:p-6' : 'p-4',
      )}
    >
      <time
        dateTime={fm.date}
        className="font-mono text-2xs uppercase tracking-wider text-fg-dim"
      >
        {formatDate(fm.date)}
      </time>

      <h3
        className={cn(
          'mt-2 font-serif font-semibold leading-snug text-fg',
          featured ? 'text-2xl' : 'text-base',
        )}
      >
        <Link
          href={href}
          className="transition-colors group-hover:text-accent-strong"
        >
          {fm.title}
        </Link>
      </h3>

      {fm.subtitle && featured ? (
        <p className="mt-2 text-base leading-relaxed text-fg-muted">{fm.subtitle}</p>
      ) : null}

      {fm.description && (
        <p
          className={cn(
            'mt-2 leading-relaxed text-fg-muted',
            featured ? 'text-sm md:text-base' : 'line-clamp-3 text-sm',
          )}
        >
          {fm.description}
        </p>
      )}

      {featured ? (
        <Link
          href={href}
          className="mt-4 font-mono text-xs uppercase tracking-caps text-accent-strong hover:text-accent"
        >
          Read the explainer →
        </Link>
      ) : null}

      {fm.elements && fm.elements.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-4">
          {fm.elements.slice(0, featured ? 10 : 6).map((sym) => (
            <code
              key={sym}
              className="rounded-sm bg-overlay px-1 py-px font-mono text-2xs text-fg-muted"
            >
              {sym}
            </code>
          ))}
          {fm.elements.length > (featured ? 10 : 6) && (
            <code className="rounded-sm px-1 py-px font-mono text-2xs text-fg-dim">
              +{fm.elements.length - (featured ? 10 : 6)}
            </code>
          )}
        </div>
      )}
    </div>
  );
}

export function ArticleCard({
  article,
  featured = false,
}: {
  article: ArticleContent;
  featured?: boolean;
}) {
  const { slug } = article;
  const href = `/news/${slug}/`;

  if (featured) {
    return (
      <Card
        as="article"
        padding="none"
        interactive
        className="group grid overflow-hidden md:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]"
      >
        <ArticleText article={article} href={href} featured />
        <ArticleVisual article={article} href={href} featured />
      </Card>
    );
  }

  return (
    <Card as="article" padding="none" interactive className="group flex flex-col">
      <ArticleVisual article={article} href={href} />
      <ArticleText article={article} href={href} />
    </Card>
  );
}
