/**
 * camelCase TS → snake_case DTOs: the ONE outbound mapping table (DESIGN §2:
 * files and API JSON are snake_case, TypeScript is camelCase; `load.ts` maps
 * in, this file maps out, nowhere else). Every builder returns a plain,
 * JSON-safe object emitted verbatim by the API routes and passed as props to
 * client islands.
 *
 * Pure: no `fs`, no imports beyond `./types`, so these helpers (and the DTO
 * interfaces) are safe to import from Client Components, the client filter
 * island consumes `ListingSummaryDto[]` exactly as `RegulatoryView` consumes
 * its serialised props.
 *
 * Per-gram figures are stored unrounded and rounded to 1 decimal place of a
 * cent HERE, at the serialisation boundary, and nowhere upstream.
 */
import type {
  CatalogAverageCell,
  CatalogAverageHint,
  Confidence,
  DataQualityFlag,
  DocumentKind,
  ISODate,
  LedgerComparison,
  LedgerZone,
  Listing,
  ListingCategory,
  ListingCondition,
  ListingShape,
  ListingStatus,
  MatchMode,
  MaterialForm,
  ProvenanceSourceType,
  Seller,
  SpecRow,
  VerificationStatus,
} from './types';
import { LISTING_CATEGORIES } from './types';

/**
 * The DESIGN §4.7 required adjacent disclosure, verbatim (PLAN: "the §4.7
 * disclaimer verbatim"). Ships with every serialised catalog-average figure so
 * a consumer who reads only the JSON cannot mistake a seller-catalog statistic
 * for a market price or for the site's sourced reference prices.
 */
export const CATALOG_AVERAGE_DISCLAIMER =
  "Averaged across this seller's own listings for this element and form. It is a catalog statistic, not a market price, and not the site's sourced reference prices; those are industrial quotes in USD/kg and are not comparable.";

/** Photos are the seller's, never CC-BY, unlike the structural fields (DESIGN §5). */
export const IMAGE_LICENSE = 'All rights reserved by the seller';

/**
 * Honest labeling for the owner-directed ledger comparison, baked into every
 * serialised comparison object so no consumer can render the zoning without
 * its basis.
 */
export const LEDGER_COMPARISON_BASIS_NOTE =
  "Positioned against the site's sourced reference ledger (retail tier) via the price-gauge engine, at the listing's median pack size.";

/** Round to 1 decimal place of a cent (per-gram figures only). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Round to 2 decimal places (USD-per-kg figures). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Listing summary ──────────────────────────────────────────────────────────

export interface ListingImageSummaryDto {
  path: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProvenanceSummaryDto {
  source_type: ProvenanceSourceType;
  country: string | null;
  verification_status: VerificationStatus;
  document_count: number;
}

/**
 * Compact ledger positioning for cards/grids (owner-directed feature; the
 * DESIGN §4.3 ban is overruled for this surface by owner instruction).
 */
export interface LedgerComparisonSummaryDto {
  zone: LedgerZone;
  /** Rounded to 1 decimal place. */
  delta_vs_mid_pct: number;
  /** Rounded to 2 decimal places (USD per kg). */
  ledger_mid_usd_per_kg: number;
  confidence: Confidence;
}

/** Full ledger positioning for the detail page and API. */
export interface LedgerComparisonDto extends LedgerComparisonSummaryDto {
  element_symbol: string;
  form: 'metal' | 'oxide';
  quantity_kg_basis: number;
  variant_label_basis: string;
  /** Rounded to 2 decimal places (USD per kg). */
  listing_per_kg_usd: number;
  ledger_low_usd_per_kg: number;
  ledger_high_usd_per_kg: number;
  matched_records: number;
  match_mode: MatchMode;
  /** Always `LEDGER_COMPARISON_BASIS_NOTE`, the disclosure travels with the figure. */
  basis_note: string;
}

export interface ListingSummaryDto {
  slug: string;
  url: string;
  title: string;
  summary: string;
  status: ListingStatus;
  category: ListingCategory;
  form: MaterialForm | null;
  shape: ListingShape | null;
  primary_element: string | null;
  elements: string[];
  catalog_elements: string[];
  purity_pct: number | null;
  price_from_cents: number;
  mass_min_g: number;
  mass_max_g: number;
  variant_count: number;
  currency: 'USD';
  seller_handle: string;
  listed_on: ISODate;
  updated_at: ISODate;
  primary_image: ListingImageSummaryDto;
  provenance_summary: ProvenanceSummaryDto;
  /** Null when ineligible/insufficient, or when the caller did not compute one. */
  ledger_comparison: LedgerComparisonSummaryDto | null;
  data_quality_flags: DataQualityFlag[];
  /**
   * Lowercased haystack for free-text `q` filtering: title + summary +
   * elements + shape + form + category + spec labels/values. Built once here
   * so the API route and the client filter island match against the exact
   * same text and can never disagree.
   */
  search_text: string;
}

