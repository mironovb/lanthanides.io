/**
 * Pure parameter validation for the marketplace API:
 *  - GET /api/marketplace/listings — query validation + filter/sort/paginate
 *    (DESIGN §5.1, amended by PLAN "Schema deltas": price filtering and
 *    sorting operate on `price_from_cents`, the cheapest-variant "from"
 *    price).
 *  - POST /api/marketplace/inquiries — field validation + the honeypot check.
 *
 * Deliberately free of runtime imports (type-only imports, no fs) so the
 * whole thing is a pure function of its inputs: the routes hand in the enum
 * vocabularies / resolved-listing context, and get back either a
 * fully-resolved value or an error body — the discriminated `Validated`
 * pattern from `app/api/price-gauge/route.ts`.
 */
import type { ListingCategory, ListingSummaryDto, MaterialForm } from '@/lib/marketplace';

export const LISTING_SORTS = ['newest', 'price-asc', 'price-desc'] as const;
export type ListingsSort = (typeof LISTING_SORTS)[number];

export const INCLUDE_VALUES = ['placeholder'] as const;

export const DEFAULT_PER_PAGE = 24;
export const MAX_PER_PAGE = 100;
export const MAX_Q_LENGTH = 120;

/** Raw request values, exactly as read (`searchParams.get` yields string | null). */
export interface RawListingsParams {
  element?: unknown;
  category?: unknown;
  form?: unknown;
  min_price?: unknown;
  max_price?: unknown;
  q?: unknown;
  sort?: unknown;
  page?: unknown;
  per_page?: unknown;
  include?: unknown;
}

/** Vocabularies the route resolves against (all from `@/lib/marketplace`). */
export interface ListingsParamOptions {
  /** Canonical-case symbols actually present in listings (`getMarketplaceFacets().elements`). */
  knownSymbols: readonly string[];
  categories: readonly ListingCategory[];
  forms: readonly MaterialForm[];
}

/** The resolved query, echoed verbatim in the 200 body (hence snake_case keys). */
export interface ListingsQuery {
  element: string | null;
  category: ListingCategory | null;
  form: MaterialForm | null;
  min_price_cents: number | null;
  max_price_cents: number | null;
  q: string | null;
  sort: ListingsSort;
  page: number;
  per_page: number;
  include_placeholder: boolean;
}

export type ValidatedListingsParams =
  | { ok: true; query: ListingsQuery }
  | { ok: false; status: 400 | 404; body: Record<string, unknown> };

