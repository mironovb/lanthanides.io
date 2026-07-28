/**
 * Pure marketplace display helpers, shared by the client filter island and the
 * server pages. NO `fs`, NO `lib/marketplace` runtime imports — only type-only
 * imports plus `lib/format` (pure), so this module is safe on both sides of
 * the client boundary (the `RegulatoryView` arrangement).
 *
 * Money and mass rules: variant prices are integer USD cents, per-gram figures
 * are cents already rounded at the serialisation boundary. Everything renders
 * through `lib/format`'s USD helpers or the two cents-aware wrappers below —
 * never ad-hoc string maths in a component.
 */
import type {
  ListingCategory,
  MaterialForm,
  ProvenanceSourceType,
  VerificationStatus,
} from '@/lib/marketplace/types';
import type {
  ListingSummaryDto,
  ProvenanceSummaryDto,
} from '@/lib/marketplace/serialize';
import type { ElementCategory } from '@/lib/types';
import { fmtUsdPrice } from '@/lib/format';

// ── Label bags (from _marketplace/settings.yml, passed as plain props) ───────

export interface MarketplaceLabels {
  categories: Record<ListingCategory, string>;
  forms: Record<MaterialForm, string>;
  sourceTypes: Record<ProvenanceSourceType, string>;
  verification: Record<VerificationStatus, string>;
}

/**
 * Element symbol → the site catalog's category (= the Badge variant). Built on
 * the server from `getElements()` and passed down as a plain object; symbols
 * outside the 31-element catalog are simply absent (→ neutral Badge).
 */
export type ElementVariantMap = Record<string, ElementCategory>;

// ── Formatting ───────────────────────────────────────────────────────────────

/** Integer USD cents → "$1,234.5" (via the house `fmtUsdPrice`). */
export function fmtCents(cents: number): string {
  return fmtUsdPrice(cents / 100);
}

/**
 * Per-gram cents → "$X.XX" at 2 dp; falls back to 4 dp rather than showing a
 * true non-zero value as "$0.00" (hard rule #1: never render a lying zero).
 */
export function fmtPerGram(cents: number): string {
  const dollars = cents / 100;
  const twoDp = dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (twoDp === '0.00' && dollars > 0) return `$${dollars.toFixed(4)}`;
  return `$${twoDp}`;
}

/** Grams → "900 g" / "4.4 kg" (kg from 1000 g up, ≤2 decimals, no trailing zeros). */
export function fmtMass(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} kg`;
  }
  return `${grams.toLocaleString('en-US', { maximumFractionDigits: 2 })} g`;
}

/** "1 g – 900 g", collapsing to a single value when min === max. */
export function fmtMassRange(minG: number, maxG: number): string {
  return minG === maxG ? fmtMass(minG) : `${fmtMass(minG)} – ${fmtMass(maxG)}`;
}

// ── Provenance display ───────────────────────────────────────────────────────

/** The only origin present in the seed catalog; unknown codes render as the bare code. */
const COUNTRY_NAMES: Record<string, string> = {
  KZ: 'Kazakhstan',
};

/** ISO-2 code → "Kazakhstan (KZ)"; unknown code → the code itself; null → "Not stated". */
export function countryDisplay(code: string | null): string {
  if (code === null) return 'Not stated';
  const name = COUNTRY_NAMES[code];
  return name ? `${name} (${code})` : code;
}

/** Card one-liner: "Private Collection · KZ", or "Origin not stated" when no country. */
export function provenanceLine(
  summary: ProvenanceSummaryDto,
  sourceTypes: MarketplaceLabels['sourceTypes'],
): string {
  const sourceLabel = sourceTypes[summary.source_type];
  return summary.country === null
    ? 'Origin not stated'
    : `${sourceLabel} · ${summary.country}`;
}

export function isVerificationPending(dto: ListingSummaryDto): boolean {
  return dto.data_quality_flags.includes('verification_pending');
}

// ── Sorting (the same semantics the listings API uses) ───────────────────────

export type MarketplaceSort = 'newest' | 'price-asc' | 'price-desc';

export const SORT_OPTIONS: ReadonlyArray<{ value: MarketplaceSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

/** Deterministic: price sorts on `price_from_cents`, ties break on slug. */
export function compareListings(
  sort: MarketplaceSort,
  a: ListingSummaryDto,
  b: ListingSummaryDto,
): number {
  if (sort === 'price-asc' || sort === 'price-desc') {
    const d = a.price_from_cents - b.price_from_cents;
    if (d !== 0) return sort === 'price-asc' ? d : -d;
    return a.slug.localeCompare(b.slug);
  }
  // newest: updated_at desc, listed_on desc, slug asc (the loader's own order).
  if (a.updated_at !== b.updated_at) return a.updated_at < b.updated_at ? 1 : -1;
  if (a.listed_on !== b.listed_on) return a.listed_on < b.listed_on ? 1 : -1;
  return a.slug.localeCompare(b.slug);
}

/** "" or invalid → null; otherwise whole USD cents (matching the API's Math.round(v*100)). */
export function parseUsdToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
