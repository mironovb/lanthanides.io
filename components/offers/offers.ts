/**
 * Offer-feed: pure, framework-agnostic helpers shared by the server page
 * (app/offers/page.tsx) and the client filter/sort island (OffersFeed.tsx).
 * Nothing here does I/O or imports the server-only data/screening layers, so it
 * is safe in the client bundle: the page reads the seeded rows + catalog and
 * hands the projected `OfferDTO[]` down; the island filters and sorts them.
 *
 * It never fabricates data (CLAUDE.md hard rule #1): every field is the row's own
 * value (or an honest "n/a" gap), and the value band / confidence band are coarse
 * labels OVER the numbers the seed already computed; the precise numbers stay
 * visible and sortable, so nothing is hidden behind a bucket.
 */
import type {
  Confidence,
  ElementCategory,
  ExportControlStatus,
  RegulatoryStatus,
} from '@/lib/types';
import { capitalize, humanize } from '@/lib/format';

// ── The public projection of one screened offer (what the feed renders) ───────

/**
 * Structural shape of a screened-offer row. It mirrors `RankedOffer` (lib/screening)
 * / the Prisma `ScreenedOffer` model WITHOUT importing either (keeps this module
 * client-safe). The page maps rows through `toOfferDTO`, enriching with element
 * metadata, so the display projection is defined in exactly one place.
 */
export interface OfferRow {
  id: string;
  elementSymbol: string;
  form: string;
  purity: string | null;
  quantityKg: number | null;
  pricePerKg: number;
  currency: string;
  sellerName: string;
  sellerCountry: string | null;
  sourceType: string;
  sourceUrl: string | null;
  observedDate: string; // ISO 'YYYY-MM-DD'
  confidence: number; // 0..1
  valueScore: number;
  origin: string; // 'seed' | 'screened'
}

/** Reference annotation joined onto each offer from the catalog/data layer. */
export interface ElementMeta {
  name: string;
  category: ElementCategory;
  categoryLabel: string;
  exportControl: ExportControlStatus;
  regulatory: RegulatoryStatus;
}

export interface OfferDTO {
  id: string;
  elementSymbol: string;
  elementName: string;
  category: ElementCategory;
  categoryLabel: string;
  /** China export-control posture of the element (annotation + context). */
  exportControl: ExportControlStatus;
  /** Current regulatory state of the element. */
  regulatory: RegulatoryStatus;
  form: string;
  purity: string | null;
  quantityKg: number | null;
  pricePerKg: number;
  currency: string;
  sellerName: string;
  sellerCountry: string | null;
  sourceType: string;
  sourceTypeLabel: string;
  sourceUrl: string | null;
  observedDate: string;
  confidence: number; // 0..1 (sortable truth)
  confidenceBand: Confidence; // low | medium | high
  valueScore: number; // signed favourability (sortable truth)
  origin: string; // 'seed' | 'screened'
}

/** Snake_case source_type → a readable label ('distributor_offer' → 'Distributor offer'). */
export function sourceTypeLabel(sourceType: string): string {
  return capitalize(humanize(sourceType));
}

/**
 * Confidence band from methodology #verification-and-confidence (high ≥ 0.80,
 * medium ≥ 0.50, else low): the same thresholds the per-record ProvenanceBadge
 * uses, so a confidence reads identically everywhere on the site.
 */
