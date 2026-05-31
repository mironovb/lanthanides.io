/**
 * Seller-listing — pure, framework-agnostic helpers shared by the client form
 * (SellForm.tsx) and the server write path (app/api/listings/route.ts). Nothing
 * here does I/O or imports the server-only data layer, so it is safe in the
 * client bundle: the page reads `_data/` and hands the catalog down; the API
 * route validates the same way it does, so the two never disagree on what counts
 * as a valid submission.
 *
 * It never fabricates a price (CLAUDE.md hard rule #1) — it only validates and
 * echoes the seller's own inputs; the dataset-derived gauge is produced by the
 * engine (`lib/price-gauge` → `estimatePrice`) on the server.
 */
import type { PriceGaugeResult } from '@/lib/price-gauge';

// ── Currencies ────────────────────────────────────────────────────────────────
// The seller may quote in their own currency, but the sourced dataset (and thus
// the gauge) is normalized to USD/kg. We never apply a live exchange rate (no
// paid FX service — hard rule #3; inventing a rate would violate hard rule #1),
// so the asking-price-vs-range comparison is only computed for USD quotes; other
// currencies are stored and shown verbatim, with the gauge clearly USD-denominated.
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const GAUGE_CURRENCY: Currency = 'USD';

// ── Bounds (reject absurd / abusive values; keep DB rows sane) ─────────────────
export const LIMITS = {
  quantityKg: { min: 0, max: 10_000_000 }, // up to 10 kt — generous, finite
  pricePerKg: { min: 0, max: 100_000_000 },
  sellerName: 120,
  purity: 60,
  contact: 200,
  notes: 2000,
} as const;

// ── Field model ───────────────────────────────────────────────────────────────

/** Raw string-keyed form/body values (everything arrives as strings or unknown). */
export interface ListingValues {
  symbol: string;
  form: string;
  purity: string;
  quantityKg: string;
  askingPricePerKg: string;
  currency: string;
  sellerName: string;
  sellerContact: string;
  notes: string;
}

export type ListingField = keyof ListingValues;

export const EMPTY_LISTING_VALUES: ListingValues = {
  symbol: '',
  form: '',
  purity: '',
  quantityKg: '',
  askingPricePerKg: '',
  currency: GAUGE_CURRENCY,
  sellerName: '',
  sellerContact: '',
  notes: '',
};

/** A validated, ready-to-persist submission (numbers coerced, optionals nulled). */
export interface ListingClean {
  elementSymbol: string;
  form: string;
  purity: string;
  quantityKg: number;
  askingPricePerKg: number;
  currency: Currency;
  sellerName: string;
  sellerContact: string | null;
  notes: string | null;
}