function buildSearchText(listing: Listing): string {
  const parts: string[] = [listing.title, listing.summary, ...listing.elements];
  if (listing.shape !== null) parts.push(listing.shape);
  if (listing.form !== null) parts.push(listing.form);
  parts.push(listing.category);
  for (const spec of listing.specs) parts.push(spec.label, spec.value);
  return parts.join(' ').toLowerCase();
}

/**
 * `ledgerComparison` is threaded in (not computed here) so this module stays
 * fs-free and client-island-safe: pass `getLedgerComparisonForListing(listing)`
 * from server callers, or omit it to serialise `ledger_comparison: null`.
 */
export function toListingSummaryDto(
  listing: Listing,
  ledgerComparison?: LedgerComparison | null,
): ListingSummaryDto {
  return {
    slug: listing.slug,
    url: listing.url,
    title: listing.title,
    summary: listing.summary,
    status: listing.status,
    category: listing.category,
    form: listing.form,
    shape: listing.shape,
    primary_element: listing.primaryElement,
    elements: listing.elements,
    catalog_elements: listing.catalogElements,
    purity_pct: listing.purityPct,
    price_from_cents: listing.priceFromCents,
    mass_min_g: listing.massMinG,
    mass_max_g: listing.massMaxG,
    variant_count: listing.variants.length,
    currency: listing.currency,
    seller_handle: listing.sellerHandle,
    listed_on: listing.listedOn,
    updated_at: listing.updatedAt,
    primary_image: {
      path: listing.primaryImage.path,
      alt: listing.primaryImage.alt,
      width: listing.primaryImage.width,
      height: listing.primaryImage.height,
    },
    provenance_summary: {
      source_type: listing.provenance.sourceType,
      country: listing.provenance.country,
      verification_status: listing.provenance.verificationStatus,
      document_count: listing.provenance.documents?.length ?? 0,
    },
    ledger_comparison: ledgerComparison
      ? {
          zone: ledgerComparison.zone,
          delta_vs_mid_pct: round1(ledgerComparison.deltaVsMidPct),
          ledger_mid_usd_per_kg: round2(ledgerComparison.ledgerMid),
          confidence: ledgerComparison.confidence,
        }
      : null,
    data_quality_flags: listing.dataQualityFlags,
    search_text: buildSearchText(listing),
  };
}

// ── Listing detail ───────────────────────────────────────────────────────────

export interface ListingVariantDto {
  legacy_sku: string;
  label: string;
  mass_g: number;
  price_usd_cents: number;
  /** Rounded to 1 decimal place of a cent at this boundary. */
  price_per_gram_cents: number;
  note: string | null;
}

export interface ListingImageDto extends ListingImageSummaryDto {
  is_primary: boolean;
  sort_order: number;
  caption: string | null;
}

export interface SpecRowDto {
  label: string;
  value: string;
  unit: string | null;
}

export interface ProvenanceStepDto {
  step: number;
  actor: string;
  date: string | null;
  note: string | null;
}

export interface ProvenanceDocumentDto {
  kind: DocumentKind;
  label: string;
  path: string | null;
  url: string | null;
  issued_on: ISODate | null;
}

export interface ProvenanceDto {
  source_type: ProvenanceSourceType;
  source_name: string | null;
  country: string | null;
  region: string | null;
  acquired_on: string | null;
  verification_status: VerificationStatus;
  declared_by: string;
  chain: ProvenanceStepDto[] | null;
  documents: ProvenanceDocumentDto[] | null;
  notes: string | null;
}

export interface SellerCardDto {
  handle: string;
  display_name: string;
  country: string;
  verified: boolean;
  member_since: ISODate;
  url: string;
}

export interface CatalogAverageComparisonDto {
  basis: 'seller_catalog';
  element_symbol: string;
  form: MaterialForm;
  median_per_gram_cents: number;
  avg_per_gram_cents: number;
  sample_size: number;
  listing_count: number;
  /** Always true: the cell was recomputed without this listing (DESIGN §4.5). */
  leave_one_out: true;
  /** Whether enough OTHER listings exist for a comparison to render. */
  sufficient: boolean;
  disclaimer: string;
}

