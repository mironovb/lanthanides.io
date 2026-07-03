/**
 * POST /api/contributions: the write path of the contributions inbox. Validates
 * a community price observation server-side (the SAME validateContribution the
 * form island runs, so client and server can never disagree) and inserts it as
 * a status 'pending' row in the single price_contributions table.
 *
 * Honesty + boundaries (CLAUDE.md):
 * - A row is a review-queue entry, never published data. Nothing here writes
 *   to _data/ or the site; a maintainer merges accepted observations as a PR.
 * - No fabrication: validation rejects guessed/incomplete records instead of
 *   filling them in (hard rule #1).
 * - 503 (not 500) when the inbox is unconfigured or unreachable, with a
 *   pointer to the GitHub template path, so the contributor is never stranded.
 * - Deliberately POST-only: the queue renders server-side on /contribute; no
 *   list API is exposed.
 *
 * Abuse guard is a honeypot field only ("website" must stay empty; bots that
 * fill it get a silent 200 with no insert). No accounts, no tracking.
 */
import {
  validateContribution,
  type ContributionInput,
} from '@/components/contribute/contributions';
import { getElements } from '@/lib/data';
import { inboxConfigured, insertContribution } from '@/lib/contributions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNAVAILABLE =
  'The contributions inbox is temporarily unavailable. Try again later, or submit via the GitHub price-update template.';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: 'Send a JSON body.' }, 400);
  }

  // Honeypot: humans never see the field; a filled value gets a quiet no-op
  // success so bots learn nothing.
  if (asString(raw.website).trim() !== '') {
    return json({ ok: true }, 200);
  }

  const input: ContributionInput = {
    element: asString(raw.element),
    form: asString(raw.form),
    purity: asString(raw.purity),
    quantityKg: asString(raw.quantityKg),
    price: asString(raw.price),
    currency: asString(raw.currency),
    unit: asString(raw.unit),
    tier: asString(raw.tier),
    sourceName: asString(raw.sourceName),
    sourceUrl: asString(raw.sourceUrl),
    observedDate: asString(raw.observedDate),
    submittedBy: asString(raw.submittedBy),
    notes: asString(raw.notes),
  };

  const symbols = getElements().map((e) => e.symbol);
  const { errors, value } = validateContribution(input, symbols);
  if (!value) {
    return json(
      { ok: false, errors, message: 'Fix the highlighted fields.' },
      400,
    );
  }

  if (!inboxConfigured()) {
    return json({ ok: false, message: UNAVAILABLE }, 503);
  }

  try {
    const contribution = await insertContribution(value);
    return json({ ok: true, contribution }, 201);
  } catch {
    return json({ ok: false, message: UNAVAILABLE }, 503);
  }
}

export async function GET() {
  return json(
    {
      ok: false,
      message:
        'POST a price observation here; the queue is shown on /contribute/.',
    },
    405,
  );
}
