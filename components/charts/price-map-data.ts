/**
 * Price Map: server-side model builder.
 *
 * Separate from the pure geometry module so the client island never imports
 * the gauge engine: `bandOf` is the engine's canonical retail/bulk fold
 * (bulk, wholesale, and industrial tiers fold into bulk; everything else into
 * retail), reused here so the map buckets records exactly like the gauge.
 * Note `selectReferencePrices` (the ledger tile picker) intentionally differs:
 * it is a frozen verbatim port that SELECTS single reference records; this
 * builder BUCKETS all of them, and `bandOf` is the bucketing rule.
 */
import type { Element, PriceRecord } from '@/lib/types';
import { bandOf } from '@/lib/price-gauge';
import { CATEGORY_ORDER } from '@/components/elements/categories';
import {
  axisTicks,
  logPct,
  type MapMark,
  type MapRow,
  type PriceMapModel,
} from './price-map';

/** Build the serializable map model from the catalog + all price records. */
export function buildPriceMap(
  elements: Element[],
  records: PriceRecord[],
): PriceMapModel {
  const priced = records.filter((r) => Number.isFinite(r.normalized_usd_per_kg));

  let min = Infinity;
  let max = -Infinity;
  let dateFrom = '';
  let dateTo = '';
  for (const r of priced) {
    if (r.normalized_usd_per_kg < min) min = r.normalized_usd_per_kg;
    if (r.normalized_usd_per_kg > max) max = r.normalized_usd_per_kg;
    if (!dateFrom || r.quote_date < dateFrom) dateFrom = r.quote_date;
    if (!dateTo || r.quote_date > dateTo) dateTo = r.quote_date;
  }

  // Log domain from the data: lo snaps DOWN to the decade below the cheapest
  // observation (keeps the $1 anchor tick; the left margin is small), while hi
  // is the dearest observation plus 5% of the log span as right headroom, so
  // the axis ends just past the last mark instead of at the next mostly-empty
  // decade ([0, ~5.53] today). A degenerate span still yields a drawable
  // one-decade axis.
  let lo = Math.floor(Math.log10(min));
  let hi = Math.log10(max) + 0.05 * (Math.log10(max) - lo);
  if (!(Number.isFinite(lo) && Number.isFinite(hi))) {
    lo = 0;
    hi = 1;
  }
  if (hi <= lo) hi = lo + 1;
  const domain: [number, number] = [lo, hi];

  const bySymbol = new Map<string, PriceRecord[]>();
  for (const r of priced) {
    const list = bySymbol.get(r.element_symbol);
    if (list) list.push(r);
    else bySymbol.set(r.element_symbol, [r]);
  }

  const toMark = (r: PriceRecord): MapMark => ({
    id: r.id,
    price: r.normalized_usd_per_kg,
    pct: logPct(r.normalized_usd_per_kg, domain),
    band: bandOf(r.market_tier),
    form: r.form.toLowerCase(),
    purity: r.purity ?? '',
    seller: r.seller_name,
    date: r.quote_date,
  });

  const rows: MapRow[] = [...elements]
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.atomic_number - b.atomic_number,
    )
    .map((e) => {
      const marks = (bySymbol.get(e.symbol) ?? [])
        .map(toMark)
        .sort((a, b) => a.price - b.price);
      return {
        symbol: e.symbol,
        name: e.name,
        atomicNumber: e.atomic_number,
        category: e.category,
        exportControlStatus: e.export_control_status,
        highDemand: e.high_demand,
        retail: marks.filter((m) => m.band === 'retail'),
        bulk: marks.filter((m) => m.band === 'bulk'),
      };
    });

  return {
    rows,
    domain,
    ticks: axisTicks(domain),
    totals: {
      records: priced.length,
      elements: rows.length,
      dateFrom,
      dateTo,
    },
  };
}
