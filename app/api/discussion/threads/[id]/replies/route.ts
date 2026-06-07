/**
 * /api/discussion/threads/[id]/replies: dynamic reply write path.
 *
 * By default replies publish as `visible` immediately; under pre-moderation
 * (DISCUSSION_REQUIRE_APPROVAL) they are created `pending` (held) instead — the
 * status is always chosen server-side. The lock/hide/pending gate is the shared
 * `replyDisposition` rule: open/answered accept replies, locked threads 409, and
 * hidden/pending threads 404 (they are not public, so we do not confirm they
 * exist). There are no private contact fields, no email, no auth provider, and no
 * third-party moderation call. See docs/DISCUSSION-MODERATION.md.
 */
import type { DiscussionReply } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  replyDisposition,
  toReplyDTO,
  validateReply,
  type CreateReplyResponse,
  type ReplyField,
} from '@/components/discussion';
import { initialReplyStatus } from '@/lib/discussion-moderation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let body: Partial<Record<ReplyField, unknown>>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as Partial<Record<ReplyField, unknown>>;
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body. Expected an object of fields.' },
      400,
    );
  }

  const { clean, fieldErrors } = validateReply(body);
  if (!clean) {
    return json(
      {
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors,
      },
      400,
    );
  }

  try {
    const thread = await prisma.discussionThread.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });

    // A missing thread and a non-public (hidden / pending) thread both 404, so we
    // never confirm a held thread exists.
    if (!thread) {
      return json({ ok: false, error: 'Thread not found.' }, 404);
    }
    const disposition = replyDisposition(thread.status);
    if (disposition === 'notfound') {
      return json({ ok: false, error: 'Thread not found.' }, 404);
    }
    if (disposition === 'locked') {
      return json({ ok: false, error: 'This thread is locked.' }, 409);
    }

    const row: DiscussionReply = await prisma.discussionReply.create({
      data: {
        threadId: thread.id,
        authorName: clean.authorName,
        body: clean.body,
        status: initialReplyStatus(),
      },
    });

    const payload: CreateReplyResponse = {
      ok: true,
      reply: toReplyDTO(row),
    };
    return json(payload, 201);
  } catch (err) {
    console.error('[api/discussion/replies] create failed:', err);
    return json(
      { ok: false, error: 'Could not save the reply. Please try again.' },
      500,
    );
  }
}
