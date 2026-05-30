/**
 * Dev/build integrity assertions over the loaded datasets.
 *
 * Confirms the invariants the rest of the app relies on:
 *   1. exactly 31 elements load (element_catalog.yml),
 *   2. exactly 238 price records load (price_records.json),
 *   3. every regulated element (regulatory_status === 'active') is named by at
 *      least one regulatory notice's affected/newly-controlled element list.
 *
 * `assertDataIntegrity()` throws on any failure; `lib/data/index.ts` runs it once
 * (memoised) the first time any accessor is called, so a broken dataset fails
 * `npm run build` loudly rather than silently shipping wrong pages. No test
 * framework is pulled in for this.
 */
import {
  loadAllPriceHistory,
  loadElementCatalog,
  loadFluctuationsFile,
  loadMovements,
  loadNews,
  loadPolicyEvents,
  loadPriceRecords,
  loadRegulatoryNotices,
  loadSourceBreakdown,
  loadSources,
} from './load';

const EXPECTED_ELEMENTS = 31;
const EXPECTED_PRICE_RECORDS = 238;

export interface VerifyReport {
  ok: boolean;
  errors: string[];
  counts: {
    elements: number;
    priceRecords: number;
    regulated: number;
    notices: number;
  };
}

export function verifyData(): VerifyReport {
  const elements = loadElementCatalog();
  const priceRecords = loadPriceRecords();
  const notices = loadRegulatoryNotices();

  // Smoke-parse every remaining dataset so a malformed file anywhere in `_data/`
  // surfaces its structural error here, at first access, rather than later.
  loadAllPriceHistory();
  loadFluctuationsFile();
  loadPolicyEvents();
  loadMovements();
  loadNews();
  loadSources();
  loadSourceBreakdown();

  // Union of every element a notice controls (active or suspended), including
  // the newly-controlled escalation list.
  const controlledByNotice = new Set<string>();
  for (const notice of notices) {
    for (const sym of notice.affected_elements ?? []) controlledByNotice.add(sym);
    for (const sym of notice.newly_controlled_elements ?? [])
      controlledByNotice.add(sym);
  }

  const regulated = elements
    .filter((e) => e.regulatory_status === 'active')
    .map((e) => e.symbol);
  const unresolved = regulated.filter((sym) => !controlledByNotice.has(sym));

  const errors: string[] = [];
  if (elements.length !== EXPECTED_ELEMENTS) {
    errors.push(
      `expected ${EXPECTED_ELEMENTS} elements, loaded ${elements.length}`,
    );
  }
  if (priceRecords.length !== EXPECTED_PRICE_RECORDS) {
    errors.push(
      `expected ${EXPECTED_PRICE_RECORDS} price records, loaded ${priceRecords.length}`,
    );
  }
  if (unresolved.length > 0) {
    errors.push(
      `regulated element(s) without a matching regulatory notice: ${unresolved.join(', ')}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    counts: {
      elements: elements.length,
      priceRecords: priceRecords.length,
      regulated: regulated.length,
      notices: notices.length,
    },
  };
}

export function assertDataIntegrity(): void {
  const report = verifyData();
  if (!report.ok) {
    throw new Error(
      `[lib/data] data integrity check failed:\n  - ${report.errors.join('\n  - ')}`,
    );
  }
}