/** Normalise an unknown raw value: trimmed string, or undefined when absent/blank. */
function toTrimmed(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

/** Coerce + validate raw GET params into a `ListingsQuery`. First failure wins. */
export function validateListingsParams(
  raw: RawListingsParams,
  opts: ListingsParamOptions,
): ValidatedListingsParams {
  const bad = (
    body: Record<string, unknown>,
    status: 400 | 404 = 400,
  ): ValidatedListingsParams => ({ ok: false, status, body });

  // element: optional; case-insensitively resolved to the canonical symbol
  // among those actually present in listings (price-gauge's resolveSymbol
  // contract). A miss is a 404 — the element, not the filter, is unknown.
  let element: string | null = null;
  const elementRaw = toTrimmed(raw.element);
  if (elementRaw) {
    const lower = elementRaw.toLowerCase();
    element = opts.knownSymbols.find((sym) => sym.toLowerCase() === lower) ?? null;
    if (element === null) {
      return bad({ error: `Unknown element "${elementRaw}".` }, 404);
    }
  }

  // category / form / sort / include: enum params, 400 + `allowed` on a miss.
  let category: ListingCategory | null = null;
  const categoryRaw = toTrimmed(raw.category);
  if (categoryRaw) {
    const c = categoryRaw.toLowerCase();
    if (!opts.categories.includes(c as ListingCategory)) {
      return bad({ error: `Unknown category "${categoryRaw}".`, allowed: opts.categories });
    }
    category = c as ListingCategory;
  }

  let form: MaterialForm | null = null;
  const formRaw = toTrimmed(raw.form);
  if (formRaw) {
    const f = formRaw.toLowerCase();
    if (!opts.forms.includes(f as MaterialForm)) {
      return bad({ error: `Unknown form "${formRaw}".`, allowed: opts.forms });
    }
    form = f as MaterialForm;
  }

  let sort: ListingsSort = 'newest';
  const sortRaw = toTrimmed(raw.sort);
  if (sortRaw) {
    const s = sortRaw.toLowerCase();
    if (!LISTING_SORTS.includes(s as ListingsSort)) {
      return bad({ error: `Unknown sort "${sortRaw}".`, allowed: LISTING_SORTS });
    }
    sort = s as ListingsSort;
  }

  let includePlaceholder = false;
  const includeRaw = toTrimmed(raw.include);
  if (includeRaw) {
    if (includeRaw.toLowerCase() !== 'placeholder') {
      return bad({ error: `Unknown include "${includeRaw}".`, allowed: INCLUDE_VALUES });
    }
    includePlaceholder = true;
  }

  // min_price / max_price: USD decimals (e.g. 12.50) converted to integer
  // cents; the filter runs on `price_from_cents`.
  const parseUsd = (
    name: string,
    v: unknown,
  ): { ok: true; usd: number | null } | { ok: false; body: Record<string, unknown> } => {
    const s = toTrimmed(v);
    if (s === undefined) return { ok: true, usd: null };
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) {
      return {
        ok: false,
        body: { error: `Invalid ${name} "${s}". Expected a non-negative USD amount, e.g. 12.50.` },
      };
    }
    return { ok: true, usd: n };
  };

  const minParsed = parseUsd('min_price', raw.min_price);
  if (!minParsed.ok) return bad(minParsed.body);
  const maxParsed = parseUsd('max_price', raw.max_price);
  if (!maxParsed.ok) return bad(maxParsed.body);
  const minPriceCents = minParsed.usd === null ? null : Math.round(minParsed.usd * 100);
  const maxPriceCents = maxParsed.usd === null ? null : Math.round(maxParsed.usd * 100);
  if (minPriceCents !== null && maxPriceCents !== null && maxPriceCents < minPriceCents) {
    return bad({
      error: `max_price (${maxPriceCents / 100}) is below min_price (${minPriceCents / 100}).`,
    });
  }

  // q: trimmed free text, matched case-insensitively as a substring of the
  // DTO's `search_text` (built once in lib/marketplace/serialize.ts so the
  // API and the client filter island can never disagree).
  let q: string | null = null;
  const qRaw = toTrimmed(raw.q);
  if (qRaw) {
    if (qRaw.length > MAX_Q_LENGTH) {
      return bad({
        error: `Invalid q (${qRaw.length} characters). Expected at most ${MAX_Q_LENGTH} characters.`,
      });
    }
    q = qRaw;
  }

  let page = 1;
  const pageRaw = toTrimmed(raw.page);
  if (pageRaw) {
    const n = Number(pageRaw);
    if (!Number.isInteger(n) || n < 1) {
      return bad({ error: `Invalid page "${pageRaw}". Expected an integer of 1 or more.` });
    }
    page = n;
  }

  let perPage = DEFAULT_PER_PAGE;
  const perPageRaw = toTrimmed(raw.per_page);
  if (perPageRaw) {
    const n = Number(perPageRaw);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PER_PAGE) {
      return bad({
        error: `Invalid per_page "${perPageRaw}". Expected an integer between 1 and ${MAX_PER_PAGE}.`,
      });
    }
    perPage = n;
  }

  return {
    ok: true,
    query: {
      element,
      category,
      form,
      min_price_cents: minPriceCents,
      max_price_cents: maxPriceCents,
      q,
      sort,
      page,
      per_page: perPage,
      include_placeholder: includePlaceholder,
    },
  };
}

export interface ListingsPage {
  pagination: { page: number; per_page: number; total: number; total_pages: number };
  results: ListingSummaryDto[];
}

/**
 * Filter → sort → paginate, pure over serialised summaries. `all` must be in
 * `getListings()` order (updated_at desc, listed_on desc, slug asc) — which IS
 * the `newest` sort; the price sorts re-order on `price_from_cents` with a
 * slug-asc tiebreak so output is deterministic across builds. All filters AND
 * together; an empty result set is a valid answer (200 with `[]`), never an
 * error. A page past the end simply yields an empty slice.
 */
export function applyListingsQuery(
  all: readonly ListingSummaryDto[],
  query: ListingsQuery,
): ListingsPage {
  const qLower = query.q === null ? null : query.q.toLowerCase();
  const filtered = all.filter((dto) => {
    if (!query.include_placeholder && dto.status === 'placeholder') return false;
    if (query.element !== null && !dto.elements.includes(query.element)) return false;
    if (query.category !== null && dto.category !== query.category) return false;
    if (query.form !== null && dto.form !== query.form) return false;
    if (query.min_price_cents !== null && dto.price_from_cents < query.min_price_cents) return false;
    if (query.max_price_cents !== null && dto.price_from_cents > query.max_price_cents) return false;
    if (qLower !== null && !dto.search_text.includes(qLower)) return false;
    return true;
  });

  const bySlugAsc = (a: ListingSummaryDto, b: ListingSummaryDto): number =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  // `filtered` is a fresh array, so in-place sorting never mutates `all`.
  if (query.sort === 'price-asc') {
    filtered.sort((a, b) => a.price_from_cents - b.price_from_cents || bySlugAsc(a, b));
  } else if (query.sort === 'price-desc') {
    filtered.sort((a, b) => b.price_from_cents - a.price_from_cents || bySlugAsc(a, b));
  }

  const total = filtered.length;
  const start = (query.page - 1) * query.per_page;
  return {
    pagination: {
      page: query.page,
      per_page: query.per_page,
      total,
      total_pages: Math.ceil(total / query.per_page),
    },
    results: filtered.slice(start, start + query.per_page),
  };
}