export interface ListingDetailDto extends ListingSummaryDto {
  body_md: string;
  purity_basis: string | null;
  variants: ListingVariantDto[];
  moq_units: number | null;
  stock_units: number | null;
  condition: ListingCondition | null;
  tags: string[] | null;
  specs: SpecRowDto[];
  images: ListingImageDto[];
  image_license: string;
  provenance: ProvenanceDto;
  seller: SellerCardDto;
  catalog_average: CatalogAverageComparisonDto | null;
  /** Narrows the summary field to the full comparison object (or null). */
  ledger_comparison: LedgerComparisonDto | null;
}

function toSpecRowDto(spec: SpecRow): SpecRowDto {
  return { label: spec.label, value: spec.value, unit: spec.unit };
}

export function toSellerCardDto(seller: Seller): SellerCardDto {
  return {
    handle: seller.handle,
    display_name: seller.displayName,
    country: seller.country,
    verified: seller.verified,
    member_since: seller.memberSince,
    url: `/marketplace/sellers/${seller.handle}/`,
  };
}

export function toListingDetailDto(
  listing: Listing,
  seller: Seller,
  catalogAverageHint: CatalogAverageHint | null,
  ledgerComparison?: LedgerComparison | null,
): ListingDetailDto {
  const cell = catalogAverageHint?.cell ?? null;
  return {
    ...toListingSummaryDto(listing, ledgerComparison),
    body_md: listing.body,
    purity_basis: listing.purityBasis,
    variants: listing.variants.map((v) => ({
      legacy_sku: v.legacySku,
      label: v.label,
      mass_g: v.massG,
      price_usd_cents: v.priceUsdCents,
      price_per_gram_cents: round1(v.pricePerGramCents),
      note: v.note,
    })),
    moq_units: listing.moqUnits,
    stock_units: listing.stockUnits,
    condition: listing.condition,
    tags: listing.tags,
    specs: listing.specs.map(toSpecRowDto),
    images: listing.images.map((img) => ({
      path: img.path,
      alt: img.alt,
      width: img.width,
      height: img.height,
      is_primary: img.isPrimary,
      sort_order: img.sortOrder,
      caption: img.caption,
    })),
    image_license: IMAGE_LICENSE,
    provenance: {
      source_type: listing.provenance.sourceType,
      source_name: listing.provenance.sourceName,
      country: listing.provenance.country,
      region: listing.provenance.region,
      acquired_on: listing.provenance.acquiredOn,
      verification_status: listing.provenance.verificationStatus,
      declared_by: listing.provenance.declaredBy,
      chain:
        listing.provenance.chain?.map((step) => ({
          step: step.step,
          actor: step.actor,
          date: step.date,
          note: step.note,
        })) ?? null,
      documents:
        listing.provenance.documents?.map((doc) => ({
          kind: doc.kind,
          label: doc.label,
          path: doc.path,
          url: doc.url,
          issued_on: doc.issuedOn,
        })) ?? null,
      notes: listing.provenance.notes,
    },
    seller: toSellerCardDto(seller),
    catalog_average:
      cell === null
        ? null
        : {
            basis: 'seller_catalog',
            element_symbol: cell.elementSymbol,
            form: cell.form,
            median_per_gram_cents: round1(cell.medianPerGramCents),
            avg_per_gram_cents: round1(cell.avgPerGramCents),
            sample_size: cell.sampleSize,
            listing_count: cell.listingCount,
            leave_one_out: true,
            sufficient: catalogAverageHint?.sufficientForComparison ?? false,
            disclaimer: CATALOG_AVERAGE_DISCLAIMER,
          },
    // Overrides the summary's compact shape with the full disclosure.
    ledger_comparison: ledgerComparison
      ? {
          zone: ledgerComparison.zone,
          delta_vs_mid_pct: round1(ledgerComparison.deltaVsMidPct),
          ledger_mid_usd_per_kg: round2(ledgerComparison.ledgerMid),
          confidence: ledgerComparison.confidence,
          element_symbol: ledgerComparison.elementSymbol,
          form: ledgerComparison.form,
          quantity_kg_basis: ledgerComparison.quantityKgBasis,
          variant_label_basis: ledgerComparison.variantLabelBasis,
          listing_per_kg_usd: round2(ledgerComparison.listingPerKgUsd),
          ledger_low_usd_per_kg: round2(ledgerComparison.ledgerLow),
          ledger_high_usd_per_kg: round2(ledgerComparison.ledgerHigh),
          matched_records: ledgerComparison.matchedRecords,
          match_mode: ledgerComparison.matchMode,
          basis_note: LEDGER_COMPARISON_BASIS_NOTE,
        }
      : null,
  };
}

