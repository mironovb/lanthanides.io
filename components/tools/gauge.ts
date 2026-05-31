/**
 * Price-gauge tool — pure, framework-agnostic helpers shared by the server page
 * (app/tools/price-gauge/page.tsx) and the client form (PriceGaugeForm.tsx).
 *
 * Nothing here does I/O or imports the server-only data layer, so it is safe in
 * the client bundle: the page reads `_data/` and passes the derived structures
 * down. These helpers only echo and validate the request into a ready-to-run
 * `PriceGaugeInput` — the estimate itself is produced by the engine
 * (`lib/price-gauge` → `estimatePrice`), which never fabricates a price
 * (CLAUDE.md hard rule #1).
 */
import type { PriceGaugeInput, TierBand } from '@/lib/price-gauge';
import type { Element, PriceRecord } from '@/lib/types';

// ── Quantity units ────────────────────────────────────────────────────────────

export type UnitValue = 'g' | 'kg' | 't';

export interface UnitDef {
  value: UnitValue;
  /** Long label for the <option>. */
  label: string;
  /** Multiplier to kilograms. */
  perKg: number;
}

export const UNITS: readonly UnitDef[] = [
  { value: 'g', label: 'grams (g)', perKg: 0.001 },
  { value: 'kg', label: 'kilograms (kg)', perKg: 1 },
  { value: 't', label: 'tonnes (t)', perKg: 1000 },
];

export const DEFAULT_UNIT: UnitValue = 'kg';

function unitDef(unit: string): UnitDef {
  return UNITS.find((u) => u.value === unit) ?? UNITS[1]; // default: kg
}

/** Parse a quantity string + unit into kilograms; null when not a positive number. */
export function quantityToKg(quantity: string, unit: UnitValue): number | null {
  const n = Number(quantity);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * unitDef(unit).perKg;
}

// ── Tier override options ─────────────────────────────────────────────────────
// `QUANTITY_TIER_THRESHOLD_KG` in the engine is 25 kg; the labels echo that cut.
export const TIER_OPTIONS = [
  { value: '', label: 'Auto — choose from quantity' },
  { value: 'retail', label: 'Retail — small quantity' },
  { value: 'bulk', label: 'Bulk — 25 kg and up' },
] as const;

// ── Per-element availability (drives the form's element + form selects) ───────

export interface ElementOption {
  symbol: string;
  name: string;
  /** Distinct forms present for this element (lower-case), sorted. */
  forms: string[];
  /** Record counts folded into the two methodology bands. */
  retail: number;
  bulk: number;
  total: number;
}

/**
 * Fold a dataset market tier into one of the two methodology bands — mirrors the
 * private `bandOf()` in lib/price-gauge so the form's per-band counts match what
 * the engine will actually estimate over (the function is kept private there).
 */
function bandOf(tier: PriceRecord['market_tier']): TierBand {
  return tier === 'bulk' || tier === 'wholesale' || tier === 'industrial'
    ? 'bulk'
    : 'retail';
}

/**
 * One option per catalog element, carrying the forms it is actually quoted in and
 * how many records sit in each band — everything the form needs to constrain its
 * own selects to real data, so no element/form combination is offered that the
 * dataset can't speak to. Catalog order is preserved.
 */
export function buildElementOptions(
  elements: Element[],
  records: PriceRecord[],
): ElementOption[] {
  const bySymbol = new Map<string, ElementOption>();
  const formSets = new Map<string, Set<string>>();

  for (const el of elements) {
    bySymbol.set(el.symbol, {
      symbol: el.symbol,
      name: el.name,
      forms: [],
      retail: 0,
      bulk: 0,
      total: 0,
    });
  }

  for (const r of records) {
    const opt = bySymbol.get(r.element_symbol);
    if (!opt) continue;
    opt.total += 1;
    if (bandOf(r.market_tier) === 'bulk') opt.bulk += 1;
    else opt.retail += 1;
    const set = formSets.get(r.element_symbol) ?? new Set<string>();
    set.add(r.form.toLowerCase());
    formSets.set(r.element_symbol, set);
  }

  for (const [symbol, set] of formSets) {
    const opt = bySymbol.get(symbol);
    if (opt) opt.forms = [...set].sort();
  }

  return elements.map((el) => bySymbol.get(el.symbol)!);
}

