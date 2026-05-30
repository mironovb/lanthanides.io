/**
 * A feature-article tile for the /news index (Prompt 8) — ports the legacy
 * `np-tile` markup. Links to /news/[slug]/. Renders the real thumbnail when the
 * article declares one (image_thumb), otherwise the legacy placeholder glyph, so
 * the grid stays even regardless of which articles have art.
 */
import Link from 'next/link';
import type { ArticleContent } from '@/lib/content';

function formatDate(iso: string): string {
  // 'YYYY-MM-DD' → 'Mon D, YYYY' (UTC so SSG output is deterministic).
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function ArticleCard({ article }: { article: ArticleContent }) {
  const { slug, frontMatter: fm } = article;
  const href = `/news/${slug}/`;

  return (
    <article className="group flex flex-col border border-border bg-surface transition-colors hover:border-border-strong">
      <Link href={href} className="block aspect-[16/9] overflow-hidden bg-raised">
        {fm.image_thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/assets/images/${fm.image_thumb}`}
            alt={fm.image_alt ?? fm.title}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-border-strong">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              aria-hidden="true"
            >
              <path
                d="M6 38l10-14 8 10 6-8 12 12H6z"
                fill="currentColor"
                opacity="0.4"
              />
              <circle cx="34" cy="14" r="4" fill="currentColor" opacity="0.4" />
              <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="2"
                stroke="currentColor"
                opacity="0.5"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <time
          dateTime={fm.date}
          className="font-mono text-2xs uppercase tracking-wider text-fg-dim"
        >
          {formatDate(fm.date)}
        </time>
        <h3 className="mt-1.5 font-serif text-base font-semibold leading-snug text-fg">
          <Link href={href} className="hover:text-accent-strong">
            {fm.title}
          </Link>
        </h3>
        {fm.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">
            {fm.description}
          </p>
        )}
        {fm.elements && fm.elements.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 pt-1">
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
    </article>
  );
}
