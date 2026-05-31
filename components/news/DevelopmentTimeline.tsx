/**
 * The "Regulatory & Trade Developments" timeline on /news (Prompt 8), rendered
 * from `_data/news.yml`. Each entry shows its date, topic tag, status, headline,
 * summary, related elements, and source references. Entries backed by a full
 * article (the `article` slug) link their headline to /news/[slug]/.
 *
 * Server-rendered; newest-first ordering is done by the page.
 */
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { NewsItem } from '@/lib/types';

const STATUS_STYLE: Record<string, { label: string; classes: string }> = {
  active: { label: 'In Force', classes: 'text-up bg-up/10 border border-up/25' },
  suspended: {
    label: 'Suspended',
    classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25',
  },
  superseded: {
    label: 'Superseded',
    classes: 'text-fg-dim bg-surface border border-border',
  },
  historic: {
    label: 'Historic',
    classes: 'text-fg-dim bg-surface border border-border',
  },
};

export function DevelopmentTimeline({ items }: { items: NewsItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => {
        const status = STATUS_STYLE[item.status];
        return (
          <li
            key={`${item.date}-${i}`}
            className="border border-border border-l-[3px] border-l-border-strong bg-surface px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <time
                dateTime={item.date}
                className="font-mono text-2xs uppercase tracking-wider text-fg-dim"
              >
                {formatDate(item.date)}
              </time>
              {item.tag && (
                <span className="font-mono text-2xs uppercase tracking-wider text-accent-strong">
                  {item.tag}
                </span>
              )}
              {status && (
                <span
                  className={`ml-auto inline-block rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold ${status.classes}`}
                >
                  {status.label}
                </span>
              )}
            </div>

            <h3 className="mt-1.5 font-serif text-base font-semibold leading-snug text-fg">
              {item.article ? (
                <Link
                  href={`/news/${item.article}/`}
                  className="hover:text-accent-strong"
                >
                  {item.headline}
                </Link>
              ) : (
                item.headline
              )}
            </h3>

            {item.body && (
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {item.body}
              </p>
            )}

            {item.elements && item.elements.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {item.elements.map((sym) => (
                  <Link
                    key={sym}
                    href={`/elements/${sym}/`}
                    className="rounded-sm bg-overlay px-1 py-px font-mono text-2xs text-fg-muted hover:text-accent-strong"
                  >
                    {sym}
                  </Link>
                ))}
              </div>
            )}

            {item.references && item.references.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border pt-2.5">
                {item.references.map((ref, r) => (
                  <li key={r} className="text-xs leading-relaxed text-fg-dim">
                    <span className="text-fg-muted">{ref.label}</span>
                    {ref.note && <span> — {ref.note}</span>}
                  </li>
                ))}
              </ul>
            )}

            {item.article && (
              <p className="mt-3">
                <Link
                  href={`/news/${item.article}/`}
                  className="font-mono text-2xs uppercase tracking-wider text-accent-strong hover:text-accent"
                >
                  Read the full analysis →
                </Link>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
