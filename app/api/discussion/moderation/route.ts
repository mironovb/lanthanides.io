/**
 * /api/discussion/moderation — maintainer-only moderation endpoint.
 *
 * DISABLED BY DEFAULT. With DISCUSSION_MODERATION_SECRET unset, every method
 * returns 404: the endpoint does not advertise itself and offers no surface.
 * With the secret set, every call must present `Authorization: Bearer <secret>`
 * (or the `x-moderation-secret` header) — there is NO public mutation path. This
 * is a single shared secret for a solo maintainer, not user authentication.
 *
 *   GET  → the review queue: non-public (pending + hidden) threads and replies,
 *          plus a status histogram. Read-only.
 *   POST → set one thread's or one reply's status to a valid value.
 *          Body: { target: 'thread' | 'reply', id: string, status: string }.
 *
 * Discussion rows carry no private contact fields, so even non-public content
 * here exposes nothing beyond what an author typed. See
 * docs/DISCUSSION-MODERATION.md.
 */
import { prisma } from '@/lib/db';
import {
  isReplyStatus,
  isThreadStatus,
  toReplyDTO,
  toThreadDTO,
} from '@/components/discussion';
import {
  moderationEnabled,
  presentedSecret,
  verifyModerationSecret,
} from '@/lib/discussion-moderation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const QUEUE_TAKE = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * 404 when the endpoint is disabled (no secret configured), 401 when the secret
 * is missing or wrong, otherwise null (authorized — proceed).
 */
function authGate(request: Request): Response | null {
  if (!moderationEnabled()) {
    // Indistinguishable from a route that does not exist.
    return json({ ok: false, error: 'Not found.' }, 404);
  }
  if (!verifyModerationSecret(presentedSecret(request))) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }
  return null;
}

function tally(
  groups: Array<{ status: string; _count: { _all: number } }>,
): Record<string, number> {
  return groups.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count._all;
    return acc;
  }, {});
}

export async function GET(request: Request): Promise<Response> {
  const denied = authGate(request);
  if (denied) return denied;

  try {
    const [threads, replies, threadGroups, replyGroups] = await Promise.all([
      prisma.discussionThread.findMany({
        where: { status: { in: ['pending', 'hidden'] } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: QUEUE_TAKE,
        include: { _count: { select: { replies: true } } },
      }),
      prisma.discussionReply.findMany({
        where: { status: { in: ['pending', 'hidden'] } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: QUEUE_TAKE,
      }),
      prisma.discussionThread.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.discussionReply.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return json({
      ok: true,
      limit: QUEUE_TAKE,
      counts: {
        threads: tally(threadGroups),
        replies: tally(replyGroups),
      },
      queue: {
        threads: threads.map(toThreadDTO),
        replies: replies.map(toReplyDTO),
      },
    });
  } catch (err) {
    console.error('[api/discussion/moderation] GET failed:', err);
    return json(
      { ok: false, error: 'Could not load the moderation queue.' },
      500,
    );
  }
}

interface ModerationAction {
  target?: unknown;
  id?: unknown;
  status?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const denied = authGate(request);
  if (denied) return denied;

  let body: ModerationAction;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as ModerationAction;
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body. Expected { target, id, status }.' },
      400,
    );
  }

  const target = typeof body.target === 'string' ? body.target : '';
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (target !== 'thread' && target !== 'reply') {
    return json({ ok: false, error: "`target` must be 'thread' or 'reply'." }, 400);
  }
  if (!id) {
    return json({ ok: false, error: '`id` is required.' }, 400);
  }

  try {
    if (target === 'thread') {
      if (!isThreadStatus(status)) {
        return json({ ok: false, error: 'Invalid thread status.' }, 400);
      }
      const row = await prisma.discussionThread.update({
        where: { id },
        data: { status },
      });
      return json({ ok: true, target, id: row.id, status: row.status });
    }

    if (!isReplyStatus(status)) {
      return json({ ok: false, error: 'Invalid reply status.' }, 400);
    }
    const row = await prisma.discussionReply.update({
      where: { id },
      data: { status },
    });
    return json({ ok: true, target, id: row.id, status: row.status });
  } catch (err) {
    // Prisma P2025 = "record to update not found".
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === 'P2025'
    ) {
      return json({ ok: false, error: `No ${target} with id ${id}.` }, 404);
    }
    console.error('[api/discussion/moderation] POST failed:', err);
    return json(
      { ok: false, error: 'Could not apply the moderation action.' },
      500,
    );
  }
}
