/**
 * /api/discussion/threads: dynamic discussion write path.
 *
 * POST creates a thread. By default it publishes immediately with status 'open';
 * under pre-moderation (DISCUSSION_REQUIRE_APPROVAL) it is created 'pending'
 * (held, non-public) instead — the status is always chosen server-side, never
 * read from the request body. There is no email/contact field, no external
 * moderation service, and no side effects beyond the Prisma write. Public DTOs
 * are contact-safe by construction. Factual price or source claims posted here
 * remain discussion until a maintainer reviews sources and updates the open
 * dataset through the contribution pipeline. See docs/DISCUSSION-MODERATION.md.
 */
import type { DiscussionThread } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getElements, getRegulatoryNotices } from '@/lib/data';
import {
  toThreadDTO,
  validateThread,
  type CreateThreadResponse,
  type ThreadField,
} from '@/components/discussion';
import { initialThreadStatus } from '@/lib/discussion-moderation';

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

export async function POST(request: Request): Promise<Response> {
  let body: Partial<Record<ThreadField, unknown>>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as Partial<Record<ThreadField, unknown>>;
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body. Expected an object of fields.' },
      400,
    );
  }

  // Validate the reference links (elementSymbol + noticeId) against the live
  // catalog and notice list with the SAME rule the client form uses (the form is
  // fed the same lists). lib/data reads versioned _data/ files, never the DB.
  const elementSymbols = getElements().map((e) => e.symbol);
  const noticeIds = getRegulatoryNotices().map((n) => n.notice_id);
  const { clean, fieldErrors } = validateThread(body, {
    elementSymbols,
    noticeIds,
  });
  if (!clean) {
    return json(
      {
        ok: false,
        error: 'Some fields need fixing before this thread can be saved.',
        fieldErrors,
      },
      400,
    );
  }

  try {
    const row: DiscussionThread = await prisma.discussionThread.create({
      data: {
        title: clean.title,
        category: clean.category,
        authorName: clean.authorName,
        organization: clean.organization,
        body: clean.body,
        elementSymbol: clean.elementSymbol,
        noticeId: clean.noticeId,
        sourceUrl: clean.sourceUrl,
        sourceDate: clean.sourceDate,
        status: initialThreadStatus(),
      },
    });
    const payload: CreateThreadResponse = {
      ok: true,
      thread: toThreadDTO({ ...row, _count: { replies: 0 } }),
    };
    return json(payload, 201);
  } catch (err) {
    console.error('[api/discussion/threads] create failed:', err);
    return json(
      { ok: false, error: 'Could not save the thread. Please try again.' },
      500,
    );
  }
}
