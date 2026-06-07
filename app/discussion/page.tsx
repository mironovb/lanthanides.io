/**
 * /discussion: a restrained discussion board for source tips, price questions,
 * regulatory questions, data corrections, market notes, and site/meta work.
 *
 * Dynamic + Node runtime: this is user-generated content in Prisma, kept fully
 * separate from the versioned reference dataset in _data/. The board reads its
 * whole state from the URL (?category=&status=&sort=&q=) so it is crawlable and
 * works without JS: server-rendered filters + search, a sortable thread list,
 * and the submission form. No seed content is fabricated.
 */
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getElements } from '@/lib/data';
import { requiresApproval } from '@/lib/discussion-moderation';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout } from '@/components/ui';
import {
  PUBLIC_THREAD_STATUSES,
  DiscussionFilters,
  DiscussionThreadForm,
  DiscussionThreadList,
  categoryLabel,
  parseDiscussionQuery,
  sortLabel,
  statusLabel,
  toThreadDTO,
  type RawDiscussionParams,
  type ThreadSort,
} from '@/components/discussion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DESCRIPTION =
  'A source-aware discussion board for rare-earth and strategic-material market notes, source tips, regulatory questions, data corrections, and contributor coordination.';

export const metadata: Metadata = buildMetadata({
  title: 'Discussion Board',
  description: DESCRIPTION,
  keywords:
    'rare earth discussion, strategic materials forum, rare earth source tips, export control questions, rare earth price questions, lanthanides contributors',
  path: '/discussion/',
});

/**
 * Sort id → Prisma orderBy. Kept here (server-side) so the shared discussion
 * helpers stay free of any Prisma import. Every order ends with an id tiebreaker
 * so paging under the take cap is deterministic. `replies` ranks by total related
 * rows; a rare maintainer-hidden reply is not subtracted (the displayed count
 * stays visible-only), which is acceptable for ordering on a small board.
 */
function threadOrderBy(
  sort: ThreadSort,
): Prisma.DiscussionThreadOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    case 'replies':
      return [{ replies: { _count: 'desc' } }, { updatedAt: 'desc' }, { id: 'desc' }];
    case 'title':
      return [{ title: 'asc' }, { id: 'asc' }];
    case 'latest':
    default:
      return [{ updatedAt: 'desc' }, { id: 'desc' }];
  }
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-border-strong">
      ·
    </span>
  );
}

export default async function DiscussionPage({
  searchParams,
}: {
  searchParams?: RawDiscussionParams;
}) {
  const { category, status, sort, q } = parseDiscussionQuery(searchParams);
  const requireApproval = requiresApproval();

  const where: Prisma.DiscussionThreadWhereInput = {
    status: status ?? { in: [...PUBLIC_THREAD_STATUSES] },
    ...(category ? { category } : {}),
    // Free-text search over the public, display-only columns. Prisma `contains`
    // binds `q` as a query parameter (no SQL string-building), so this is
    // injection-safe; `cleanSearch` only trims and caps the input. There is no
    // private contact column on a thread, so search can never reach private data.
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
            { authorName: { contains: q, mode: 'insensitive' } },
            { organization: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const rows = await prisma.discussionThread.findMany({
    where,
    orderBy: threadOrderBy(sort),
    include: {
      _count: {
        select: {
          replies: { where: { status: 'visible' } },
        },
      },
    },
    take: 100,
  });
  const threads = rows.map(toThreadDTO);

  // Catalog for the source-tip element picker (and its server-side validation
  // mirror). Read from the versioned _data/ files, never the DB.
  const elements = getElements()
    .map((e) => ({ symbol: e.symbol, name: e.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtersActive = Boolean(category || status || q);
  // Distinguish "no threads exist at all" from "the filters/search excluded
  // them". Only pay for the extra count when the filtered result is empty AND a
  // filter is active — with no filter active, an empty result already is an empty
  // board (the query is the unfiltered baseline).
  const boardEmpty =
    threads.length === 0 &&
    (!filtersActive ||
      (await prisma.discussionThread.count({
        where: { status: { in: [...PUBLIC_THREAD_STATUSES] } },
      })) === 0);

  return (
    <Container as="main" className="py-10">
      <WebApplicationJsonLd
        name="Discussion Board · lanthanides.io"
        description={DESCRIPTION}
        path="/discussion/"
        applicationCategory="CommunicationApplication"
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Discussion', path: '/discussion/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Discussion' }]}
        eyebrow="Discussion"
        title="Discussion Board"
        lead="Source tips, market notes, regulatory questions, data corrections, and contributor coordination for rare earth and strategic materials."
        actions={
          <span className="font-mono text-xs text-fg-dim">
            {threads.length} visible
          </span>
        }
      >
        <StoryLink>
          Factual price claims and source tips posted here do not enter the open
          dataset automatically. Dataset updates still go through the{' '}
          <Link href="https://github.com/mironovb/lanthanides.io/blob/main/CONTRIBUTING.md">
            contribution pipeline
          </Link>{' '}
          and source review.
        </StoryLink>
      </PageHeader>

      <Callout tone="note" title="Moderation status" className="mt-8">
        {requireApproval ? (
          <>
            New threads and replies are{' '}
            <span className="text-fg">held for maintainer review</span> and become
            public only after a maintainer approves them. Posting here never
            publishes into the open dataset.
          </>
        ) : (
          <>
            Threads and replies{' '}
            <span className="text-fg">publish immediately</span>. A maintainer can
            later mark a thread answered, lock it to new replies, hold it for
            review, or hide it. There is no account system, live moderation queue,
            or external service behind this board.
          </>
        )}{' '}
        The full policy is in the{' '}
        <Link href="https://github.com/mironovb/lanthanides.io/blob/main/docs/DISCUSSION-MODERATION.md">
          moderation guide
        </Link>
        .
      </Callout>

      <section className="mt-8" aria-label="Discussion board">
        <DiscussionFilters category={category} status={status} sort={sort} q={q} />

        {/* Result summary: count + the active query in one terminal-dense line. */}
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-2xs text-fg-dim">
          <span className="text-fg-muted">{threads.length}</span>
          <span>{threads.length === 1 ? 'thread' : 'threads'}</span>
          <Dot />
          <span>sorted by {sortLabel(sort).toLowerCase()}</span>
          {category ? (
            <>
              <Dot />
              <span>in {categoryLabel(category)}</span>
            </>
          ) : null}
          {status ? (
            <>
              <Dot />
              <span>{statusLabel(status).toLowerCase()}</span>
            </>
          ) : null}
          {q ? (
            <>
              <Dot />
              <span>
                matching &ldquo;<span className="text-fg-muted">{q}</span>&rdquo;
              </span>
            </>
          ) : null}
          {filtersActive ? (
            <Link
              href="/discussion/"
              className="ml-1 text-accent underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-accent-strong"
            >
              Clear all
            </Link>
          ) : null}
        </p>

        <div className="mt-4 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <DiscussionThreadList threads={threads} boardEmpty={boardEmpty} />
          <DiscussionThreadForm elements={elements} requireApproval={requireApproval} />
        </div>
      </section>
    </Container>
  );
}
