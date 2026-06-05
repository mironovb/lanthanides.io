/**
 * /discussion/[id]: public detail page for one discussion thread.
 *
 * Hidden threads 404. Hidden replies are excluded. Locked threads remain
 * readable but do not accept replies. This is dynamic user-generated content in
 * Prisma, not reference data.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, JsonLd, abs } from '@/components/seo';
import { Container, PageHeader } from '@/components/layout';
import { Badge, Callout, Panel } from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  DiscussionReplyForm,
  categoryLabel,
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
    where: { id, status: { not: 'hidden' } },
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
    where: { id: params.id, status: { not: 'hidden' } },
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

export default async function DiscussionThreadPage({ params }: PageProps) {
  const row = await getThread(params.id);
  if (!row) notFound();

  const thread = toThreadDTO(row);
  const replies = row.replies.map(toReplyDTO);
  const locked = thread.status === 'locked';

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
          articleSection: categoryLabel(thread.category),
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{thread.categoryLabel}</Badge>
            <Badge variant={statusVariant(thread.status)}>
              {statusLabel(thread.status)}
            </Badge>
          </div>
        }
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <Panel
            title="Thread"
            eyebrow={formatDate(thread.createdAt)}
            actions={
              <span className="font-mono text-2xs text-fg-dim">
                updated {formatDate(thread.updatedAt)}
              </span>
            }
          >
            <p className="text-sm text-fg-muted">
              Posted by <span className="font-medium text-fg">{thread.authorName}</span>
              {thread.organization ? (
                <>
                  {' '}
                  at <span className="font-medium text-fg">{thread.organization}</span>
                </>
              ) : null}
            </p>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-fg">
              {thread.body}
            </div>
          </Panel>

          <section className="mt-6" aria-labelledby="discussion-replies">
            <Panel
              title="Replies"
              eyebrow="Thread"
              actions={
                <span className="font-mono text-2xs text-fg-dim">
                  {replies.length} visible
                </span>
              }
            >
              {replies.length === 0 ? (
                <p className="text-sm leading-relaxed text-fg-muted">
                  No replies yet. Add source context, a correction, or a narrow
                  follow-up question.
                </p>
              ) : (
                <ol className="space-y-4">
                  {replies.map((reply) => (
                    <li
                      key={reply.id}
                      className="border-l-2 border-border pl-4"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="font-medium text-fg">{reply.authorName}</p>
                        <time
                          dateTime={reply.createdAt}
                          className="font-mono text-2xs text-fg-dim"
                        >
                          {formatDate(reply.createdAt)}
                        </time>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
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
          <Callout tone="note" title="Dataset boundary">
            Discussion is not publication into the open data. Price claims,
            corrections, and source tips still need source review before any
            `_data/` file changes.
          </Callout>

          {locked ? (
            <Callout tone="warning" title="Thread locked">
              This thread remains readable, but replies are closed.
            </Callout>
          ) : (
            <DiscussionReplyForm threadId={thread.id} />
          )}

          <p className="text-xs leading-relaxed text-fg-dim">
            Need to update a source record? Use the{' '}
            <Link
              href="https://github.com/mironovb/lanthanides.io/blob/main/CONTRIBUTING.md"
              className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-strong"
            >
              contribution guide
            </Link>
            .
          </p>
        </aside>
      </div>
    </Container>
  );
}
