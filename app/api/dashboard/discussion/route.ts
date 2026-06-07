/**
 * GET /api/dashboard/discussion: the live data behind the dashboard's
 * "Community intelligence" panel.
 *
 * This is the ONLY database read involved in the discussion-on-dashboard
 * integration. The /dashboard/ page itself stays SSG and DB-free at build time
 * (docs/DASHBOARD-ROADMAP.md §5–§6); the page renders a client island
 * (CommunityIntel) that fetches this route at runtime. Keeping the DB behind a
 * force-dynamic route is what lets `npm run build` stay green with no database,
 * and what insulates the static reference panels from this query's failure modes.
 *
 * It returns ONLY public, non-hidden threads (open / answered / locked) in the
 * dashboard-actionable categories (source tips, data corrections, price and
 * regulatory questions): the recent few, plus a per-category count. Discussion
 * threads carry no private contact field, so the response is contact-safe by
 * construction, and posts here never enter the open dataset (that stays the
 * reviewed git-PR flow).
 *
 * Graceful by contract: any DB error (most commonly the discussion_threads table
 * not yet migrated in local dev) is caught and returned as `{ ok: false }` with a
 * 200, so the panel degrades to "temporarily unavailable" rather than throwing.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { PUBLIC_THREAD_STATUSES, categoryLabel } from '@/components/discussion';
import {
  DASHBOARD_DISCUSSION_CATEGORIES,
  type CommunityIntelResponse,
  type CommunityThreadItem,
} from '@/components/dashboard/community-intel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** How many recent threads the panel lists — a signal, not a feed. */
const RECENT_LIMIT = 5;

function json(body: CommunityIntelResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(): Promise<Response> {
  // Public + actionable only. Both axes are indexed (status, category), so this
  // stays a small, fast lookup on a board of this size.
  const where: Prisma.DiscussionThreadWhereInput = {
    status: { in: [...PUBLIC_THREAD_STATUSES] },
    category: { in: [...DASHBOARD_DISCUSSION_CATEGORIES] },
  };

  try {
    const [rows, grouped] = await Promise.all([
      prisma.discussionThread.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: RECENT_LIMIT,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          updatedAt: true,
          authorName: true,
          organization: true,
          elementSymbol: true,
          noticeId: true,
          sourceUrl: true,
          sourceDate: true,
          // Visible replies only, matching the board's displayed count.
          _count: { select: { replies: { where: { status: 'visible' } } } },
        },
      }),
      prisma.discussionThread.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
      }),
    ]);

    // Seed every actionable category at 0 so the panel always renders all four
    // chips (a 0 is a real, useful signal), then fill in the measured counts.
    const counts: Record<string, number> = {};
    for (const cat of DASHBOARD_DISCUSSION_CATEGORIES) counts[cat] = 0;
    for (const g of grouped) {
      if (g.category in counts) counts[g.category] = g._count._all;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const threads: CommunityThreadItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      categoryLabel: categoryLabel(r.category),
      status: r.status,
      replyCount: r._count.replies,
      updatedAt: r.updatedAt.toISOString(),
      authorName: r.authorName,
      organization: r.organization,
      elementSymbol: r.elementSymbol,
      noticeId: r.noticeId,
      sourceUrl: r.sourceUrl,
      sourceDate: r.sourceDate,
    }));

    return json({ ok: true, threads, counts, total });
  } catch (err) {
    // Most likely the board table is not migrated in this environment. Log for
    // diagnostics, but degrade gracefully — the dashboard must not crash.
    console.error('[api/dashboard/discussion] query failed:', err);
    return json({ ok: false, reason: 'unavailable' });
  }
}