// ── Query parsing / validation (mirrors /api/price-gauge's guarantees) ────────

export interface GaugeValues {
  symbol: string;
  form: string; // '' = any form
  purity: string;
  quantity: string;
  unit: UnitValue;
  tier: '' | TierBand; // '' = auto (derive from quantity)
}

export type GaugeField = 'symbol' | 'form' | 'purity' | 'quantity' | 'tier';

export interface GaugeParse {
  /** The user submitted the form (a gauge param is present in the query). */
  submitted: boolean;
  /** Normalised echo of the inputs, for re-populating the form. */
  values: GaugeValues;
  /** Ready-to-run engine input, or null when a field failed validation. */
  input: PriceGaugeInput | null;
  /** Per-field validation messages, shown inline on the form. */
  fieldErrors: Partial<Record<GaugeField, string>>;
}

export const EMPTY_VALUES: GaugeValues = {
  symbol: '',
  form: '',
  purity: '',
  quantity: '',
  unit: DEFAULT_UNIT,
  tier: '',
};

const QUERY_KEYS: GaugeField[] = ['symbol', 'form', 'purity', 'quantity', 'tier'];

/** First value of a (possibly repeated) query param, trimmed. */
function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? (v[0] ?? '') : (v ?? '')).trim();
}

/**
 * Coerce + validate the raw query params into a `PriceGaugeInput`. Symbol is
 * resolved case-insensitively to its canonical catalog form; form/tier are
 * checked against the dataset; quantity is converted to kg. Any failure sets a
 * field message and leaves `input` null, so the page never runs the engine on a
 * malformed request.
 */
export function parseGaugeQuery(
  raw: Record<string, string | string[] | undefined>,
  ctx: { symbols: string[]; forms: string[] },
): GaugeParse {
  const submitted = QUERY_KEYS.some((k) => k in raw);

  const symbolRaw = first(raw.symbol);
  const formRaw = first(raw.form).toLowerCase();
  const purity = first(raw.purity);
  const quantity = first(raw.quantity);
  const unitRaw = first(raw.unit) as UnitValue;
  const unit: UnitValue = UNITS.some((u) => u.value === unitRaw)
    ? unitRaw
    : DEFAULT_UNIT;
  const tierRaw = first(raw.tier).toLowerCase();

  const fieldErrors: Partial<Record<GaugeField, string>> = {};

  // symbol — required; resolve case-insensitively to the canonical catalog form.
  const symbol =
    ctx.symbols.find((s) => s === symbolRaw) ??
    ctx.symbols.find((s) => s.toLowerCase() === symbolRaw.toLowerCase()) ??
    null;
  if (submitted && !symbolRaw) {
    fieldErrors.symbol = 'Select an element to gauge.';
  } else if (submitted && !symbol) {
    fieldErrors.symbol = `“${symbolRaw}” isn’t a tracked element.`;
  }

  // form — optional; '' / 'any' means all forms in the band. If named, it must
  // be a form the dataset actually carries.
  let form: string | undefined;
  if (formRaw && formRaw !== 'any') {
    if (ctx.forms.includes(formRaw)) form = formRaw;
    else fieldErrors.form = `“${formRaw}” isn’t a form we hold prices for.`;
  }

  // quantity — optional; if present it must be a positive number.
  let quantityKg: number | undefined;
  if (quantity) {
    const kg = quantityToKg(quantity, unit);
    if (kg == null) fieldErrors.quantity = 'Enter a quantity greater than zero.';
    else quantityKg = kg;
  }

  // tier — optional; '' = auto.
  let tier: TierBand | undefined;
  if (tierRaw) {
    if (tierRaw === 'retail' || tierRaw === 'bulk') tier = tierRaw;
    else fieldErrors.tier = `Unknown tier “${tierRaw}”.`;
  }

  const values: GaugeValues = {
    symbol: symbol ?? symbolRaw,
    form: form ?? (formRaw && formRaw !== 'any' ? formRaw : ''),
    purity,
    quantity,
    unit,
    tier: tier ?? '',
  };

  const input: PriceGaugeInput | null =
    submitted && symbol && Object.keys(fieldErrors).length === 0
      ? { symbol, form, purity: purity || null, quantityKg, tier }
      : null;

  return { submitted, values, input, fieldErrors };
}
