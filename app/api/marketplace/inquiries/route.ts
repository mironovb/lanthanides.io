/**
 * POST /api/marketplace/inquiries: the listing detail page's inquiry-form
 * backend — deliberately STORAGE-FREE. The repo forbids new DB tables and
 * write paths (CLAUDE.md 2026-07 refocus), and the one existing inbox
 * (`lib/contributions`) is off-limits to the marketplace, so this endpoint
 * validates, emits ONE structured server log line — the makeshift delivery
 * channel; the owner reads the function logs — and acknowledges. Nothing is
 * persisted anywhere.
 *
 * Accepts BOTH application/json (the JS island) and form-encoded bodies (the
 * no-JS fallback). Responses:
 *   200 { ok: true }                              — JSON success (and honeypot hits, silently)
 *   303 → /marketplace/<slug>/                    — form-encoded success (no-JS fallback)
 *   400 { ok: false, errors: { field: message } } — field errors, collected
 *   400 { ok: false, error }                      — unparseable body / unsupported content type
 *   404 { ok: false, error }                      — unknown listing_slug
 *   405 { error }                                 — GET
 *
 * Abuse guard is the hidden "website" honeypot only (contributions-route
 * precedent): a filled value gets a quiet { ok: true } with no log, so bots
 * learn nothing. No accounts, no tracking, no other rate limiting.
 *
 * Dynamic + Node runtime: reads a request body and transitively touches `fs`
 * via `lib/marketplace`.
 */
import { getListing } from '@/lib/marketplace';
import { CORS } from '../http';
import {
  isInquirySpam,
  validateInquiryFields,
  type RawInquiryFields,
} from '../params';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INQUIRY_CORS: Record<string, string> = {
  ...CORS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Local json helper: same shape as ../http's, minus the CC-BY licence headers
 * — an inquiry acknowledgement is not dataset content.
 */
function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...INQUIRY_CORS,
      ...extra,
    },
  });
}

type ParsedBody =
  | { kind: 'json' | 'form'; raw: RawInquiryFields }
  | { kind: 'invalid'; response: Response };

/** Read the body by declared content type; the kind decides the success shape. */
async function parseBody(request: Request): Promise<ParsedBody> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const parsed: unknown = await request.json();
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('body must be a JSON object');
      }
      return { kind: 'json', raw: parsed as RawInquiryFields };
    } catch {
      return {
        kind: 'invalid',
        response: json({ ok: false, error: 'Invalid JSON body. Expected an object of inquiry fields.' }, 400),
      };
    }
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    try {
      const form = await request.formData();
      // FormData.get yields string | File | null; null → undefined so absent
      // fields validate as absent (a File coerces to a non-matching string).
      const pick = (key: string): unknown => form.get(key) ?? undefined;
      return {
        kind: 'form',
        raw: {
          listing_slug: pick('listing_slug'),
          seller_handle: pick('seller_handle'),
          size_label: pick('size_label'),
          name: pick('name'),
          email: pick('email'),
          country: pick('country'),
          message: pick('message'),
          website: pick('website'),
        },
      };
    } catch {
      return { kind: 'invalid', response: json({ ok: false, error: 'Invalid form body.' }, 400) };
    }
  }

  return {
    kind: 'invalid',
    response: json(
      {
        ok: false,
        error: 'Unsupported content type. Send application/json or a form-encoded body.',
      },
      400,
    ),
  };
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseBody(request);
  if (parsed.kind === 'invalid') return parsed.response;
  const { raw } = parsed;

  // Honeypot first: a filled value gets a quiet no-op success — no log, no
  // validation feedback — so bots learn nothing (contributions precedent).
  if (isInquirySpam(raw)) return json({ ok: true });

  const slug = typeof raw.listing_slug === 'string' ? raw.listing_slug.trim() : '';
  if (slug === '') {
    return json({ ok: false, errors: { listing_slug: 'Required.' } }, 400);
  }
  const listing = getListing(slug); // case-sensitive, mirrors the lib contract
  if (listing === null) {
    return json({ ok: false, error: `Unknown listing "${slug}".` }, 404);
  }

  const v = validateInquiryFields(raw, {
    slug: listing.slug,
    sellerHandle: listing.sellerHandle,
    variantLabels: listing.variants.map((variant) => variant.label),
  });
  if (!v.ok) return json({ ok: false, errors: v.errors }, 400);

  // The ONE structured log line — the delivery channel. Nothing is persisted.
  const f = v.fields;
  console.log(
    '[marketplace-inquiry]',
    JSON.stringify({
      ts: new Date().toISOString(),
      listing_slug: f.listing_slug,
      seller_handle: f.seller_handle,
      size_label: f.size_label,
      name: f.name,
      email: f.email,
      country: f.country,
      message: f.message,
    }),
  );

  if (parsed.kind === 'form') {
    // No-JS fallback: 303 back to the listing page so a refresh cannot repost.
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(listing.url, request.url).toString(),
        'Cache-Control': 'no-store',
        ...INQUIRY_CORS,
      },
    });
  }
  return json({ ok: true });
}

export function GET(): Response {
  return json(
    { error: 'Method not allowed. POST an inquiry (application/json or form-encoded).' },
    405,
    { Allow: 'POST, OPTIONS' },
  );
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: INQUIRY_CORS });
}
