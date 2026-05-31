/**
 * /api/subscribe (Prompt 22) — the write path for notification signups (the
 * Prisma `Subscription` model). This is the alerts layer of the thin commercial
 * app:
 *
 *   POST /api/subscribe   { email, topics: ["regulatory","price-movements"], channel? }
 *     → validates server-side (same rules as the form), dedupes by email+channel,
 *       and persists the row as `channel:'email'`, `status:'waitlist'` with the
 *       chosen topics. Returns the SAFE projection (never the email value).
 *       201 on create · 200 on an idempotent re-signup · 400 on validation
 *       failure · 500 on a DB error.
 *
 * Honest + private (CLAUDE.md hard rules #1/#3 + the task's privacy ask): NO
 * external calls and NO email is ever sent — email is a waitlist, and we say so.
 * We store only what a channel needs to deliver (email + topics), never anything
 * that tracks a visitor, and a subscription is never published into the open
 * dataset. There is deliberately no GET: the subscriber list is private and is
 * never enumerated over HTTP. Node runtime + force-dynamic: it touches the DB and
 * must run per-request.
 */
import type { Subscription } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  serializeTopics,
  toSubscriptionDTO,
  validateSubscription,
  type CreateSubscriptionResponse,
  type SubscriptionField,
} from '@/components/alerts/alerts';

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
  // 1. Parse the body — must be a JSON object.
  let body: Partial<Record<SubscriptionField, unknown>>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as Partial<Record<SubscriptionField, unknown>>;
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body — expected an object of fields.' },
      400,
    );
  }

  // 2. Validate server-side (authoritative — mirrors the form's client checks).
  const { clean, fieldErrors } = validateSubscription(body);
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

  const topicsCsv = serializeTopics(clean.topics);

  // 3. Dedupe by channel + email (app-level — the user's own address, queried
  //    only to avoid a duplicate row; no unique-constraint migration needed). An
  //    email channel always carries an email (validation guarantees it).
  try {
    if (clean.email) {
      const existing = await prisma.subscription.findFirst({
        where: { channel: clean.channel, email: clean.email },
      });
      if (existing) {
        // Idempotent re-signup: honour the latest topic preference, but never
        // resurrect or downgrade an already-confirmed subscription's status.
        const row: Subscription =
          existing.topics === topicsCsv
            ? existing
            : await prisma.subscription.update({
                where: { id: existing.id },
                data: { topics: topicsCsv },
              });
        const payload: CreateSubscriptionResponse = {
          ok: true,
          alreadySubscribed: true,
          subscription: toSubscriptionDTO(row),
        };
        return json(payload, 200);
      }
    }

    // 4. Create the waitlist row. Status is always 'waitlist' here — confirmation
    //    (double opt-in) and delivery are later prompts; nothing is sent now.
    const row: Subscription = await prisma.subscription.create({
      data: {
        channel: clean.channel,
        email: clean.email,
        topics: topicsCsv,
        status: 'waitlist',
      },
    });

    const payload: CreateSubscriptionResponse = {
      ok: true,
      alreadySubscribed: false,
      subscription: toSubscriptionDTO(row),
    };
    return json(payload, 201);
  } catch (err) {
    console.error('[api/subscribe] write failed:', err);
    return json(
      { ok: false, error: 'Could not save your signup. Please try again.' },
      500,
    );
  }
}
