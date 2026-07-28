/**
 * Marketplace data contracts (docs/marketplace/DESIGN.md §2, as amended by
 * PLAN.md "Schema deltas"). This file IS the schema: there is no database —
 * listings live as versioned files under `_marketplace/`, validated at build
 * time by `lib/marketplace/load.ts`, and every schema change is a reviewed
 * git diff paired with the data migration it requires (DESIGN §3.5).
 *
 * Boundary rule: files and API JSON are snake_case; TypeScript is camelCase.
 * The mapping lives in `load.ts` (in) and `serialize.ts` (out) — nowhere else.
 */

// ── Vocabularies ─────────────────────────────────────────────────────────────

export const LISTING_CATEGORIES = [
  'pure-metal',
  'oxide',
  'mineral-ore',
  'alloy',
  'high-tech',
  'equipment',
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

/** Categories that describe raw material (require `form`; eligible for per-gram stats). */
export const MATERIAL_CATEGORIES: readonly ListingCategory[] = [
  'pure-metal',
  'oxide',
  'mineral-ore',
  'alloy',
];

export const LISTING_STATUSES = ['preliminary', 'placeholder'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/**
 * The statistics axis (the ledger's oxide/metal law, not the shape).
 * Never pool per-gram figures across forms.
 */
export const MATERIAL_FORMS = ['metal', 'oxide', 'alloy', 'salt', 'mineral'] as const;
export type MaterialForm = (typeof MATERIAL_FORMS)[number];

/** Display-only physical shape. Never a statistics axis (DESIGN §2.1). */
export const LISTING_SHAPES = [
  'granule',
  'ingot',
  'piece',
  'wool',
  'chip',
  'rod',
  'powder',
  'foil',
  'wire',
  'crystal',
  'target',
  'ampoule',
  'specimen',
  'assembly',
] as const;
export type ListingShape = (typeof LISTING_SHAPES)[number];

export const LISTING_CONDITIONS = ['new', 'used', 'refurbished', 'specimen'] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const PROVENANCE_SOURCE_TYPES = [
  'mine',
  'refinery',
  'lab',
  'private-collection',
  'recycled',
] as const;
export type ProvenanceSourceType = (typeof PROVENANCE_SOURCE_TYPES)[number];

export const VERIFICATION_STATUSES = [
  'seller-declared',
  'document-on-file',
  'site-verified',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_KINDS = ['invoice', 'assay', 'coa', 'photo', 'customs', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/**
 * Buyer-relevant soft warnings (DESIGN §3.3): collected per listing, rendered
 * where they inform an inquiry decision, and console.warn'ed at build.
 */
export type DataQualityFlag =
  | 'verification_pending' // provenance is seller-declared, no document on file
  | 'no_documents' // provenance has no supporting documents
  | 'origin_unstated' // provenance country is null (source never stated one)
  | 'acquisition_date_unknown'
  | 'source_name_withheld'
  | 'purity_basis_unstated'
  | 'stale_listing' // updated_at older than settings.stale_listing_days
  | 'out_of_stock';

/** ISO 8601 calendar date, 'YYYY-MM-DD'. Always a quoted string in YAML. */
export type ISODate = string;

// ── Records ──────────────────────────────────────────────────────────────────

/** One purchasable pack size. The source catalog prices every listing at up to 10 sizes. */
export interface ListingVariant {
  /** Opaque identifier carried from the source catalog. Never parsed, never displayed as "our" SKU. */
  legacySku: string;
  /** Display label, verbatim from the source (e.g. "25 g", "4.4 kg", "325 g (as pictured)"). */
  label: string;
  /** Mass in grams. The numeric source of truth — never parse `label`. */
  massG: number;
  /** Integer USD cents. */
  priceUsdCents: number;
  /** Real caveat carried from the source only (e.g. its own pending-review price flags). */
  note: string | null;
  /** Derived: priceUsdCents / massG, unrounded. Round only at render/serialise. */
  pricePerGramCents: number;
}

export interface ListingImage {
  /** Web path under public/, must start `/assets/marketplace/listings/<slug>/`. */
  path: string;
  alt: string;
  /** Intrinsic pixels (feeds next/image; prevents CLS). */
  width: number;
  height: number;
  /** Exactly one per listing. Rendered first and used as the OG image. */
  isPrimary: boolean;
  /** Gallery order among non-primary images. Unique within the listing. */
  sortOrder: number;
  caption: string | null;
}

export interface ProvenanceStep {
  step: number; // 1..n contiguous
  actor: string;
  date: string | null; // ISO date or 'YYYY-MM'
  note: string | null;
}

export interface ProvenanceDocument {
  kind: DocumentKind;
  label: string;
  /** Exactly one of path/url. `path` must exist under public/. */
  path: string | null;
  url: string | null;
  issuedOn: ISODate | null;
}

/**
 * Embedded, exactly one per listing: a listing without provenance is not
 * publishable here, so "missing provenance" is a parse error, not a join miss.
 */
export interface ProvenanceRecord {
  sourceType: ProvenanceSourceType;
  sourceName: string | null;
  /** ISO-3166-1 alpha-2, uppercase — or null when the source never stated an origin ("Not stated"). */
  country: string | null;
  region: string | null;
  acquiredOn: string | null; // ISO date or 'YYYY-MM'
  verificationStatus: VerificationStatus;
  /** Must equal the listing's seller handle. */
  declaredBy: string;
  chain: ProvenanceStep[] | null;
  documents: ProvenanceDocument[] | null;
  notes: string | null;
}

export interface SpecRow {
  label: string;
  value: string;
  unit: string | null;
}

/** Reviewer-only import provenance. Never rendered on any page. */
export interface ListingSource {
  store: string; // 'periodictech'
  slug: string; // source catalog slug
  category: string; // source taxonomy value, verbatim (e.g. 'Ultra Pure')
}

export interface Listing {
  slug: string;
  title: string;
  /** One-line teaser (source `short`); cards + meta descriptions. */
  summary: string;
  status: ListingStatus;
  category: ListingCategory;
  sellerHandle: string;
  /** Chemical element symbols present (full periodic table; may exceed the site's 31-element catalog). */
  elements: string[];
  /** Non-null iff exactly one element; the statistics + cross-link key. */
  primaryElement: string | null;
  form: MaterialForm | null;
  shape: ListingShape | null;
  purityPct: number | null;
  purityBasis: string | null;
  variants: ListingVariant[]; // ≥1, ascending by massG
  currency: 'USD';
  moqUnits: number | null;
  stockUnits: number | null;
  condition: ListingCondition | null;
  excludeFromCatalogAverage: boolean;
  listedOn: ISODate;
  updatedAt: ISODate;
  source: ListingSource | null;
  specs: SpecRow[];
  images: ListingImage[]; // ≥1
  provenance: ProvenanceRecord;
  tags: string[] | null;
  /** Markdown body — the source description, verbatim. */
  body: string;

  // Derived in the loader (never authored, so they cannot drift):
  /** Cheapest variant price ("from $X"). */
  priceFromCents: number;
  massMinG: number;
  massMaxG: number;
  primaryImage: ListingImage;
  dataQualityFlags: DataQualityFlag[];
  /** `/marketplace/<slug>/` */
  url: string;
  /** `elements` ∩ the site's element catalog — drives /elements/<Sym>/ cross-links. Decorated in index.ts. */
  catalogElements: string[];
}

// ── Sellers ──────────────────────────────────────────────────────────────────

export interface SellerAvatar {
  path: string;
  alt: string;
  width: number;
  height: number;
}

/** A stated-by-the-seller claim. Rendered under a literal "Seller-declared" heading, never as a Stat. */
export interface DeclaredClaim {
  label: string;
  value: string;
  basis: 'seller-declared';
}

export interface Seller {
  handle: string;
  displayName: string;
  /** ISO-3166-1 alpha-2. */
  country: string;
  memberSince: ISODate;
  verified: boolean;
  /** Required when verified — what "verified" actually covers. */
  verificationBasis: string | null;
  contactEmail: string;
  avatar: SellerAvatar;
  tagline: string;
  declaredClaims: DeclaredClaim[];
  /** Markdown bio body from `_marketplace/sellers/<handle>.md`, or null. */
  bio: string | null;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface MarketplaceSettings {
  currency: 'USD';
  /** The count integrity gate: listing files must equal this exactly. Bumped in the same diff as an import. */
  expectedListings: number;
  /** Leave-one-out OTHER-listing count needed before a comparison hint may render. */
  catalogAverageMinSample: number;
  /** Minimum contributing variants before a cell appears in the price-reference API at all. */
  catalogAverageMinVariants: number;
  staleListingDays: number;
  categoryLabels: Record<ListingCategory, string>;
  formLabels: Record<MaterialForm, string>;
  sourceTypeLabels: Record<ProvenanceSourceType, string>;
  verificationLabels: Record<VerificationStatus, string>;
}

// ── Derived statistics (never committed; computed from listings at build) ────

/**
 * Per (element × form): the seller-catalog per-gram statistic. NOT a market
 * price and NOT the site's sourced reference prices — see DESIGN §4.7. The
 * words "reference price" / "market price" are banned on marketplace surfaces.
 */
export interface CatalogAverageCell {
  elementSymbol: string;
  form: MaterialForm;
  medianPerGramCents: number;
  avgPerGramCents: number;
  minPerGramCents: number;
  maxPerGramCents: number;
  /** Contributing variants (pack sizes pooled — disclose). */
  sampleSize: number;
  /** Distinct contributing listings. */
  listingCount: number;
  updatedAt: ISODate;
}

/**
 * The leave-one-out comparison hint for one listing (DESIGN §4.5): its
 * (element × form) cell recomputed with that listing excluded entirely, so a
 * listing is never compared to an average it is a member of. `cell` is null
 * when the listing is ineligible or the remaining variants fall below
 * `catalogAverageMinVariants`; the comparison may only render when
 * `sufficientForComparison`.
 */
export interface CatalogAverageHint {
  cell: CatalogAverageCell | null;
  /** Distinct OTHER eligible listings in the cell (this listing excluded). */
  otherListingCount: number;
  /** `otherListingCount >= settings.catalogAverageMinSample`. */
  sufficientForComparison: boolean;
}

export interface MarketplaceFacets {
  /** Symbols present, catalog members first in catalog order, then others alphabetically. */
  elements: string[];
  categories: ListingCategory[];
  forms: MaterialForm[];
  shapes: ListingShape[];
  priceRangeCents: { min: number; max: number } | null;
}
