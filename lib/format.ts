/**
 * Canonical display formatters: the single source of truth for how strings,
 * prices, quantities, premiums, and dates render across the whole site. Pure, no
 * I/O, safe in both Server and Client Components.
 *
 * Numeric helpers return the bare string; typography (mono, tabular figures,
 * right-alignment) is the `.numeric` house class / the `numeric` prop on
 * `<TD>`/`<TH>`. Editorial surfaces (article cards, timelines, the movements
 * feed) format dates through `formatDate`; dense data tables keep ISO
 * `YYYY-MM-DD` (sortable, monospace, terminal-grade).
 */

/** Capitalise the first character (matches Liquid `| capitalize` on lower-case forms). */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Replace snake_case underscores with spaces (e.g. 'single_source_offer' → 'single source offer'). */
export function humanize(s: string): string {
  return s ? s.replace(/_/g, ' ') : s;
}

/** USD with thousands separators and up to two decimals (no trailing-zero noise, no `$`). */
export function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * USD with a leading `$` (e.g. `$1,234.5`), the common case for a standalone
 * price. Null/undefined/non-finite renders as the honest "n/a" gap (hard rule #1)
 * rather than `$NaN`, so an optional price field can be passed safely.
 */
export function fmtUsdPrice(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? 'n/a' : `$${fmtUsd(n)}`;
}

/** Quoted/MOQ quantity: grams below 1 kg, else kg; the legacy retail-card rule. */
export function fmtQuantity(kg: number): string {
  const grams = Math.round(kg * 1000);
  return grams >= 1000 ? `${kg} kg` : `${grams} g`;
}

/**
 * Retail-premium multiple, truncated to one decimal exactly as the Liquid
 * original did (`retail*10 / bulk` via integer division → `whole.frac`).
 */
export function fmtPremium(premium: number): string {
  return (Math.floor(premium * 10) / 10).toFixed(1);
}

/**
 * Editorial date: "May 31, 2026" (abbreviated month). Parsed in UTC so a bare
 * `YYYY-MM-DD` never shifts a day across timezones, and SSG output is
 * deterministic. Falls back to the raw string if it can't be parsed, so a
 * malformed value surfaces honestly rather than rendering "Invalid Date".
 */
export function formatDate(input: string | Date | undefined | null): string {
  if (!input) return '';
  const date = input instanceof Date ? input : parseDate(input);
  if (!date || Number.isNaN(date.getTime())) {
    return typeof input === 'string' ? input : '';
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function parseDate(value: string): Date | null {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (ymd) {
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])),
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
