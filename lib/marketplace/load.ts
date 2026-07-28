/**
 * Cached, build-time loaders over the repo-root `_marketplace/` directory:
 * `settings.yml` + `sellers.yml` (+ seller bio markdown), plus the shared
 * read/validate helpers the listing parser (`load-listings.ts`) builds on.
 *
 * Read-only: this layer NEVER writes to `_marketplace/` (DESIGN §3.5, every
 * data change is a reviewed git diff; backfill scripts print proposed front
 * matter for a human to commit). Each loader parses once and memoises the
 * result per process. YAML is read via the `yaml` package (which, unlike
 * gray-matter's js-yaml, leaves unquoted dates as strings, the Date-instance
 * checks below are defence in depth). Validation runs at parse time so a
 * malformed file fails `npm run build` loudly, with a message naming the file,
 * the field path, and what was expected (DESIGN §3: fixable from the CI log
 * alone).
 *
 * These modules use `fs`, so they are server-only by construction; import them
 * from Server Components and route handlers, never from a Client Component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parse as parseYaml } from 'yaml';

import type { DeclaredClaim, MarketplaceSettings, Seller } from './types';
import {
  LISTING_CATEGORIES,
  MATERIAL_FORMS,
  PROVENANCE_SOURCE_TYPES,
  VERIFICATION_STATUSES,
} from './types';
import {
  ISO_COUNTRIES,
  ISO_DATE_RE,
  SLUG_RE,
  isNonEmptyString,
  isNonNegativeInteger,
  isPositiveInteger,
} from './validate';

// `process.cwd()` is the repo root during `next build` and `next dev`.
export const MARKETPLACE_DIR = join(process.cwd(), '_marketplace');

export function fail(file: string, message: string): never {
  throw new Error(`[lib/marketplace] malformed _marketplace/${file}: ${message}`);
}

export function readText(file: string): string {
  try {
    return readFileSync(join(MARKETPLACE_DIR, file), 'utf8');
  } catch (err) {
    throw new Error(
      `[lib/marketplace] could not read _marketplace/${file}: ${(err as Error).message}`,
    );
  }
}

function readYaml<T>(file: string): T {
  return parseYaml(readText(file)) as T;
}

/** Memoise a zero-arg loader so the file is read & parsed at most once per process. */
export function once<T>(fn: () => T): () => T {
  let cached: { value: T } | undefined;
  return () => (cached ??= { value: fn() }).value;
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Build date as 'YYYY-MM-DD' (UTC): the reference point for the no-future-dates rule. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The unknown-key law (DESIGN §3.1 rule 6 / §3.2): a typo'd `purity_percent`
 * must fail the build, not silently drop a trust field. Rejects keys outside
 * `allowed` (listing the allowed set) and requires every key in `required`.
 */
export function checkKeys(
  file: string,
  obj: Record<string, unknown>,
  label: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      fail(
        file,
        `${label} has unknown key "${key}", allowed keys: ${allowed.join(', ')}`,
      );
    }
  }
  for (const key of required) {
    if (!(key in obj) || obj[key] === undefined) {
      fail(file, `${label} is missing required key "${key}"`);
    }
  }
}

/** Require a non-empty string; the message names the field path. */
export function reqString(file: string, field: string, value: unknown): string {
  if (!isNonEmptyString(value)) {
    return fail(
      file,
      `"${field}" must be a non-empty string (got ${JSON.stringify(value)})`,
    );
  }
  return value;
}

/** Null, or a non-empty string. Empty strings fail: author `null`, not `""`. */
export function nullableString(
  file: string,
  field: string,
  value: unknown,
): string | null {
  if (value === null) return null;
  if (!isNonEmptyString(value)) {
    return fail(
      file,
      `"${field}" must be null or a non-empty string (got ${JSON.stringify(value)})`,
    );
  }
  return value;
}

/** Require a member of `allowed`; the failure message lists the allowed set. */
export function reqEnum<T extends string>(
  file: string,
  field: string,
  value: unknown,
  allowed: readonly T[],
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fail(
    file,
    `"${field}" is ${JSON.stringify(value)}, allowed: ${allowed.join(', ')}`,
  );
}

/** Null, or a member of `allowed`. */
export function nullableEnum<T extends string>(
  file: string,
  field: string,
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (value === null) return null;
  return reqEnum(file, field, value, allowed);
}

/**
 * Require a quoted ISO 'YYYY-MM-DD' string. A `Date` instance means the YAML
 * value was unquoted and the parser (js-yaml, under gray-matter) converted it;
 * which serialises to a timestamp and can shift a day across timezones
 * (DESIGN §2.5), so it fails with the exact fix.
 */
