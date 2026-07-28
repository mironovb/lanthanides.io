/**
 * The listing parser: `_marketplace/listings/*.md` → validated `Listing[]`
 * (front matter + markdown body via `gray-matter`, mirroring `lib/content.ts`).
 *
 * This file owns every per-listing hard rule in DESIGN §3.1, as amended by
 * PLAN.md "Schema deltas" (variants replace the single quantity/price pair;
 * `alloy` is a material category; elements validate against the full periodic
 * table; provenance country is nullable). A violation throws with a
 * `[lib/marketplace]`-prefixed message naming the file, the field path, and
 * what was expected, so a malformed listing is fixable from the CI log alone
 * and `npm run build` fails rather than shipping a wrong trust field.
 *
 * Soft, buyer-relevant warnings (DESIGN §3.3) never fail the build: they are
 * collected into `dataQualityFlags` and simultaneously `console.warn`ed.
 *
 * Read-only, server-only (`fs`), memoised per process, see `load.ts`.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

import type {
  DataQualityFlag,
  Listing,
  ListingImage,
  ListingSource,
  ListingVariant,
  ProvenanceDocument,
  ProvenanceRecord,
  ProvenanceStep,
  SpecRow,
} from './types';
import {
  DOCUMENT_KINDS,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_SHAPES,
  LISTING_STATUSES,
  MATERIAL_CATEGORIES,
  MATERIAL_FORMS,
  PROVENANCE_SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from './types';
import {
  MARKETPLACE_DIR,
  checkKeys,
  fail,
  isObject,
  loadMarketplaceSettings,
  loadSellers,
  nullableCountry,
  nullableEnum,
  nullableString,
  once,
  readText,
  reqEnum,
  reqISODate,
  reqString,
  todayISO,
} from './load';
import {
  ISO_DATE_RE,
  PERIODIC_SYMBOLS,
  RESERVED_SLUGS,
  SLUG_RE,
  YEAR_MONTH_RE,
  canonicalElementSymbol,
  isFiniteNumber,
  isNonEmptyString,
  isNonNegativeInteger,
  isPositiveInteger,
} from './validate';

/**
 * The authored front-matter schema, exactly the snake_case keys of the
 * `Listing` contract (derived fields are computed here, never authored, so
 * they cannot appear in a file). An unknown key fails the build with this
 * list in the message (DESIGN §3.1 rule 6, §3.2).
 */
const LISTING_KEYS = [
  'slug',
  'title',
  'summary',
  'status',
  'category',
  'seller',
  'elements',
  'primary_element',
  'form',
  'shape',
  'purity_pct',
  'purity_basis',
  'variants',
  'currency',
  'moq_units',
  'stock_units',
  'condition',
  'exclude_from_catalog_average',
  'listed_on',
  'updated_at',
  'source',
  'specs',
  'images',
  'provenance',
  'tags',
] as const;

const VARIANT_KEYS = ['legacy_sku', 'label', 'mass_g', 'price_usd_cents', 'note'] as const;
const VARIANT_REQUIRED = ['legacy_sku', 'label', 'mass_g', 'price_usd_cents'] as const;
const IMAGE_KEYS = ['path', 'alt', 'width', 'height', 'is_primary', 'sort_order', 'caption'] as const;
const IMAGE_REQUIRED = ['path', 'alt', 'width', 'height', 'is_primary', 'sort_order'] as const;
const SPEC_KEYS = ['label', 'value', 'unit'] as const;
const SPEC_REQUIRED = ['label', 'value'] as const;
const SOURCE_KEYS = ['store', 'slug', 'category'] as const;
const PROVENANCE_KEYS = [
  'source_type',
  'source_name',
  'country',
  'region',
  'acquired_on',
  'verification_status',
  'declared_by',
  'chain',
  'documents',
  'notes',
] as const;
const CHAIN_KEYS = ['step', 'actor', 'date', 'note'] as const;
const CHAIN_REQUIRED = ['step', 'actor'] as const;
const DOCUMENT_KEYS = ['kind', 'label', 'path', 'url', 'issued_on'] as const;
const DOCUMENT_REQUIRED = ['kind', 'label'] as const;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'] as const;

