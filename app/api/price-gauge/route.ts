/**
 * /api/price-gauge (Prompt 18) — the HTTP face of the price-gauge engine
 * (`lib/price-gauge.ts`). Estimates a fair price RANGE + confidence for a
 * requested {element, form, purity, quantity}, computed entirely from the
 * sourced price records. It never fabricates a price: an element/band with no
 * matching records returns an explicit `sufficient:false` body, not a guess.
 *
 *   GET  /api/price-gauge?symbol=Dy&form=oxide&quantityKg=0.05[&tier=retail][&purity=99.9%]
 *   POST /api/price-gauge   { "symbol":"Dy", "form":"oxide", "quantityKg":0.05, ... }
 *
 * Responses:
 *   200 — a valid query (engine result, whether or not data was sufficient)
 *   400 — missing symbol, or unknown form / tier / quantity (with the allowed set)
 *   404 — unknown element
 *
 * Dynamic + Node runtime: it reads request input and transitively touches `fs`
 * (via `lib/data`), so it can't be statically optimised or run on the edge.
 */
import { getElementBySymbol, getElements, getPriceRecords } from '@/lib/data';
import {
  estimatePrice,
  type PriceGaugeInput,
  type TierBand,
} from '@/lib/price-gauge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIERS: readonly TierBand[] = ['retail', 'bulk'];

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(
  body: unknown,
  status = 200,
  cache = 'no-store',
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      ...CORS,
    },
  });
}

/** Distinct material forms present in the dataset (lower-case), sorted. */
function knownForms(): string[] {
  return [...new Set(getPriceRecords().map((r) => r.form.toLowerCase()))].sort();
}

/** Resolve a symbol to its canonical, case-sensitive catalog form, or null. */
function resolveSymbol(raw: string): string | null {
  if (getElementBySymbol(raw)) return raw;
  const lower = raw.toLowerCase();
  return getElements().find((e) => e.symbol.toLowerCase() === lower)?.symbol ?? null;
}

interface RawParams {
  symbol?: unknown;
  form?: unknown;
  purity?: unknown;
  quantityKg?: unknown;
  tier?: unknown;
}

type Validated =
  | { ok: true; input: PriceGaugeInput }
  | { ok: false; status: number; body: Record<string, unknown> };

/** Coerce + validate raw GET/POST params into a `PriceGaugeInput`. */
function validate(raw: RawParams): Validated {
  const str = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s.length > 0 ? s : undefined;
  };

  // symbol — required.
  const symbolRaw = str(raw.symbol);
  if (!symbolRaw) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'Missing required parameter "symbol".',
        usage:
          '/api/price-gauge?symbol=Dy&form=oxide&quantityKg=0.05 (also accepts POST JSON)',
        parameters: {
          symbol: 'required — element symbol, e.g. "Dy" (case-insensitive)',
          form: `optional — one of ${knownForms().join(', ')}`,
          purity: 'optional — e.g. "99.9%" (soft-weights toward like purity)',
          quantityKg: 'optional — selects the tier band when "tier" is omitted',
          tier: `optional — one of ${TIERS.join(', ')} (overrides quantity)`,
        },
      },
    };
  }
  const symbol = resolveSymbol(symbolRaw);
  if (!symbol) {
    return {
      ok: false,
      status: 404,
      body: { error: `Unknown element "${symbolRaw}".` },
    };
  }

  // tier — optional, but if present must be retail|bulk.
  let tier: TierBand | undefined;
  const tierRaw = str(raw.tier);
  if (tierRaw) {
    const t = tierRaw.toLowerCase();
    if (!TIERS.includes(t as TierBand)) {
      return {
        ok: false,
        status: 400,
        body: { error: `Unknown tier "${tierRaw}".`, allowed: TIERS },
      };
    }
    tier = t as TierBand;
  }

  // quantityKg — optional, but if present must be a positive finite number.
  let quantityKg: number | undefined;
  const qtyRaw = raw.quantityKg;
  if (qtyRaw !== undefined && qtyRaw !== null && String(qtyRaw).trim() !== '') {
    const n = Number(qtyRaw);
    if (!Number.isFinite(n) || n <= 0) {
      return {
        ok: false,
        status: 400,
        body: {
          error: `Invalid quantityKg "${String(qtyRaw)}" — expected a positive number of kilograms.`,
        },
      };
    }
    quantityKg = n;
  }

  // form — optional, but if present must be a form the dataset actually carries.
  let form: string | undefined;
  const formRaw = str(raw.form);
  if (formRaw) {
    const forms = knownForms();
    if (!forms.includes(formRaw.toLowerCase())) {
      return {
        ok: false,
        status: 400,
        body: { error: `Unknown form "${formRaw}".`, allowed: forms },
      };
    }
    form = formRaw;
  }

  const purity = str(raw.purity) ?? null;

  return { ok: true, input: { symbol, form, purity, quantityKg, tier } };
}

/** Shared handler: validate, run the engine, shape the response. */
function run(raw: RawParams): Response {
  const v = validate(raw);
  if (!v.ok) return json(v.body, v.status);

  const result = estimatePrice(v.input, getPriceRecords());
  // 200 even when sufficient:false — the query was valid, the honest answer is
  // "no data for this element/band". GET results are cacheable (the underlying
  // dataset only changes on a pipeline-triggered rebuild).
  return json({ query: v.input, ...result }, 200, 'public, max-age=300');
}

export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  return run({
    symbol: searchParams.get('symbol'),
    form: searchParams.get('form'),
    purity: searchParams.get('purity'),
    // accept ?quantityKg= or the shorter ?quantity=
    quantityKg: searchParams.get('quantityKg') ?? searchParams.get('quantity'),
    tier: searchParams.get('tier'),
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('body must be a JSON object');
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(
      { error: 'Invalid JSON body — expected an object of query parameters.' },
      400,
    );
  }
  return run({
    symbol: body.symbol,
    form: body.form,
    purity: body.purity,
    quantityKg: body.quantityKg ?? body.quantity,
    tier: body.tier,
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}