export function confidenceBand(score: number): Confidence {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

// ── Value band: a coarse, honest label over the continuous valueScore ────────
// valueScore = clamp((sameFormMedian − price) / median, −1, 1) × confidence
// (prisma/seed.ts). Positive ⇒ below the element's same-form median (favourable).
// The band is presentation only; the signed number stays visible + sortable.

export type ValueBandKey = 'below' | 'near' | 'above';

/** Magnitude under this is "near the median", neither a clear discount nor premium. */
export const VALUE_NEAR_THRESHOLD = 0.1;

export interface ValueBand {
  key: ValueBandKey;
  label: string;
  /** One-line meaning for a tooltip / caption. */
  hint: string;
}

const VALUE_BANDS: Record<ValueBandKey, ValueBand> = {
  below: {
    key: 'below',
    label: 'Below median',
    hint: 'Priced below the element’s same-form median, a discount, scaled by source confidence.',
  },
  near: {
    key: 'near',
    label: 'Near median',
    hint: 'Within range of the element’s same-form median.',
  },
  above: {
    key: 'above',
    label: 'Above median',
    hint: 'Priced above the element’s same-form median, a premium.',
  },
};

export function valueBand(score: number): ValueBand {
  if (score >= VALUE_NEAR_THRESHOLD) return VALUE_BANDS.below;
  if (score <= -VALUE_NEAR_THRESHOLD) return VALUE_BANDS.above;
  return VALUE_BANDS.near;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

/** Project a screened-offer row to the feed DTO, enriched with element metadata. */
export function toOfferDTO(row: OfferRow, meta: ElementMeta | undefined): OfferDTO {
  return {
    id: row.id,
    elementSymbol: row.elementSymbol,
    elementName: meta?.name ?? row.elementSymbol,
    category: meta?.category ?? 'strategic_metal',
    categoryLabel: meta?.categoryLabel ?? 'n/a',
    exportControl: meta?.exportControl ?? 'normal',
    regulatory: meta?.regulatory ?? 'none',
    form: row.form,
    purity: row.purity,
    quantityKg: row.quantityKg,
    pricePerKg: row.pricePerKg,
    currency: row.currency,
    sellerName: row.sellerName,
    sellerCountry: row.sellerCountry,
    sourceType: row.sourceType,
    sourceTypeLabel: sourceTypeLabel(row.sourceType),
    sourceUrl: row.sourceUrl,
    observedDate: row.observedDate,
    confidence: row.confidence,
    confidenceBand: confidenceBand(row.confidence),
    valueScore: row.valueScore,
    origin: row.origin,
  };
}

// ── Filtering (client-side, AND across dimensions) ────────────────────────────

export interface OfferFilters {
  element: string | null; // element symbol
  category: ElementCategory | null;
  form: string | null;
  sourceType: string | null;
  /** When true, drop low-confidence offers (keep medium + high). */
  mediumPlusOnly: boolean;
}

export const EMPTY_FILTERS: OfferFilters = {
  element: null,
  category: null,
  form: null,
  sourceType: null,
  mediumPlusOnly: false,
};

export function filterOffers(offers: OfferDTO[], f: OfferFilters): OfferDTO[] {
  return offers.filter((o) => {
    if (f.element && o.elementSymbol !== f.element) return false;
    if (f.category && o.category !== f.category) return false;
    if (f.form && o.form !== f.form) return false;
    if (f.sourceType && o.sourceType !== f.sourceType) return false;
    if (f.mediumPlusOnly && o.confidenceBand === 'low') return false;
    return true;
  });
}

// ── Filter option builders (distinct values present in the data) ──────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface OfferFilterOptions {
  elements: SelectOption[]; // value = symbol, label = "Sym · Name"
  categories: { value: ElementCategory; label: string }[];
  forms: SelectOption[];
  sourceTypes: SelectOption[];
}

/** Distinct, sorted filter options derived from the rows themselves. */
export function buildOfferFilterOptions(offers: OfferDTO[]): OfferFilterOptions {
  const elements = new Map<string, string>();
  const categories = new Map<ElementCategory, string>();
  const forms = new Set<string>();
  const sourceTypes = new Map<string, string>();

  for (const o of offers) {
    elements.set(o.elementSymbol, `${o.elementSymbol} · ${o.elementName}`);
    categories.set(o.category, o.categoryLabel);
    forms.add(o.form);
    sourceTypes.set(o.sourceType, o.sourceTypeLabel);
  }

  return {
    elements: [...elements.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    categories: [...categories.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    forms: [...forms]
      .sort()
      .map((value) => ({ value, label: capitalize(value) })),
    sourceTypes: [...sourceTypes.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
