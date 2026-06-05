/**
 * /api/discussion/threads: dynamic discussion write path.
 *
 * POST creates a visible thread with status 'open'. There is no email/contact
 * field, no external moderation service, and no side effects beyond the Prisma
 * write. Public DTOs are contact-safe by construction. Factual price or source
 * claims posted here remain discussion until a maintainer reviews sources and
 * updates the open dataset through the contribution pipeline.
 */
import type { DiscussionThread } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  toThreadDTO,
  validateThread,
  type CreateThreadResponse,
  type ThreadField,
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

  const { clean, fieldErrors } = validateThread(body);
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
        status: 'open',
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
