/**
 * /api/discussion/threads/[id]/replies: dynamic reply write path.
 *
 * Replies publish as `visible` immediately unless a maintainer later hides them.
 * Locked or hidden threads reject replies. There are no private contact fields,
 * no email, no auth provider, and no third-party moderation call.
 */
import type { DiscussionReply } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  toReplyDTO,
  validateReply,
  type CreateReplyResponse,
  type ReplyField,
} from '@/components/discussion';

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

    if (!thread || thread.status === 'hidden') {
      return json({ ok: false, error: 'Thread not found.' }, 404);
    }
    if (thread.status === 'locked') {
      return json({ ok: false, error: 'This thread is locked.' }, 409);
    }

    const row: DiscussionReply = await prisma.discussionReply.create({
      data: {
        threadId: thread.id,
        authorName: clean.authorName,
        body: clean.body,
        status: 'visible',
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
