/**
 * Public data-access layer over `_data/` — the accessors every page and route
 * handler uses. Read-only; SSG/ISR-friendly (all reads are build-time file
 * reads, memoised per process by `lib/data/load.ts`).
 *
 * Integrity is checked once, lazily, on first access: each accessor calls
 * `ensureVerified()`, which runs `assertDataIntegrity()` a single time and
 * throws if the datasets violate their invariants — so a broken `_data/` fails
 * `npm run build` rather than rendering wrong pages.
 *
 * Server-only (transitively uses `fs`): import from Server Components / route
 * handlers, never from a Client Component.
 */
import { selectReferencePrices } from '../price-gauge';
import {
  loadAllPriceHistory,
  loadElementCatalog,
  loadFluctuationsFile,
  loadNews,
  loadPolicyEvents,
  loadPriceRecords,
  loadRegulatoryNotices,
  loadSourceBreakdown,
  loadSources,
} from './load';
import type {
  CoverageTally,
  Element,
  ElementCategory,
  Fluctuation,
  NewsItem,
  PolicyEvent,
  PremiumLeaderboardRow,
  PriceHistory,
  PriceRecord,
  ReferencePrices,
  RegulatoryNotice,
  Source,
  SourceBreakdown,
} from './types';
import { assertDataIntegrity } from './verify';

export type * from './types';
export { selectReferencePrices } from '../price-gauge';

/** Display/grouping order for the four element categories (matches the legacy grid). */
export const CATEGORY_ORDER: readonly ElementCategory[] = [
  'rare_earth_light',
  'rare_earth_heavy',
  'strategic_metal',
  'semiconductor_metal',
];

// Run the integrity assertions exactly once, on first data access.
const ensureVerified = (() => {
  let done = false;
  return () => {
    if (!done) {
      assertDataIntegrity();
      done = true;
    }
  };
})();

// ── Elements ───────────────────────────────────────────────────────────────

export function getElements(): Element[] {
  ensureVerified();
  return loadElementCatalog();
}

const elementBySymbol = (() => {
  let map: Map<string, Element> | undefined;
  return () =>
    (map ??= new Map(loadElementCatalog().map((e) => [e.symbol, e])));
})();

/** Case-sensitive lookup ('Dy', not 'dy') — symbols are used verbatim in URLs. */
export function getElementBySymbol(symbol: string): Element | null {
  ensureVerified();
  return elementBySymbol().get(symbol) ?? null;
}

/** Elements grouped by category, in `CATEGORY_ORDER`, preserving catalog order within each. */
export function getElementsByCategory(): Record<ElementCategory, Element[]> {
  ensureVerified();
  const grouped = {
    rare_earth_light: [],
    rare_earth_heavy: [],
    strategic_metal: [],
    semiconductor_metal: [],
  } as Record<ElementCategory, Element[]>;
  for (const el of loadElementCatalog()) grouped[el.category].push(el);
  return grouped;
}

// ── Prices ───────────────────────────────────────────────────────────────────

/** All price records, or only those for `symbol` (case-sensitive element symbol). */
export function getPriceRecords(symbol?: string): PriceRecord[] {
  ensureVerified();
  const records = loadPriceRecords();
  return symbol
    ? records.filter((r) => r.element_symbol === symbol)
    : records;
}

export function getPriceHistory(symbol: string): PriceHistory | null {
  ensureVerified();
  return loadAllPriceHistory().get(symbol) ?? null;
}

export function getFluctuation(symbol: string): Fluctuation | null {
  ensureVerified();
  return loadFluctuationsFile().elements[symbol] ?? null;
}

/**
 * Retail/bulk reference prices and the retail premium for an element, via the
 * faithful port of `legacy/_includes/price-selection.html`.
 */
export function getReferencePrices(symbol: string): ReferencePrices {
  ensureVerified();
  return selectReferencePrices(loadPriceRecords(), symbol);
}

// ── Regulatory ───────────────────────────────────────────────────────────────

export function getRegulatoryNotices(): RegulatoryNotice[] {
  ensureVerified();
  return loadRegulatoryNotices();
}

export function getPolicyEvents(): PolicyEvent[] {
  ensureVerified();
  return loadPolicyEvents();
}

/**
 * Elements currently under an active Chinese export-licence requirement
 * (regulatory_status === 'active'). Mirrors the legacy regulatory banner's set —
 * distinct from `getControlledElementCount()` (the broader cn_export_control tally).
 */
export function getRegulatedElements(): Element[] {
  ensureVerified();
  return loadElementCatalog().filter((e) => e.regulatory_status === 'active');
}

// ── Sources & breakdown ──────────────────────────────────────────────────────

export function getSources(): Source[] {
  ensureVerified();
  return loadSources();
}

export function getSourceBreakdown(): SourceBreakdown {
  ensureVerified();
  return loadSourceBreakdown();
}

// ── News ─────────────────────────────────────────────────────────────────────

export function getNews(): NewsItem[] {
  ensureVerified();
  return loadNews();
}

// ── Aggregate counts for the home / dashboard ────────────────────────────────

/** Element count per category, in `CATEGORY_ORDER`. */
export function getCategoryCounts(): Record<ElementCategory, number> {
  ensureVerified();
  const counts = {
    rare_earth_light: 0,
    rare_earth_heavy: 0,
    strategic_metal: 0,
    semiconductor_metal: 0,
  } as Record<ElementCategory, number>;
  for (const el of loadElementCatalog()) counts[el.category] += 1;
  return counts;
}

/**
 * Count of CN-export-controlled elements (cn_export_control === true) — the
 * "CN-controlled" stat on the legacy home page (`_layouts/home.html`).
 */
export function getControlledElementCount(): number {
  ensureVerified();
  return loadElementCatalog().filter((e) => e.cn_export_control).length;
}

/**
 * Elements with both a retail and bulk reference price, ranked by retail premium
 * (retail ÷ bulk) descending. `limit` caps the rows (default: all).
 */
export function getPremiumLeaderboard(limit?: number): PremiumLeaderboardRow[] {
  ensureVerified();
  const records = loadPriceRecords();
  const rows: PremiumLeaderboardRow[] = [];
  for (const el of loadElementCatalog()) {
    const { retailRef, bulkRef, retailPremium } = selectReferencePrices(
      records,
      el.symbol,
    );
    if (retailRef && bulkRef && retailPremium !== null) {
      rows.push({
        symbol: el.symbol,
        name: el.name,
        category: el.category,
        retail_usd_per_kg: retailRef.normalized_usd_per_kg,
        bulk_usd_per_kg: bulkRef.normalized_usd_per_kg,
        premium: retailPremium,
      });
    }
  }
  rows.sort((a, b) => b.premium - a.premium);
  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

/**
 * Element coverage tally by fluctuation `data_quality`. 'none' counts catalog
 * elements that have no fluctuation entry or zero observations.
 */
export function getCoverageTally(): CoverageTally {
  ensureVerified();
  const fluctuations = loadFluctuationsFile().elements;
  const tally: CoverageTally = { rich: 0, moderate: 0, sparse: 0, none: 0 };
  for (const el of loadElementCatalog()) {
    const f = fluctuations[el.symbol];
    if (!f || f.observation_count === 0) {
      tally.none += 1;
    } else {
      tally[f.data_quality] += 1;
    }
  }
  return tally;
}
