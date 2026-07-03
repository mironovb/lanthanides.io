/**
 * Pure helpers for the price-contributions inbox: the input/DTO types and the
 * validation shared VERBATIM by the client form island (ContributionForm) and
 * the API route (/api/contributions), so the two can never drift. No React, no
 * database, no side effects; safe to import from client code.
 *
 * The rules mirror CONTRIBUTING.md's "usable price observation": identifiable
 * source, real observation date, specific form/purity/quantity, no guessed
 * fields. Missing optional fields stay empty (hard rule #1: never fabricate).
 */

export const TIERS = ['retail', 'bulk'] as const;
export type Tier = (typeof TIERS)[number];

export const UNITS = ['kg', 'g', 't', 'lb'] as const;
export type Unit = (typeof UNITS)[number];

/** Raw form/request values, all strings, exactly as a form submits them. */
export interface ContributionInput {
  element: string;
  form: string;
  purity: string;
  quantityKg: string;
  price: string;
  currency: string;
  unit: string;
  tier: string;
  sourceName: string;
  sourceUrl: string;
  observedDate: string;
  submittedBy: string;
  notes: string;
}

export type ContributionField = keyof ContributionInput;

export const EMPTY_INPUT: ContributionInput = {
  element: '',
  form: '',
  purity: '',
  quantityKg: '',
  price: '',
  currency: 'USD',
  unit: 'kg',
  tier: 'retail',
  sourceName: '',
  sourceUrl: '',
  observedDate: '',
  submittedBy: '',
  notes: '',
};

/** A validated, normalised contribution ready to insert. */
export interface CleanContribution {
  element: string;
  form: string;
  purity: string | null;
  quantityKg: number | null;
  price: number;
  currency: string;
  unit: Unit;
  tier: Tier;
  sourceName: string;
  sourceUrl: string | null;
  observedDate: string;
  submittedBy: string | null;
  notes: string | null;
}

/** A stored row, contact-free by construction, as rendered in the queue table. */
export interface ContributionDTO {
  id: number;
  createdAt: string;
  element: string;
  form: string;
  purity: string | null;
  quantityKg: number | null;
  price: number;
  currency: string;
  unit: string;
  tier: string;
  sourceName: string;
  sourceUrl: string | null;
  observedDate: string;
  submittedBy: string | null;
  status: string;
}

const LIMITS = {
  form: 40,
  purity: 40,
  sourceName: 120,
  sourceUrl: 500,
  submittedBy: 60,
  notes: 500,
} as const;

export interface ValidationResult {
  errors: Partial<Record<ContributionField, string>>;
  /** Present only when errors is empty. */
  value?: CleanContribution;
}

/**
 * Validate one submission against the element catalog. `knownSymbols` is the
 * live catalog symbol list (case-sensitive canon); matching is
 * case-insensitive and the canonical casing is what gets stored.
 */
export function validateContribution(
  input: ContributionInput,
  knownSymbols: readonly string[],
): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  // Element: must resolve to a tracked catalog symbol.
  const symbol = input.element.trim();
  const canonical = knownSymbols.find(
    (s) => s.toLowerCase() === symbol.toLowerCase(),
  );
  if (!symbol) errors.element = 'Pick the element the price is for.';
  else if (!canonical) errors.element = `"${symbol}" is not a tracked element.`;

  // Form: required, short free text (metal, oxide, ...).
  const form = input.form.trim().toLowerCase();
  if (!form) errors.form = 'State the material form (metal, oxide, ...).';
  else if (form.length > LIMITS.form)
    errors.form = `Keep the form under ${LIMITS.form} characters.`;

  // Purity: optional short free text.
  const purity = input.purity.trim();
  if (purity.length > LIMITS.purity)
    errors.purity = `Keep the purity under ${LIMITS.purity} characters.`;

  // Quantity: optional positive number of kilograms.
  const quantityRaw = input.quantityKg.trim();
  let quantityKg: number | null = null;
  if (quantityRaw) {
    const q = Number(quantityRaw);
    if (!Number.isFinite(q) || q <= 0)
      errors.quantityKg = 'Quantity must be a positive number of kilograms.';
    else if (q > 10_000_000)
      errors.quantityKg = 'That quantity is implausibly large.';
    else quantityKg = q;
  }

  // Price: required positive number.
  const price = Number(input.price.trim());
  if (!input.price.trim())
    errors.price = 'The observed price is the point: it is required.';
  else if (!Number.isFinite(price) || price <= 0)
    errors.price = 'Price must be a positive number.';
  else if (price >= 1_000_000_000)
    errors.price = 'That price is implausibly large.';

  // Currency: a 3-letter code, stored verbatim (conversion happens at review).
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    errors.currency = 'Use a 3-letter currency code, for example USD.';

  // Unit + tier: closed sets.
  const unit = input.unit.trim().toLowerCase() as Unit;
  if (!UNITS.includes(unit)) errors.unit = 'Pick a unit from the list.';
  const tier = input.tier.trim().toLowerCase() as Tier;
  if (!TIERS.includes(tier)) errors.tier = 'Pick retail or bulk.';

  // Source: an identifiable seller or publisher is required; URL optional.
  const sourceName = input.sourceName.trim();
  if (sourceName.length < 2)
    errors.sourceName = 'Name the seller or publisher so a reviewer can check it.';
  else if (sourceName.length > LIMITS.sourceName)
    errors.sourceName = `Keep the source name under ${LIMITS.sourceName} characters.`;
  const sourceUrl = input.sourceUrl.trim();
  if (sourceUrl) {
    if (sourceUrl.length > LIMITS.sourceUrl)
      errors.sourceUrl = `Keep the URL under ${LIMITS.sourceUrl} characters.`;
    else if (!isHttpUrl(sourceUrl))
      errors.sourceUrl = 'The source URL must start with http:// or https://.';
  }

  // Observed date: a real past-or-today date (36h grace for timezones), and
  // never an ingestion date dressed up as a quote date.
  const observedDate = input.observedDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observedDate)) {
    errors.observedDate = 'Use the date you saw the price, as YYYY-MM-DD.';
  } else {
    const t = Date.parse(`${observedDate}T00:00:00Z`);
    if (
      Number.isNaN(t) ||
      observedDate !== new Date(t).toISOString().slice(0, 10)
    ) {
      errors.observedDate = 'That is not a real calendar date.';
    } else if (t < Date.parse('2000-01-01T00:00:00Z')) {
      errors.observedDate = 'Dates before 2000 are out of scope.';
    } else if (t > Date.now() + 36 * 60 * 60 * 1000) {
      errors.observedDate = 'The observation date cannot be in the future.';
    }
  }

  // Attribution + notes: optional, capped.
  const submittedBy = input.submittedBy.trim();
  if (submittedBy.length > LIMITS.submittedBy)
    errors.submittedBy = `Keep the name under ${LIMITS.submittedBy} characters.`;
  const notes = input.notes.trim();
  if (notes.length > LIMITS.notes)
    errors.notes = `Keep the notes under ${LIMITS.notes} characters.`;

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: {
      element: canonical as string,
      form,
      purity: purity || null,
      quantityKg,
      price,
      currency,
      unit,
      tier,
      sourceName,
      sourceUrl: sourceUrl || null,
      observedDate,
      submittedBy: submittedBy || null,
      notes: notes || null,
    },
  };
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** "60 USD/kg" style price rendering for queue rows; verbatim, no conversion. */
export function fmtContributionPrice(d: ContributionDTO): string {
  const n = d.price >= 100 ? Math.round(d.price).toLocaleString('en-US')
    : d.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${n} ${d.currency}/${d.unit}`;
}
