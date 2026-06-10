/**
 * CommunityIntel: the dashboard's restrained "Community intelligence" panel,
 * the bridge from a data gap on the dashboard to the source tip or question that
 * could close it, without turning the dashboard into a social feed.
 *
 * Why a client island: /dashboard/ is SSG and intentionally DB-free at build
 * time (docs/DASHBOARD-ROADMAP.md §5). The discussion board lives in Prisma, so
 * this panel fetches the live data from /api/dashboard/discussion at runtime
 * instead of reading the DB during the build. The static reference panels above
 * never touch the database and are unaffected by anything that happens here.
 *
 * It shows only public, non-hidden threads in the dashboard-actionable
 * categories (source tips, data corrections, price and regulatory questions):
 * a per-category count and the few most recent, each linking to a filtered view
 * of /discussion/. It degrades calmly, loading, empty, and "temporarily
 * unavailable" all keep the panel frame and the link to the board.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Panel } from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  categoryLabel,
  discussionHref,
  statusLabel,
  statusVariant,
} from '@/components/discussion';
import { ThreadRefs } from '@/components/discussion/ThreadRefs';
import {
  DASHBOARD_DISCUSSION_CATEGORIES,
  type CommunityIntelResponse,
  type CommunityThreadItem,
} from './community-intel';

type Phase =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      threads: CommunityThreadItem[];
      counts: Record<string, number>;
      total: number;
    }
  | { kind: 'unavailable' };

export function CommunityIntel({ className }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/dashboard/discussion/', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as CommunityIntelResponse;
        setPhase(
          data.ok
            ? {
                kind: 'ready',
                threads: data.threads,
                counts: data.counts,
                total: data.total,
              }
            : { kind: 'unavailable' },
        );
      } catch {
        if (!controller.signal.aborted) setPhase({ kind: 'unavailable' });
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <Panel
      eyebrow="Discussion"
      title="Community intelligence"
      className={className}
      actions={
        <Link
          href="/discussion/"
          className="text-xs text-accent hover:text-accent-strong"
        >
          View board →
        </Link>
      }
    >
      <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
        Source tips, data corrections, and open questions from contributors,
        tied to the figures above. Posting here never changes the dataset;
        accepted facts still go through{' '}
        <Link
          href="/methodology/"
          className="text-accent hover:text-accent-strong"
        >
          source review
        </Link>{' '}
        and a pull request.
      </p>

      <CategoryChips phase={phase} />

      <div className="mt-5 border-t border-border pt-4">
        <RecentThreads phase={phase} />
      </div>

      <noscript>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Recent threads load with JavaScript enabled.{' '}
          <Link href="/discussion/" className="text-accent hover:text-accent-strong">
            Open the discussion board
          </Link>
          .
        </p>
      </noscript>
    </Panel>
  );
}

/**
 * The four actionable categories as navigation chips. They link to a filtered
 * board view regardless of fetch state (so they always work); the count appears
 * once the live data resolves.
 */
function CategoryChips({ phase }: { phase: Phase }) {
  const counts = phase.kind === 'ready' ? phase.counts : null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Discussion categories">
      {DASHBOARD_DISCUSSION_CATEGORIES.map((cat) => {
        const n = counts?.[cat];
        return (
          <li key={cat}>
            <Link
              href={discussionHref({ category: cat })}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2 py-1 text-2xs text-fg-muted transition-colors duration-fast hover:border-border-strong hover:text-fg"
            >
              <span>{categoryLabel(cat)}</span>
              {n != null ? (
                <span className="font-mono tabular-nums text-fg">{n}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Loading / unavailable / empty / list, sharing one calm visual register. */
function RecentThreads({ phase }: { phase: Phase }) {
  if (phase.kind === 'loading') {
    return (
      <p className="text-sm text-fg-dim" role="status" aria-live="polite">
        Loading recent threads…
      </p>
    );
  }

  if (phase.kind === 'unavailable') {
    return (
      <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
        The discussion board is temporarily unavailable. You can still{' '}
        <Link href="/discussion/" className="text-accent hover:text-accent-strong">
          open the board directly
        </Link>
        .
      </p>
    );
  }

  if (phase.threads.length === 0) {
    return (
      <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
        No open source tips, corrections, or questions yet.{' '}
        <Link href="/discussion/" className="text-accent hover:text-accent-strong">
          Start a thread
        </Link>{' '}
        to flag a source or a data gap.
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-border"
      aria-label="Recent discussion threads"
    >
      {phase.threads.map((t) => (
        <li key={t.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <Link
              href={`/discussion/${t.id}/`}
              className="font-medium text-fg transition-colors duration-fast hover:text-accent"
            >
              {t.title}
            </Link>
            <time
              dateTime={t.updatedAt}
              className="shrink-0 font-mono text-2xs text-fg-dim"
            >
              {formatDate(t.updatedAt)}
            </time>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-fg-dim">
            <Badge>{t.categoryLabel}</Badge>
            <Badge variant={statusVariant(t.status)}>
              {statusLabel(t.status)}
            </Badge>
            {t.elementSymbol || t.noticeId ? (
              <ThreadRefs
                elementSymbol={t.elementSymbol}
                noticeId={t.noticeId}
              />
            ) : null}
            <span className="break-words">
              {t.authorName}
              {t.organization ? ` · ${t.organization}` : ''}
            </span>
            {t.replyCount > 0 ? (
              <span className="font-mono tabular-nums">
                {t.replyCount} {t.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