export interface ListingValidation {
  /** Normalised echo of the inputs, for re-populating the form. */
  values: ListingValues;
  /** Per-field messages, shown inline; empty when the submission is valid. */
  fieldErrors: Partial<Record<ListingField, string>>;
  /** The clean submission, or null when any field failed. */
  clean: ListingClean | null;
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/**
 * Validate + coerce a raw submission against the catalog. Symbol resolves
 * case-insensitively to its canonical form; form must be one the dataset carries;
 * quantity and asking price must be finite and positive within bounds. Mirrors
 * the guarantees the gauge tool applies, so a listing can always be gauged.
 */
export function validateListing(
  raw: Partial<Record<ListingField, unknown>>,
  ctx: { symbols: string[]; forms: string[] },
): ListingValidation {
  const symbolRaw = str(raw.symbol);
  const formRaw = str(raw.form).toLowerCase();
  const purity = str(raw.purity);
  const quantityRaw = str(raw.quantityKg);
  const priceRaw = str(raw.askingPricePerKg);
  const currencyRaw = str(raw.currency) || GAUGE_CURRENCY;
  const sellerName = str(raw.sellerName);
  const sellerContact = str(raw.sellerContact);
  const notes = str(raw.notes);

  const fieldErrors: Partial<Record<ListingField, string>> = {};

  // element — required; resolve case-insensitively to the canonical catalog symbol.
  const symbol =
    ctx.symbols.find((s) => s === symbolRaw) ??
    ctx.symbols.find((s) => s.toLowerCase() === symbolRaw.toLowerCase()) ??
    null;
  if (!symbolRaw) fieldErrors.symbol = 'Select the element you’re listing.';
  else if (!symbol) fieldErrors.symbol = `“${symbolRaw}” isn’t a tracked element.`;

  // form — required; must be a form the dataset actually holds prices for.
  let form: string | null = null;
  if (!formRaw) fieldErrors.form = 'Choose the material form.';
  else if (!ctx.forms.includes(formRaw))
    fieldErrors.form = `“${formRaw}” isn’t a form we hold prices for.`;
  else form = formRaw;

  // purity — required (the schema stores it non-null; it also drives the gauge).
  if (!purity) fieldErrors.purity = 'State the purity (e.g. 99.9%).';
  else if (purity.length > LIMITS.purity)
    fieldErrors.purity = `Keep purity under ${LIMITS.purity} characters.`;

  // quantity (kg) — required, positive, finite, bounded.
  const quantityKg = Number(quantityRaw);
  if (!quantityRaw) fieldErrors.quantityKg = 'Enter the quantity in kilograms.';
  else if (!Number.isFinite(quantityKg) || quantityKg <= LIMITS.quantityKg.min)
    fieldErrors.quantityKg = 'Quantity must be a number greater than zero.';
  else if (quantityKg > LIMITS.quantityKg.max)
    fieldErrors.quantityKg = `That quantity looks too large — max ${LIMITS.quantityKg.max.toLocaleString('en-US')} kg.`;

  // asking price per kg — required, positive, finite, bounded.
  const askingPricePerKg = Number(priceRaw);
  if (!priceRaw)
    fieldErrors.askingPricePerKg = 'Enter your asking price per kilogram.';
  else if (
    !Number.isFinite(askingPricePerKg) ||
    askingPricePerKg <= LIMITS.pricePerKg.min
  )
    fieldErrors.askingPricePerKg =
      'Asking price must be a number greater than zero.';
  else if (askingPricePerKg > LIMITS.pricePerKg.max)
    fieldErrors.askingPricePerKg = 'That price looks out of range — check the value.';

  // currency — must be one we recognise.
  const currency = (CURRENCIES as readonly string[]).includes(currencyRaw)
    ? (currencyRaw as Currency)
    : null;
  if (!currency) fieldErrors.currency = 'Choose a supported currency.';

  // seller name — required, length-capped.
  if (!sellerName) fieldErrors.sellerName = 'Tell buyers who is listing this.';
  else if (sellerName.length > LIMITS.sellerName)
    fieldErrors.sellerName = `Keep the name under ${LIMITS.sellerName} characters.`;

  // contact / notes — optional, length-capped only.
  if (sellerContact && sellerContact.length > LIMITS.contact)
    fieldErrors.sellerContact = `Keep contact under ${LIMITS.contact} characters.`;
  if (notes && notes.length > LIMITS.notes)
    fieldErrors.notes = `Keep notes under ${LIMITS.notes} characters.`;

  const values: ListingValues = {
    symbol: symbol ?? symbolRaw,
    form: form ?? (formRaw || ''),
    purity,
    quantityKg: quantityRaw,
    askingPricePerKg: priceRaw,
    currency: currency ?? currencyRaw,
    sellerName,
    sellerContact,
    notes,
  };

  const clean: ListingClean | null =
    Object.keys(fieldErrors).length === 0 &&
    symbol &&
    form &&
    currency
      ? {
          elementSymbol: symbol,
          form,
          purity,
          quantityKg,
          askingPricePerKg,
          currency,
          sellerName,
          sellerContact: sellerContact || null,
          notes: notes || null,
        }
      : null;

  return { values, fieldErrors, clean };
}

// ── Asking-price positioning against the gauge range ──────────────────────────

export type PricePosition = 'below' | 'in' | 'above';

export interface AskingAssessment {
  position: PricePosition;
  /** (asking − mid) ÷ mid, signed; null when mid is 0 (avoid divide-by-zero). */
  deltaVsMid: number | null;
}

/**
 * Where the asking price sits relative to the sourced low/mid/high band:
 * `below` (under the P25), `in` (within [P25, P75]), or `above` (over the P75).
 * Pure arithmetic over numbers already computed by the engine — it asserts
 * nothing the data doesn't show.
 */
export function positionAskingPrice(
  asking: number,
  low: number,
  mid: number,
  high: number,
): AskingAssessment {
  const position: PricePosition =
    asking < low ? 'below' : asking > high ? 'above' : 'in';
  const deltaVsMid = mid > 0 ? (asking - mid) / mid : null;
  return { position, deltaVsMid };
}

// ── API response shape (POST /api/listings) — shared client/server contract ────

/** The public projection of a stored listing (never carries private contact). */
export interface ListingDTO {
  id: string;
  createdAt: string;
  elementSymbol: string;
  form: string;
  purity: string;
  quantityKg: number;
  askingPricePerKg: number;
  currency: string;
  sellerName: string;
  /** Whether a private contact was supplied — the value itself is never returned. */
  hasContact: boolean;
  notes: string | null;
  status: string;
  gaugeLow: number | null;
  gaugeMid: number | null;
  gaugeHigh: number | null;
  gaugeConfidence: string | null;
}

export interface CreateListingResponse {
  ok: true;
  listing: ListingDTO;
  /** Full engine result captured at submission time. */
  gauge: PriceGaugeResult;
  /** Asking-price positioning vs the band — null when not comparable (see below). */
  assessment: AskingAssessment | null;
  /** Why `assessment` is null, when it is (insufficient data, or non-USD quote). */
  assessmentNote: string | null;
}

/**
 * Structural shape of a stored listing row — matches the Prisma `Listing` model
 * without importing `@prisma/client` (keeps this module client-safe). Both the
 * API route and the /sell page map rows through `toListingDTO`, so the public
 * projection is defined in exactly one place.
 */
export interface ListingRow {
  id: string;
  createdAt: Date | string;
  elementSymbol: string;
  form: string;
  purity: string;
  quantityKg: number;
  askingPricePerKg: number;
  currency: string;
  sellerName: string;
  sellerContact: string | null;
  notes: string | null;
  status: string;
  gaugeLow: number | null;
  gaugeMid: number | null;
  gaugeHigh: number | null;
  gaugeConfidence: string | null;
}

/** Project a stored row to the public DTO — drops the private `sellerContact`. */
export function toListingDTO(l: ListingRow): ListingDTO {
  return {
    id: l.id,
    createdAt:
      typeof l.createdAt === 'string' ? l.createdAt : l.createdAt.toISOString(),
    elementSymbol: l.elementSymbol,
    form: l.form,
    purity: l.purity,
    quantityKg: l.quantityKg,
    askingPricePerKg: l.askingPricePerKg,
    currency: l.currency,
    sellerName: l.sellerName,
    hasContact: !!l.sellerContact,
    notes: l.notes,
    status: l.status,
    gaugeLow: l.gaugeLow,
    gaugeMid: l.gaugeMid,
    gaugeHigh: l.gaugeHigh,
    gaugeConfidence: l.gaugeConfidence,
  };
}
