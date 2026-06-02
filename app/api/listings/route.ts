/**
 * /api/listings (Prompt 20): the write/read path for seller listings (the
 * Prisma `Listing` model). This is the seller-listing write/read path:
 *
 *   POST /api/listings   { symbol, form, purity, quantityKg, askingPricePerKg,
 *                          currency, sellerName, sellerContact?, notes? }
 *     → validates server-side (same rules as the form), runs the price-gauge
 *       engine over the sourced records, persists the row as `status:'pending'`
 *       with a FROZEN gauge snapshot (gaugeLow/Mid/High/Confidence), and returns
 *       the created listing + the full gauge + the asking-price positioning.
 *       201 on success · 400 on validation failure · 500 on a DB error.
 *
 *   GET  /api/listings[?status=published&limit=50]
 *     → lists listings for the admin/preview view, newest first. Defaults to
 *       `published`; `status` also accepts pending|reviewed|all. NEVER returns the
 *       private `sellerContact` (schema contract: contact is never published).
 *
 * Storage only (CLAUDE.md): no email/payment/notification side effects; the
 * "we'll review it" messaging is on the page, nothing is sent. A listing is NEVER
 * auto-published into the open `_data/` dataset (that stays the reviewed git-PR
 * flow); this only writes the dynamic Prisma store. Node runtime + force-dynamic:
 * it touches the DB and `fs` (via lib/data) and must run per-request.
 */
import type { Listing } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getElements, getPriceRecords } from '@/lib/data';
import { estimatePrice } from '@/lib/price-gauge';
import {
  positionAskingPrice,
  toListingDTO,
  validateListing,
  type CreateListingResponse,
  type ListingField,
} from '@/components/sell/sell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const READ_STATUSES = ['published', 'pending', 'reviewed', 'all'] as const;
type ReadStatus = (typeof READ_STATUSES)[number];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** The dataset's catalog symbols + the forms it actually carries prices for. */
function validationContext(): { symbols: string[]; forms: string[] } {
  return {
    symbols: getElements().map((e) => e.symbol),
    forms: [...new Set(getPriceRecords().map((r) => r.form.toLowerCase()))],
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse the body: must be a JSON object.
  let body: Partial<Record<ListingField, unknown>>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as Partial<Record<ListingField, unknown>>;
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body. Expected an object of fields.' },
      400,
    );
  }

  // 2. Validate server-side (authoritative, mirrors the form's client checks).
  const { clean, fieldErrors } = validateListing(body, validationContext());
  if (!clean) {
    return json(
      {
        ok: false,
        error: 'Some fields need fixing before this listing can be saved.',
        fieldErrors,
      },
      400,
    );
  }

  // 3. Gauge the listing against the sourced records (never fabricates a price).
  const gauge = estimatePrice(
    {
      symbol: clean.elementSymbol,
      form: clean.form,
      purity: clean.purity,
      quantityKg: clean.quantityKg,
    },
    getPriceRecords(),
  );

  // 4. Persist as pending, freezing the gauge snapshot at submission time.
  let row: Listing;
  try {
    row = await prisma.listing.create({
      data: {
        elementSymbol: clean.elementSymbol,
        form: clean.form,
        purity: clean.purity,
        quantityKg: clean.quantityKg,
        askingPricePerKg: clean.askingPricePerKg,
        currency: clean.currency,
        sellerName: clean.sellerName,
        sellerContact: clean.sellerContact,
        notes: clean.notes,
        status: 'pending',
        gaugeLow: gauge.sufficient ? gauge.low : null,
        gaugeMid: gauge.sufficient ? gauge.mid : null,
        gaugeHigh: gauge.sufficient ? gauge.high : null,
        gaugeConfidence: gauge.sufficient ? gauge.confidence : null,
      },
    });
  } catch (err) {
    console.error('[api/listings] create failed:', err);
    return json(
      { ok: false, error: 'Could not save the listing. Please try again.' },
      500,
    );
  }

  // 5. Position the asking price against the band, only when comparable:
  //    a sufficient gauge AND a USD quote (no live FX rate, hard rules #1/#3).
  let assessment: CreateListingResponse['assessment'] = null;
  let assessmentNote: string | null = null;
  if (
    gauge.sufficient &&
    gauge.low != null &&
    gauge.mid != null &&
    gauge.high != null
  ) {
    if (clean.currency === 'USD') {
      assessment = positionAskingPrice(
        clean.askingPricePerKg,
        gauge.low,
        gauge.mid,
        gauge.high,
      );
    } else {
      assessmentNote = `Your quote is in ${clean.currency}; the sourced dataset is USD-denominated and we apply no live exchange rate, so the band below is shown in USD/kg for reference rather than a direct comparison.`;
    }
  }

  const payload: CreateListingResponse = {
    ok: true,
    listing: toListingDTO(row),
    gauge,
    assessment,
    assessmentNote,
  };
  return json(payload, 201);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const statusRaw = (searchParams.get('status') ?? 'published').toLowerCase();
  const status: ReadStatus = (READ_STATUSES as readonly string[]).includes(
    statusRaw,
  )
    ? (statusRaw as ReadStatus)
    : 'published';

  const limitRaw = Number(searchParams.get('limit'));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;

  try {
    const rows = await prisma.listing.findMany({
      where: status === 'all' ? undefined : { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return json({
      ok: true,
      status,
      count: rows.length,
      listings: rows.map(toListingDTO),
    });
  } catch (err) {
    console.error('[api/listings] read failed:', err);
    return json({ ok: false, error: 'Could not load listings.' }, 500);
  }
}
