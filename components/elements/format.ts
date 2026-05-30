/**
 * Small display formatters shared by the element components. Pure, no I/O, so
 * they are safe in both Server and Client Components.
 */

/** Capitalise the first character (matches Liquid `| capitalize` on lower-case forms). */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Replace snake_case underscores with spaces (e.g. 'single_source_offer' → 'single source offer'). */
export function humanize(s: string): string {
  return s ? s.replace(/_/g, ' ') : s;
}

/** USD/kg with thousands separators and up to two decimals (no trailing-zero noise). */
export function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Quoted/MOQ quantity: grams below 1 kg, else kg — the legacy retail-card rule. */
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
