/**
 * A feature-article tile for the /news index. Matches the old `np-tile`: a 16/9
 * thumbnail on top when the article declares one (image_thumb), the date, title,
 * short description, and related-element chips below. Links to /news/[slug]/.
 *
 * Articles with no thumbnail render as a clean text card, no image box and no
 * placeholder glyph. Element chips sit at the bottom so cards line up in the
 * grid whether or not they carry art. Composes the shared Card primitive and the
 * shared date formatter.
 */
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { ArticleContent } from '@/lib/content';

export function ArticleCard({ article }: { article: ArticleContent }) {
  const { slug, frontMatter: fm } = article;
  const href = `/news/${slug}/`;

  return (
    <Card as="article" padding="none" interactive className="group flex flex-col">
      {fm.image_thumb && (
        <Link
          href={href}
          className="relative block aspect-[16/9] overflow-hidden bg-raised"
        >
          <Image
            src={`/assets/images/${fm.image_thumb}`}
            alt={fm.image_alt ?? fm.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-4">
        <time
          dateTime={fm.date}
          className="font-mono text-2xs uppercase tracking-wider text-fg-dim"
        >
          {formatDate(fm.date)}
        </time>
        <h3 className="mt-1.5 font-serif text-base font-semibold leading-snug text-fg">
          <Link
            href={href}
            className="transition-colors group-hover:text-accent-strong"
          >
            {fm.title}
          </Link>
        </h3>
        {fm.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">
            {fm.description}
          </p>
        )}
        {fm.elements && fm.elements.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-3">
            {fm.elements.slice(0, 6).map((sym) => (
              <code
                key={sym}
                className="rounded-sm bg-overlay px-1 py-px font-mono text-2xs text-fg-muted"
              >
                {sym}
              </code>
            ))}
            {fm.elements.length > 6 && (
              <code className="rounded-sm px-1 py-px font-mono text-2xs text-fg-dim">
                +{fm.elements.length - 6}
              </code>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
