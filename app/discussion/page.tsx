/**
 * /discussion: a restrained discussion board for source tips, price questions,
 * regulatory questions, data corrections, market notes, and site/meta work.
 *
 * Dynamic + Node runtime: this is user-generated content in Prisma, kept fully
 * separate from the versioned reference dataset in _data/. The first screen is
 * the board itself: filters, server-rendered thread list, and the submission
 * form. No seed content is fabricated.
 */
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout } from '@/components/ui';
import {
  DISCUSSION_CATEGORY_IDS,
  PUBLIC_THREAD_STATUSES,
  DiscussionFilters,
  DiscussionThreadForm,
  DiscussionThreadList,
  toThreadDTO,
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

function cleanCategory(value: unknown): string | undefined {
  const v = typeof value === 'string' ? value : '';
  return (DISCUSSION_CATEGORY_IDS as readonly string[]).includes(v) ? v : undefined;
}

function cleanStatus(value: unknown): string | undefined {
  const v = typeof value === 'string' ? value : '';
  return (PUBLIC_THREAD_STATUSES as readonly string[]).includes(v) ? v : undefined;
}

export default async function DiscussionPage({
  searchParams,
}: {
  searchParams?: { category?: string; status?: string };
}) {
  const category = cleanCategory(searchParams?.category);
  const status = cleanStatus(searchParams?.status);

  const where: Prisma.DiscussionThreadWhereInput = {
    status: status ?? { in: [...PUBLIC_THREAD_STATUSES] },
    ...(category ? { category } : {}),
  };

  const rows = await prisma.discussionThread.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
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
        Threads and replies publish immediately today unless a maintainer later
        hides or locks them. There is no live moderation queue, no email workflow,
        and no external service behind this board.
      </Callout>

      <section className="mt-8" aria-label="Discussion board">
        <DiscussionFilters category={category} status={status} />

        <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <DiscussionThreadList threads={threads} />
          <DiscussionThreadForm />
        </div>
      </section>
    </Container>
  );
}