export function reqISODate(file: string, field: string, value: unknown): string {
  if (value instanceof Date) {
    return fail(
      file,
      `"${field}" must be a quoted ISO date string ("YYYY-MM-DD"); YAML parsed the unquoted date into a Date object, quote it`,
    );
  }
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
    return fail(
      file,
      `"${field}" must be a quoted ISO date string ("YYYY-MM-DD"), got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

/**
 * Null, or an uppercase ISO-3166-1 alpha-2 code. Null is a legitimate value
 * ("Not stated"): the loader never extends an origin claim the source did not
 * make (PLAN "Schema deltas").
 */
export function nullableCountry(
  file: string,
  field: string,
  value: unknown,
): string | null {
  if (value === null) return null;
  const code = reqString(file, field, value);
  if (!ISO_COUNTRIES.has(code)) {
    const upper = code.toUpperCase();
    return fail(
      file,
      `"${field}" ("${code}") is not an ISO-3166-1 alpha-2 code${
        ISO_COUNTRIES.has(upper) ? `, use uppercase "${upper}"` : ''
      }`,
    );
  }
  return code;
}

// ── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_KEYS = [
  'currency',
  'expected_listings',
  'catalog_average_min_sample',
  'catalog_average_min_variants',
  'stale_listing_days',
  'category_labels',
  'form_labels',
  'source_type_labels',
  'verification_labels',
] as const;

/**
 * Every enum member must carry a label, and no label may point at a
 * non-member: adding a category without a label (or with a typo'd key) fails
 * loudly (DESIGN §3.1 rule 35).
 */
function readLabelMap<K extends string>(
  file: string,
  value: unknown,
  field: string,
  members: readonly K[],
): Record<K, string> {
  if (!isObject(value)) {
    return fail(file, `"${field}" must be a mapping of { member: label }`);
  }
  for (const key of Object.keys(value)) {
    if (!(members as readonly string[]).includes(key)) {
      fail(
        file,
        `"${field}" has unknown key "${key}", allowed keys: ${members.join(', ')}`,
      );
    }
  }
  const out = {} as Record<K, string>;
  for (const member of members) {
    out[member] = reqString(file, `${field}.${member}`, value[member]);
  }
  return out;
}

export const loadMarketplaceSettings = once<MarketplaceSettings>(() => {
  const file = 'settings.yml';
  const data = readYaml<unknown>(file);
  if (!isObject(data)) fail(file, 'expected a top-level mapping of settings');
  checkKeys(file, data, 'settings', SETTINGS_KEYS);

  if (data.currency !== 'USD') {
    fail(file, `"currency" is ${JSON.stringify(data.currency)}, allowed: USD`);
  }
  if (!isNonNegativeInteger(data.expected_listings)) {
    fail(
      file,
      `"expected_listings" must be a non-negative integer (got ${JSON.stringify(data.expected_listings)})`,
    );
  }
  if (!isPositiveInteger(data.catalog_average_min_sample)) {
    fail(
      file,
      `"catalog_average_min_sample" must be a positive integer (got ${JSON.stringify(data.catalog_average_min_sample)})`,
    );
  }
  if (!isPositiveInteger(data.catalog_average_min_variants)) {
    fail(
      file,
      `"catalog_average_min_variants" must be a positive integer (got ${JSON.stringify(data.catalog_average_min_variants)})`,
    );
  }
  if (!isPositiveInteger(data.stale_listing_days)) {
    fail(
      file,
      `"stale_listing_days" must be a positive integer (got ${JSON.stringify(data.stale_listing_days)})`,
    );
  }

  return {
    currency: 'USD',
    expectedListings: data.expected_listings,
    catalogAverageMinSample: data.catalog_average_min_sample,
    catalogAverageMinVariants: data.catalog_average_min_variants,
    staleListingDays: data.stale_listing_days,
    categoryLabels: readLabelMap(file, data.category_labels, 'category_labels', LISTING_CATEGORIES),
    formLabels: readLabelMap(file, data.form_labels, 'form_labels', MATERIAL_FORMS),
    sourceTypeLabels: readLabelMap(
      file,
      data.source_type_labels,
      'source_type_labels',
      PROVENANCE_SOURCE_TYPES,
    ),
    verificationLabels: readLabelMap(
      file,
      data.verification_labels,
      'verification_labels',
      VERIFICATION_STATUSES,
    ),
  };
});

// ── Sellers ──────────────────────────────────────────────────────────────────

const SELLER_KEYS = [
  'handle',
  'display_name',
  'country',
  'member_since',
  'verified',
  'verification_basis',
  'contact_email',
  'avatar',
  'tagline',
  'declared_claims',
] as const;

const AVATAR_KEYS = ['path', 'alt', 'width', 'height'] as const;
const CLAIM_KEYS = ['label', 'value', 'basis'] as const;

/**
 * Optional long bio: the markdown body of `_marketplace/sellers/<handle>.md`
 * (front matter, if any, is ignored, DESIGN §1). Null when the file is absent
 * or its body is blank. `handle` is regex-validated before this is called, so
 * the filename cannot be a traversal vector.
 */
function loadSellerBio(handle: string): string | null {
  const path = join(MARKETPLACE_DIR, 'sellers', `${handle}.md`);
  if (!existsSync(path)) return null;
  const body = matter(readFileSync(path, 'utf8')).content.trim();
  return body === '' ? null : body;
}

function parseSeller(file: string, row: unknown, index: number): Seller {
  if (!isObject(row)) fail(file, `seller ${index} is not a mapping`);
  const label = isNonEmptyString(row.handle) ? `seller "${row.handle}"` : `seller ${index}`;
  checkKeys(file, row, label, SELLER_KEYS);

  const handle = reqString(file, `${label}.handle`, row.handle);
  if (!SLUG_RE.test(handle) || handle.length < 2 || handle.length > 32) {
    fail(
      file,
      `${label}.handle must match ${SLUG_RE} and be 2-32 characters (got "${handle}")`,
    );
  }

  const displayName = reqString(file, `${label}.display_name`, row.display_name);
  const country = nullableCountry(file, `${label}.country`, row.country);
  if (country === null) {
    // Seller.country is non-nullable: a seller without a stated country is not
    // publishable (unlike listing provenance, where null renders "Not stated").
    fail(file, `${label}.country must be an uppercase ISO-3166-1 alpha-2 code, not null`);
  }
  const memberSince = reqISODate(file, `${label}.member_since`, row.member_since);

  if (typeof row.verified !== 'boolean') {
    fail(
      file,
      `${label}.verified must be a boolean (got ${JSON.stringify(row.verified)})`,
    );
  }
  const verificationBasis = nullableString(
    file,
    `${label}.verification_basis`,
    row.verification_basis,
  );
  if (row.verified && verificationBasis === null) {
    fail(
      file,
      `${label} has verified: true but no "verification_basis", state exactly what "verified" covers`,
    );
  }

  const contactEmail = reqString(file, `${label}.contact_email`, row.contact_email);
  if (!contactEmail.includes('@')) {
    fail(file, `${label}.contact_email ("${contactEmail}") does not look like an email address`);
  }

  if (!isObject(row.avatar)) fail(file, `${label}.avatar must be a mapping`);
  checkKeys(file, row.avatar, `${label}.avatar`, AVATAR_KEYS);
  const avatarPath = reqString(file, `${label}.avatar.path`, row.avatar.path);
  const avatarPrefix = `/assets/marketplace/sellers/${handle}/`;
  if (!avatarPath.startsWith(avatarPrefix)) {
    fail(file, `${label}.avatar.path must start "${avatarPrefix}" (got "${avatarPath}")`);
  }
  if (!existsSync(join(process.cwd(), 'public', avatarPath))) {
    fail(
      file,
      `${label}.avatar.path points at a file that does not exist: public${avatarPath}`,
    );
  }
  const avatarAlt = reqString(file, `${label}.avatar.alt`, row.avatar.alt);
  if (!isPositiveInteger(row.avatar.width) || !isPositiveInteger(row.avatar.height)) {
    fail(
      file,
      `${label}.avatar width/height must be positive integers (intrinsic pixels; got ${JSON.stringify(row.avatar.width)} × ${JSON.stringify(row.avatar.height)})`,
    );
  }

  const tagline = reqString(file, `${label}.tagline`, row.tagline);

  if (!Array.isArray(row.declared_claims)) {
    fail(file, `${label}.declared_claims must be a list (it may be empty)`);
  }
  const declaredClaims: DeclaredClaim[] = row.declared_claims.map((claim, j) => {
    const claimLabel = `${label}.declared_claims[${j}]`;
    if (!isObject(claim)) fail(file, `${claimLabel} is not a mapping`);
    checkKeys(file, claim, claimLabel, CLAIM_KEYS);
    if (claim.basis !== 'seller-declared') {
      fail(
        file,
        `${claimLabel}.basis is ${JSON.stringify(claim.basis)}, allowed: seller-declared`,
      );
    }
    return {
      label: reqString(file, `${claimLabel}.label`, claim.label),
      value: reqString(file, `${claimLabel}.value`, claim.value),
      basis: 'seller-declared',
    };
  });

  return {
    handle,
    displayName,
    country,
    memberSince,
    verified: row.verified,
    verificationBasis,
    contactEmail,
    avatar: {
      path: avatarPath,
      alt: avatarAlt,
      width: row.avatar.width,
      height: row.avatar.height,
    },
    tagline,
    declaredClaims,
    bio: loadSellerBio(handle),
  };
}

export const loadSellers = once<Seller[]>(() => {
  const file = 'sellers.yml';
  const data = readYaml<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level list of sellers');
  const sellers = data.map((row, i) => parseSeller(file, row, i));

  const seen = new Set<string>();
  for (const seller of sellers) {
    if (seen.has(seller.handle)) fail(file, `duplicate seller handle "${seller.handle}"`);
    seen.add(seller.handle);
  }
  return sellers;
});