// ── Inquiries (POST /api/marketplace/inquiries) ──────────────────────────────

export const INQUIRY_NAME_MAX = 120;
export const INQUIRY_EMAIL_MAX = 254;
export const INQUIRY_COUNTRY_MAX = 80;
export const INQUIRY_MESSAGE_MAX = 2000;

/** Raw inquiry fields as read from a JSON or form-encoded body. */
export interface RawInquiryFields {
  listing_slug?: unknown;
  seller_handle?: unknown;
  size_label?: unknown;
  name?: unknown;
  email?: unknown;
  country?: unknown;
  message?: unknown;
  /** Honeypot — hidden from humans; any value marks the submission as spam. */
  website?: unknown;
}

/** Honeypot check (contributions-route precedent): non-empty ⇒ spam. */
export function isInquirySpam(raw: RawInquiryFields): boolean {
  return toTrimmed(raw.website) !== undefined;
}

/** The validated, trimmed inquiry — exactly what the route logs (snake_case). */
export interface InquiryFields {
  listing_slug: string;
  seller_handle: string;
  size_label: string | null;
  name: string;
  email: string;
  country: string | null;
  message: string | null;
}

export type ValidatedInquiry =
  | { ok: true; fields: InquiryFields }
  | { ok: false; errors: Record<string, string> };

/** The resolved-listing context the route passes in (it owns the 404 on an unknown slug). */
export interface InquiryListingContext {
  slug: string;
  sellerHandle: string;
  /** Verbatim variant labels (e.g. "25 g", "325 g (as pictured)"). */
  variantLabels: readonly string[];
}

/**
 * Validate inquiry fields against the resolved listing. Pure. Unlike the
 * listings validator, field errors are COLLECTED rather than first-fail: the
 * `{ errors: { field: message } }` map drives per-field form feedback
 * (contributions-route precedent).
 */
export function validateInquiryFields(
  raw: RawInquiryFields,
  listing: InquiryListingContext,
): ValidatedInquiry {
  const errors: Record<string, string> = {};

  const sellerHandle = toTrimmed(raw.seller_handle);
  if (sellerHandle === undefined) {
    errors.seller_handle = 'Required.';
  } else if (sellerHandle !== listing.sellerHandle) {
    errors.seller_handle = "Does not match the listing's seller.";
  }

  let sizeLabel: string | null = null;
  const sizeRaw = toTrimmed(raw.size_label);
  if (sizeRaw !== undefined) {
    if (!listing.variantLabels.includes(sizeRaw)) {
      errors.size_label = `Unknown size "${sizeRaw}" for this listing.`;
    } else {
      sizeLabel = sizeRaw;
    }
  }

  const name = toTrimmed(raw.name);
  if (name === undefined) {
    errors.name = 'Required.';
  } else if (name.length > INQUIRY_NAME_MAX) {
    errors.name = `Too long (${name.length} characters). Expected at most ${INQUIRY_NAME_MAX}.`;
  }

  // Syntactic only, by design: exactly one "@" with non-empty sides, no
  // whitespace, ≤254 characters. No deliverability claims.
  const email = toTrimmed(raw.email);
  if (email === undefined) {
    errors.email = 'Required.';
  } else if (
    email.length > INQUIRY_EMAIL_MAX ||
    /\s/.test(email) ||
    email.split('@').length !== 2 ||
    email.startsWith('@') ||
    email.endsWith('@')
  ) {
    errors.email = 'Enter a valid email address.';
  }

  const country = toTrimmed(raw.country) ?? null;
  if (country !== null && country.length > INQUIRY_COUNTRY_MAX) {
    errors.country = `Too long (${country.length} characters). Expected at most ${INQUIRY_COUNTRY_MAX}.`;
  }

  const message = toTrimmed(raw.message) ?? null;
  if (message !== null && message.length > INQUIRY_MESSAGE_MAX) {
    errors.message = `Too long (${message.length} characters). Expected at most ${INQUIRY_MESSAGE_MAX}.`;
  }

  // The undefined re-checks are redundant at runtime (each already recorded an
  // error) but give TypeScript the narrowing for the success arm.
  if (Object.keys(errors).length > 0 || name === undefined || email === undefined) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    fields: {
      listing_slug: listing.slug,
      seller_handle: listing.sellerHandle,
      size_label: sizeLabel,
      name,
      email,
      country,
      message,
    },
  };
}