/** Build-log reasons for the soft flags (DESIGN §3.3), warned with the module prefix. */
const FLAG_REASONS: Record<DataQualityFlag, string> = {
  verification_pending:
    'provenance is seller-declared with no independent verification (renders "Verification pending")',
  no_documents: 'provenance has no supporting documents on file',
  origin_unstated: 'provenance country is null (the source never stated an origin)',
  acquisition_date_unknown: 'provenance acquired_on is null',
  source_name_withheld: 'provenance source_name is null',
  purity_basis_unstated: 'purity_pct is set but purity_basis is null',
  stale_listing: 'updated_at is older than the settings.yml stale_listing_days threshold',
  out_of_stock: 'stock_units is 0',
};

/** Whole days from `fromISO` to `toISO` (both 'YYYY-MM-DD', parsed as UTC midnight). */
function daysBetween(fromISO: string, toISO: string): number {
  return Math.floor((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

/** Null, or a provenance-precision date: quoted 'YYYY-MM-DD' or 'YYYY-MM'. */
function nullableProvenanceDate(file: string, field: string, value: unknown): string | null {
  if (value === null) return null;
  if (value instanceof Date) {
    return fail(
      file,
      `"${field}" must be a quoted date string ("YYYY-MM-DD" or "YYYY-MM"); YAML parsed the unquoted date into a Date object, quote it`,
    );
  }
  if (typeof value !== 'string' || !(ISO_DATE_RE.test(value) || YEAR_MONTH_RE.test(value))) {
    return fail(
      file,
      `"${field}" must be null or a quoted "YYYY-MM-DD" / "YYYY-MM" string, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

// ── Nested-block parsers ─────────────────────────────────────────────────────

function parseVariants(file: string, raw: unknown): ListingVariant[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(file, '"variants" must be a list with at least one pack-size entry');
  }
  const variants = raw.map((entry, i): ListingVariant => {
    const path = `variants[${i}]`;
    if (!isObject(entry)) fail(file, `${path} is not a mapping`);
    checkKeys(file, entry, path, VARIANT_KEYS, VARIANT_REQUIRED);

    const legacySku = reqString(file, `${path}.legacy_sku`, entry.legacy_sku);
    const label = reqString(file, `${path}.label`, entry.label);
    if (!isFiniteNumber(entry.mass_g) || entry.mass_g <= 0) {
      fail(
        file,
        `${path}.mass_g must be a finite number > 0 in grams (got ${JSON.stringify(entry.mass_g)})`,
      );
    }
    if (!isPositiveInteger(entry.price_usd_cents)) {
      fail(
        file,
        `${path}.price_usd_cents must be a positive integer of USD cents (got ${JSON.stringify(entry.price_usd_cents)})`,
      );
    }
    return {
      legacySku,
      label,
      massG: entry.mass_g,
      priceUsdCents: entry.price_usd_cents,
      note: nullableString(file, `${path}.note`, entry.note ?? null),
      // Derived, unrounded; rounded only at render/serialise (types.ts).
      pricePerGramCents: entry.price_usd_cents / entry.mass_g,
    };
  });

  const skus = new Set<string>();
  for (const v of variants) {
    if (skus.has(v.legacySku)) {
      fail(file, `variants contains duplicate legacy_sku "${v.legacySku}"`);
    }
    skus.add(v.legacySku);
  }

  // Ascending by mass, stable (no fail on authored order, the loader owns it).
  return [...variants].sort((a, b) => a.massG - b.massG);
}

function parseImages(file: string, raw: unknown, slug: string): ListingImage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(file, '"images" must be a list with at least one photo');
  }
  const prefix = `/assets/marketplace/listings/${slug}/`;
  const images = raw.map((entry, i): ListingImage => {
    const path = `images[${i}]`;
    if (!isObject(entry)) fail(file, `${path} is not a mapping`);
    checkKeys(file, entry, path, IMAGE_KEYS, IMAGE_REQUIRED);

    const webPath = reqString(file, `${path}.path`, entry.path);
    if (!webPath.startsWith(prefix)) {
      fail(file, `${path}.path must start "${prefix}" (got "${webPath}")`);
    }
    const ext = webPath.slice(webPath.lastIndexOf('.'));
    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      fail(
        file,
        `${path}.path extension "${ext}" is not allowed, allowed: ${IMAGE_EXTENSIONS.join(', ')}`,
      );
    }
    if (!existsSync(join(process.cwd(), 'public', webPath))) {
      fail(file, `${path}.path points at a file that does not exist: public${webPath}`);
    }

    const alt = reqString(file, `${path}.alt`, entry.alt);
    if (alt.trim().length < 12) {
      // Soft warning only (PLAN relaxed DESIGN's ≥12 hard rule: the source
      // catalog's alts are short but honest).
      console.warn(
        `[lib/marketplace] _marketplace/${file}: ${path}.alt is shorter than 12 characters ("${alt}"), kept, but consider a fuller description of the photo`,
      );
    }

    if (!isPositiveInteger(entry.width) || !isPositiveInteger(entry.height)) {
      fail(
        file,
        `${path} width/height must be positive integers (intrinsic pixels; got ${JSON.stringify(entry.width)} × ${JSON.stringify(entry.height)})`,
      );
    }
    if (typeof entry.is_primary !== 'boolean') {
      fail(file, `${path}.is_primary must be a boolean (got ${JSON.stringify(entry.is_primary)})`);
    }
    if (!isNonNegativeInteger(entry.sort_order)) {
      fail(
        file,
        `${path}.sort_order must be a non-negative integer (got ${JSON.stringify(entry.sort_order)})`,
      );
    }

    return {
      path: webPath,
      alt,
      width: entry.width,
      height: entry.height,
      isPrimary: entry.is_primary,
      sortOrder: entry.sort_order,
      caption: nullableString(file, `${path}.caption`, entry.caption ?? null),
    };
  });

  const primaries = images.filter((img) => img.isPrimary);
  if (primaries.length !== 1) {
    fail(
      file,
      `"images" must have exactly one is_primary: true entry (found ${primaries.length})`,
    );
  }
  const sortOrders = new Set(images.map((img) => img.sortOrder));
  if (sortOrders.size !== images.length) {
    fail(file, '"images" sort_order values must be unique within the listing');
  }
  return images;
}

function parseSpecs(file: string, raw: unknown): SpecRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(file, '"specs" must be a list with at least one row');
  }
  return raw.map((entry, i): SpecRow => {
    const path = `specs[${i}]`;
    if (!isObject(entry)) fail(file, `${path} is not a mapping`);
    checkKeys(file, entry, path, SPEC_KEYS, SPEC_REQUIRED);
    if (typeof entry.value === 'number') {
      fail(file, `${path}.value must be a string, quote numeric values ("${entry.value}")`);
    }
    return {
      label: reqString(file, `${path}.label`, entry.label),
      value: reqString(file, `${path}.value`, entry.value),
      unit: nullableString(file, `${path}.unit`, entry.unit ?? null),
    };
  });
}

/** Reviewer-only import provenance (never rendered): null, or all three fields. */
function parseSource(file: string, raw: unknown): ListingSource | null {
  if (raw === null) return null;
  if (!isObject(raw)) fail(file, '"source" must be null or a mapping');
  checkKeys(file, raw, 'source', SOURCE_KEYS);
  return {
    store: reqString(file, 'source.store', raw.store),
    slug: reqString(file, 'source.slug', raw.slug),
    category: reqString(file, 'source.category', raw.category),
  };
}

function parseChain(file: string, raw: unknown): ProvenanceStep[] | null {
  if (raw === null) return null;
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(file, 'provenance.chain must be null or a list with at least one step');
  }
  return raw.map((entry, i): ProvenanceStep => {
    const path = `provenance.chain[${i}]`;
    if (!isObject(entry)) fail(file, `${path} is not a mapping`);
    checkKeys(file, entry, path, CHAIN_KEYS, CHAIN_REQUIRED);
    if (entry.step !== i + 1) {
      fail(
        file,
        `${path}.step is ${JSON.stringify(entry.step)}, steps must be contiguous from 1 (expected ${i + 1})`,
      );
    }
    return {
      step: i + 1,
      actor: reqString(file, `${path}.actor`, entry.actor),
      date: nullableProvenanceDate(file, `${path}.date`, entry.date ?? null),
      note: nullableString(file, `${path}.note`, entry.note ?? null),
    };
  });
}

function parseDocuments(file: string, raw: unknown): ProvenanceDocument[] | null {
  if (raw === null) return null;
  if (!Array.isArray(raw)) {
    fail(file, 'provenance.documents must be null or a list of document entries');
  }
  return raw.map((entry, i): ProvenanceDocument => {
    const path = `provenance.documents[${i}]`;
    if (!isObject(entry)) fail(file, `${path} is not a mapping`);
    checkKeys(file, entry, path, DOCUMENT_KEYS, DOCUMENT_REQUIRED);

    const kind = reqEnum(file, `${path}.kind`, entry.kind, DOCUMENT_KINDS);
    const label = reqString(file, `${path}.label`, entry.label);
    const docPath = nullableString(file, `${path}.path`, entry.path ?? null);
    const url = nullableString(file, `${path}.url`, entry.url ?? null);
    if ((docPath === null) === (url === null)) {
      fail(file, `${path} must set exactly one of "path" (a file under public/) or "url"`);
    }
    if (docPath !== null) {
      if (!docPath.startsWith('/')) {
        fail(file, `${path}.path must be a web path starting "/" (got "${docPath}")`);
      }
      if (!existsSync(join(process.cwd(), 'public', docPath))) {
        fail(file, `${path}.path points at a file that does not exist: public${docPath}`);
      }
    }

    const issuedOnRaw = entry.issued_on ?? null;
    return {
      kind,
      label,
      path: docPath,
      url,
      issuedOn: issuedOnRaw === null ? null : reqISODate(file, `${path}.issued_on`, issuedOnRaw),
    };
  });
}

function parseProvenance(
  file: string,
  raw: unknown,
  sellerHandle: string,
  today: string,
): ProvenanceRecord {
  if (!isObject(raw)) {
    fail(
      file,
      '"provenance" block is missing or not a mapping, a listing without provenance is not publishable here',
    );
  }
  checkKeys(file, raw, 'provenance', PROVENANCE_KEYS);

  const declaredBy = reqString(file, 'provenance.declared_by', raw.declared_by);
  if (declaredBy !== sellerHandle) {
    fail(
      file,
      `provenance.declared_by ("${declaredBy}") must equal the listing's "seller" ("${sellerHandle}")`,
    );
  }

  const acquiredOn = nullableProvenanceDate(file, 'provenance.acquired_on', raw.acquired_on);
  if (acquiredOn !== null && acquiredOn > today) {
    fail(
      file,
      `provenance.acquired_on (${acquiredOn}) is in the future (build date ${today})`,
    );
  }

  return {
    sourceType: reqEnum(file, 'provenance.source_type', raw.source_type, PROVENANCE_SOURCE_TYPES),
    sourceName: nullableString(file, 'provenance.source_name', raw.source_name),
    country: nullableCountry(file, 'provenance.country', raw.country),
    region: nullableString(file, 'provenance.region', raw.region),
    acquiredOn,
    verificationStatus: reqEnum(
      file,
      'provenance.verification_status',
      raw.verification_status,
      VERIFICATION_STATUSES,
    ),
    declaredBy,
    chain: parseChain(file, raw.chain),
    documents: parseDocuments(file, raw.documents),
    notes: nullableString(file, 'provenance.notes', raw.notes),
  };
}

// ── The per-file parser ──────────────────────────────────────────────────────

function parseListing(
  fileName: string,
  sellerHandles: ReadonlySet<string>,
  staleListingDays: number,
  today: string,
): Listing {
  const file = `listings/${fileName}`;
  const { data, content } = matter(readText(file));
  if (!isObject(data)) fail(file, 'front matter must be a mapping');
  const fm = data as Record<string, unknown>;

  checkKeys(file, fm, 'front matter', LISTING_KEYS);

  // Identity (DESIGN §2.4).
  const slug = reqString(file, 'slug', fm.slug);
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 80) {
    fail(file, `"slug" must match ${SLUG_RE} and be 3-80 characters (got "${slug}")`);
  }
  if (RESERVED_SLUGS.has(slug)) {
    fail(
      file,
      `"slug" ("${slug}") is a reserved route segment, reserved: ${[...RESERVED_SLUGS].join(', ')}`,
    );
  }
  const stem = fileName.replace(/\.md$/, '');
  if (slug !== stem) {
    fail(file, `"slug" ("${slug}") must equal the filename stem ("${stem}")`);
  }

  const title = reqString(file, 'title', fm.title);
  const summary = reqString(file, 'summary', fm.summary);
  const status = reqEnum(file, 'status', fm.status, LISTING_STATUSES);
  const category = reqEnum(file, 'category', fm.category, LISTING_CATEGORIES);
  const isMaterial = MATERIAL_CATEGORIES.includes(category);

  const sellerHandle = reqString(file, 'seller', fm.seller);
  if (!sellerHandles.has(sellerHandle)) {
    fail(
      file,
      `"seller" ("${sellerHandle}") does not resolve in _marketplace/sellers.yml, known handles: ${[...sellerHandles].join(', ') || '(none)'}`,
    );
  }

  // Elements: the full periodic table, case-sensitive canonical symbols.
  if (!Array.isArray(fm.elements)) {
    fail(file, '"elements" must be a list of element symbols (it may be empty only for high-tech/equipment)');
  }
  const elements = fm.elements.map((v, i): string => {
    if (typeof v !== 'string' || !PERIODIC_SYMBOLS.has(v)) {
      const canonical = typeof v === 'string' ? canonicalElementSymbol(v) : null;
      fail(
        file,
        `elements[${i}] (${JSON.stringify(v)}) is not a periodic-table symbol${
          canonical ? `, symbols are case-sensitive; did you mean "${canonical}"?` : ''
        }`,
      );
    }
    return v;
  });
  const dupSymbol = elements.find((sym, i) => elements.indexOf(sym) !== i);
  if (dupSymbol !== undefined) {
    fail(file, `"elements" contains duplicate symbol "${dupSymbol}"`);
  }
  if (elements.length === 0 && isMaterial) {
    fail(
      file,
      `"elements" may be empty only for high-tech/equipment listings (category is "${category}")`,
    );
  }

  // primary_element: non-null iff exactly one element (the statistics key).
  let primaryElement: string | null;
  if (elements.length === 1) {
    if (typeof fm.primary_element !== 'string') {
      fail(
        file,
        `"primary_element" must be "${elements[0]}" when "elements" has exactly one symbol (got ${JSON.stringify(fm.primary_element)})`,
      );
    }
    if (!elements.includes(fm.primary_element)) {
      fail(
        file,
        `"primary_element" ("${fm.primary_element}") must be a member of "elements" ([${elements.join(', ')}])`,
      );
    }
    primaryElement = fm.primary_element;
  } else {
    if (fm.primary_element !== null) {
      fail(
        file,
        `"primary_element" must be null when "elements" has ${elements.length} symbols, only a single-element listing has a per-gram statistics key (got ${JSON.stringify(fm.primary_element)})`,
      );
    }
    primaryElement = null;
  }

  // form: the statistics axis. Required for material categories; forbidden for
  // high-tech/equipment, the guard that keeps a sputtering target out of the
  // per-gram metal average (DESIGN §3.1 rule 29).
  const form = nullableEnum(file, 'form', fm.form, MATERIAL_FORMS);
  if (isMaterial && form === null) {
    fail(
      file,
      `"form" must be non-null for material category "${category}", allowed: ${MATERIAL_FORMS.join(', ')}`,
    );
  }
  if (!isMaterial && form !== null) {
    fail(
      file,
      `"form" must be null for category "${category}" (high-tech/equipment never enter per-gram statistics)`,
    );
  }

  const shape = nullableEnum(file, 'shape', fm.shape, LISTING_SHAPES);

  // purity_pct in (0, 100]; N-notation belongs in purity_basis.
  const purityRaw = fm.purity_pct;
  let purityPct: number | null = null;
  if (purityRaw !== null) {
    if (!isFiniteNumber(purityRaw)) {
      fail(
        file,
        `"purity_pct" must be a YAML number or null (got ${JSON.stringify(purityRaw)}), write N-notation like "4N" in "purity_basis"`,
      );
    }
    if (purityRaw <= 0 || purityRaw > 100) {
      fail(file, `"purity_pct" must be in (0, 100] (got ${purityRaw})`);
    }
    purityPct = purityRaw;
  }
  if ((category === 'pure-metal' || category === 'oxide') && purityPct === null) {
    fail(file, `"purity_pct" is required (non-null) for category "${category}"`);
  }
  const purityBasis = nullableString(file, 'purity_basis', fm.purity_basis);

  const variants = parseVariants(file, fm.variants);

  if (fm.currency !== 'USD') {
    fail(file, `"currency" is ${JSON.stringify(fm.currency)}, allowed: USD`);
  }

  const readNonNegIntOrNull = (field: 'moq_units' | 'stock_units'): number | null => {
    const v = fm[field];
    if (v === null) return null;
    if (!isNonNegativeInteger(v)) {
      return fail(
        file,
        `"${field}" must be null or a non-negative integer (got ${JSON.stringify(v)})`,
      );
    }
    return v;
  };
  const moqUnits = readNonNegIntOrNull('moq_units');
  const stockUnits = readNonNegIntOrNull('stock_units');

  const condition = nullableEnum(file, 'condition', fm.condition, LISTING_CONDITIONS);
  if (!isMaterial && condition === null) {
    fail(
      file,
      `"condition" must be non-null for category "${category}", allowed: ${LISTING_CONDITIONS.join(', ')}`,
    );
  }

  if (typeof fm.exclude_from_catalog_average !== 'boolean') {
    fail(
      file,
      `"exclude_from_catalog_average" must be a boolean (got ${JSON.stringify(fm.exclude_from_catalog_average)})`,
    );
  }

  // Dates: quoted ISO strings, ordered, never in the future (a future date
  // would make the build non-deterministic, DESIGN §3.1 rule 33).
  const listedOn = reqISODate(file, 'listed_on', fm.listed_on);
  const updatedAt = reqISODate(file, 'updated_at', fm.updated_at);
  if (updatedAt < listedOn) {
    fail(file, `"updated_at" (${updatedAt}) must be on or after "listed_on" (${listedOn})`);
  }
  if (listedOn > today) {
    fail(file, `"listed_on" (${listedOn}) is in the future (build date ${today})`);
  }
  if (updatedAt > today) {
    fail(file, `"updated_at" (${updatedAt}) is in the future (build date ${today})`);
  }

  const source = parseSource(file, fm.source);
  const specs = parseSpecs(file, fm.specs);
  const images = parseImages(file, fm.images, slug);
  const provenance = parseProvenance(file, fm.provenance, sellerHandle, today);

  let tags: string[] | null = null;
  if (fm.tags !== null) {
    if (!Array.isArray(fm.tags)) fail(file, '"tags" must be null or a list of tag strings');
    tags = fm.tags.map((t, i): string => {
      if (!isNonEmptyString(t)) {
        fail(file, `tags[${i}] must be a non-empty string (got ${JSON.stringify(t)})`);
      }
      return t;
    });
  }

  if (content.trim() === '') {
    fail(file, 'markdown body is empty, the listing description is required');
  }

  // Soft, buyer-relevant flags (DESIGN §3.3): surfaced, never fatal.
  const flags: DataQualityFlag[] = [];
  if (provenance.verificationStatus === 'seller-declared') flags.push('verification_pending');
  if (provenance.documents === null || provenance.documents.length === 0) flags.push('no_documents');
  if (provenance.country === null) flags.push('origin_unstated');
  if (provenance.acquiredOn === null) flags.push('acquisition_date_unknown');
  if (provenance.sourceName === null) flags.push('source_name_withheld');
  if (purityPct !== null && purityBasis === null) flags.push('purity_basis_unstated');
  if (daysBetween(updatedAt, today) > staleListingDays) flags.push('stale_listing');
  if (stockUnits === 0) flags.push('out_of_stock');
  for (const flag of flags) {
    console.warn(`[lib/marketplace] _marketplace/${file}: ${flag}, ${FLAG_REASONS[flag]}`);
  }

  const primaryImage = images.find((img) => img.isPrimary) as ListingImage; // exactly one, asserted above
  const priceFromCents = Math.min(...variants.map((v) => v.priceUsdCents));

  return {
    slug,
    title,
    summary,
    status,
    category,
    sellerHandle,
    elements,
    primaryElement,
    form,
    shape,
    purityPct,
    purityBasis,
    variants,
    currency: 'USD',
    moqUnits,
    stockUnits,
    condition,
    excludeFromCatalogAverage: fm.exclude_from_catalog_average,
    listedOn,
    updatedAt,
    source,
    specs,
    images,
    provenance,
    tags,
    body: content,
    priceFromCents,
    massMinG: variants[0].massG,
    massMaxG: variants[variants.length - 1].massG,
    primaryImage,
    dataQualityFlags: flags,
    url: `/marketplace/${slug}/`,
    // Decorated in index.ts (the one lib/data join); empty until then so this
    // module never imports the ledger.
    catalogElements: [],
  };
}

// ── The collection loader ────────────────────────────────────────────────────

/**
 * All listings, validated, newest-first (updated_at desc, then listed_on desc,
 * then slug asc for build determinism).
 *
 * Graceful-empty rule (PLAN P1): a missing or empty `listings/` directory is a
 * legitimate bootstrap state ONLY while `settings.yml` says
 * `expected_listings: 0`; otherwise it fails, a dropped directory must never
 * silently ship an empty marketplace.
 */
export const loadListings = once<Listing[]>(() => {
  const settings = loadMarketplaceSettings();
  const sellerHandles: ReadonlySet<string> = new Set(loadSellers().map((s) => s.handle));

  let files: string[];
  try {
    files = readdirSync(join(MARKETPLACE_DIR, 'listings'))
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch (err) {
    if (settings.expectedListings === 0) return [];
    throw new Error(
      `[lib/marketplace] could not list _marketplace/listings (settings.yml expects ${settings.expectedListings} listings): ${(err as Error).message}`,
    );
  }
  if (files.length === 0) {
    if (settings.expectedListings === 0) return [];
    fail(
      'listings',
      `zero .md listing files found, but settings.yml "expected_listings" is ${settings.expectedListings}`,
    );
  }

  const today = todayISO();
  const listings = files.map((f) =>
    parseListing(f, sellerHandles, settings.staleListingDays, today),
  );

  // Duplicate slugs are only reachable via case variance or a stale
  // front-matter slug (both already fail above), checked anyway (§3.1 rule 4).
  const bySlug = new Map<string, string>();
  for (let i = 0; i < listings.length; i += 1) {
    const prev = bySlug.get(listings[i].slug);
    if (prev !== undefined) {
      fail(
        `listings/${files[i]}`,
        `duplicate slug "${listings[i].slug}" (also declared by listings/${prev})`,
      );
    }
    bySlug.set(listings[i].slug, files[i]);
  }

  listings.sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) ||
      b.listedOn.localeCompare(a.listedOn) ||
      a.slug.localeCompare(b.slug),
  );
  return listings;
});