// ── Seller profile ───────────────────────────────────────────────────────────

export interface DeclaredClaimDto {
  label: string;
  value: string;
  basis: 'seller-declared';
}

/**
 * Derived and true by construction, counts over files in the repo. Kept
 * structurally separate from `declared_claims` so no consumer can render a
 * seller's own "~10,000 transactions" next to a computed figure with the same
 * weight (DESIGN §5.3).
 */
export interface SellerStatsDto {
  listing_count: number;
  element_count: number;
  categories: Record<ListingCategory, number>;
  earliest_listed_on: ISODate | null;
  latest_updated_at: ISODate | null;
}

export interface SellerDto {
  handle: string;
  url: string;
  display_name: string;
  country: string;
  member_since: ISODate;
  verified: boolean;
  verification_basis: string | null;
  tagline: string;
  bio_md: string | null;
  avatar: { path: string; alt: string; width: number; height: number };
  declared_claims: DeclaredClaimDto[];
  stats: SellerStatsDto;
  listings: ListingSummaryDto[];
}

/**
 * `listings` must be the seller's own (e.g. `getSellerListings(handle)`),
 * newest-first. Pass `getLedgerComparisonForListing` as `getLedgerComparison`
 * from server callers to populate each summary's `ledger_comparison`; omitted,
 * the field serialises null (this module stays fs-free).
 */
export function toSellerDto(
  seller: Seller,
  listings: Listing[],
  getLedgerComparison?: (listing: Listing) => LedgerComparison | null,
): SellerDto {
  const categories = Object.fromEntries(
    LISTING_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ListingCategory, number>;
  let earliestListedOn: ISODate | null = null;
  let latestUpdatedAt: ISODate | null = null;
  for (const l of listings) {
    categories[l.category] += 1;
    if (earliestListedOn === null || l.listedOn < earliestListedOn) earliestListedOn = l.listedOn;
    if (latestUpdatedAt === null || l.updatedAt > latestUpdatedAt) latestUpdatedAt = l.updatedAt;
  }
  return {
    handle: seller.handle,
    url: `/marketplace/sellers/${seller.handle}/`,
    display_name: seller.displayName,
    country: seller.country,
    member_since: seller.memberSince,
    verified: seller.verified,
    verification_basis: seller.verificationBasis,
    tagline: seller.tagline,
    bio_md: seller.bio,
    avatar: {
      path: seller.avatar.path,
      alt: seller.avatar.alt,
      width: seller.avatar.width,
      height: seller.avatar.height,
    },
    declared_claims: seller.declaredClaims.map((claim) => ({
      label: claim.label,
      value: claim.value,
      basis: claim.basis,
    })),
    stats: {
      listing_count: listings.length,
      element_count: new Set(listings.flatMap((l) => l.elements)).size,
      categories,
      earliest_listed_on: earliestListedOn,
      latest_updated_at: latestUpdatedAt,
    },
    listings: listings.map((l) => toListingSummaryDto(l, getLedgerComparison?.(l))),
  };
}

// ── Catalog-average cells ────────────────────────────────────────────────────

export interface CatalogAverageCellDto {
  element_symbol: string;
  form: MaterialForm;
  median_per_gram_cents: number;
  avg_per_gram_cents: number;
  min_per_gram_cents: number;
  max_per_gram_cents: number;
  sample_size: number;
  listing_count: number;
  updated_at: ISODate;
}

export function toCatalogAverageCellDto(cell: CatalogAverageCell): CatalogAverageCellDto {
  return {
    element_symbol: cell.elementSymbol,
    form: cell.form,
    median_per_gram_cents: round1(cell.medianPerGramCents),
    avg_per_gram_cents: round1(cell.avgPerGramCents),
    min_per_gram_cents: round1(cell.minPerGramCents),
    max_per_gram_cents: round1(cell.maxPerGramCents),
    sample_size: cell.sampleSize,
    listing_count: cell.listingCount,
    updated_at: cell.updatedAt,
  };
}
