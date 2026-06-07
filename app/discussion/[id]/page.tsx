/**
 * /discussion/[id]: public detail page for one discussion thread.
 *
 * Hidden and pending threads 404 (only public statuses resolve). Hidden and
 * pending replies are excluded. Locked threads remain readable but do not accept
 * replies. This is dynamic user-generated content in Prisma, not reference data.
 *
 * Layout: a masthead + a compact metadata "record" strip (ThreadMeta), then the
 * original post and an anchored, individually-linkable reply list in the main
 * column, with the reply form (or a locked notice) and a quiet dataset-boundary
 * note in the aside. A footer nav links back to the board and to sibling threads
 * in the same category — both plain links, so no extra queries are issued.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requiresApproval } from '@/lib/discussion-moderation';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container, PageHeader } from '@/components/layout';
import { Badge, Callout, Panel } from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  DiscussionReplyForm,
  PUBLIC_THREAD_STATUSES,
  ThreadMeta,
  discussionHref,
  statusLabel,
  statusVariant,
  toReplyDTO,
  toThreadDTO,
} from '@/components/discussion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  params: { id: string };
}

async function getThread(id: string) {
  return prisma.discussionThread.findFirst({
    // Only public statuses resolve: hidden AND pending threads 404 here.
    where: { id, status: { in: [...PUBLIC_THREAD_STATUSES] } },
    include: {
      replies: {
        where: { status: 'visible' },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          replies: { where: { status: 'visible' } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const row = await prisma.discussionThread.findFirst({
    where: { id: params.id, status: { in: [...PUBLIC_THREAD_STATUSES] } },
    select: { id: true, title: true, body: true, updatedAt: true },
  });
  if (!row) {
    return buildMetadata({
      title: 'Discussion Thread',
      description: 'Discussion thread on lanthanides.io.',
      path: `/discussion/${params.id}/`,
      noindex: true,
    });
  }

  const description =
    row.body.length > 155 ? `${row.body.slice(0, 152).trim()}...` : row.body;
  return buildMetadata({
    title: row.title,
    description,
    path: `/discussion/${row.id}/`,
    modifiedTime: row.updatedAt.toISOString(),
  });
}

/** Empty reply state — branches on lock so a locked thread never invites a reply. */
function RepliesEmpty({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <p className="text-sm leading-relaxed text-fg-muted">
        No replies were posted before this thread was locked.
      </p>
    );
  }
  return (
    <p className="text-sm leading-relaxed text-fg-muted">
      No replies yet. Be the first to add source context, a correction, or a
      narrow follow-up question using the reply form.
    </p>
  );
}

/** Locked-thread notice that replaces the reply form, with a route forward. */
function LockedNotice() {
  return (
    <Callout tone="note" title="Replies closed">
      A maintainer locked this thread, so it stays readable as a record but no
      longer accepts replies. To raise a related point, start a fresh thread on
      the <Link href="/discussion/">discussion board</Link>.
    </Callout>
  );
}

/**
 * Dataset-boundary note: kept visible on every thread but deliberately quiet —
 * a muted footnote under the reply form rather than a tinted callout, so it
 * never competes with the discussion itself.
 */
function DatasetBoundaryNote() {
  return (
    <p className="flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-fg-dim">
      <span aria-hidden="true" className="text-fg-muted">
        ›
      </span>
      <span>
        Discussion is not publication into the open dataset. Price claims,
        corrections, and source tips still go through source review before any
        dataset change — see the{' '}
        <Link
          href="https://github.com/mironovb/lanthanides.io/blob/main/CONTRIBUTING.md"
          className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-strong"
        >
          contribution guide
        </Link>
        .
      </span>
    </p>
  );
}

export default async function DiscussionThreadPage({ params }: PageProps) {
  const row = await getThread(params.id);
  if (!row) notFound();

  const thread = toThreadDTO(row);
  const replies = row.replies.map(toReplyDTO);
  const locked = thread.status === 'locked';
  const requireApproval = requiresApproval();

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Discussion', path: '/discussion/' },
          { name: thread.title, path: `/discussion/${thread.id}/` },
        ]}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: thread.title,
          text: thread.body,
          url: abs(`/discussion/${thread.id}/`),
          datePublished: thread.createdAt,
          dateModified: thread.updatedAt,
          author: { '@type': 'Person', name: thread.authorName },
          discussionUrl: abs(`/discussion/${thread.id}/`),
          articleSection: thread.categoryLabel,
          commentCount: replies.length,
        }}
      />

      <PageHeader
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Discussion', href: '/discussion/' },
          { label: thread.title },
        ]}
        eyebrow={thread.categoryLabel}
        title={thread.title}
        actions={
          <Badge variant={statusVariant(thread.status)}>
            {statusLabel(thread.status)}
          </Badge>
        }
      />

      <ThreadMeta thread={thread} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 space-y-6">
          <Panel title="Original post" eyebrow="Thread">
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
              {thread.body}
            </div>
          </Panel>

          <section
            id="discussion-replies"
            aria-label="Replies"
            className="scroll-mt-20"
          >
            <Panel
              title="Replies"
              eyebrow="Discussion"
              actions={
                <span className="font-mono text-2xs text-fg-dim">
                  {replies.length} visible
                </span>
              }
            >
              {replies.length === 0 ? (
                <RepliesEmpty locked={locked} />
              ) : (
                <ol className="space-y-5">
                  {replies.map((reply, i) => (
                    <li
                      key={reply.id}
                      id={`reply-${reply.id}`}
                      className="scroll-mt-20 border-l-2 border-border pl-4"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <a
                          href={`#reply-${reply.id}`}
                          aria-label={`Permalink to reply ${i + 1}`}
                          className="font-mono text-2xs text-fg-dim transition-colors duration-fast hover:text-accent"
                        >
                          #{i + 1}
                        </a>
                        <p className="font-medium text-fg">{reply.authorName}</p>
                        <time
                          dateTime={reply.createdAt}
                          className="font-mono text-2xs text-fg-dim"
                        >
                          {formatDate(reply.createdAt)}
                        </time>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted">
                        {reply.body}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </section>
        </article>

        <aside className="space-y-5">
          {locked ? (
            <LockedNotice />
          ) : (
            <DiscussionReplyForm
              threadId={thread.id}
              requireApproval={requireApproval}
            />
          )}
          <DatasetBoundaryNote />
        </aside>
      </div>

      <nav
        aria-label="Discussion navigation"
        className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-4 text-sm"
      >
        <Link
          href="/discussion/"
          className="font-medium text-fg-muted transition-colors duration-fast hover:text-accent-strong"
        >
          ← All discussion threads
        </Link>
        <Link
          href={discussionHref({ category: thread.category })}
          className="font-medium text-fg-muted transition-colors duration-fast hover:text-accent-strong"
        >
          More in {thread.categoryLabel} →
        </Link>
      </nav>
    </Container>
  );
}
