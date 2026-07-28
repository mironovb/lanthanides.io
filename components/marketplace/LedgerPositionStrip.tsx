/**
 * LedgerPositionStrip: the detail-page signature strip — a horizontal track
 * representing the ledger's retail band ([low → high] shaded, mid tick) with
 * the listing's own per-kg price as a diamond marker. Marker colour encodes
 * price position (the site's meaning-bearing use of colour): below mid →
 * `up` green, above → `down` red, within the band → neutral.
 *
 * Scale maps [min(low, listing)×0.9 → max(high, listing)×1.1] linearly, but
 * the domain never stretches further than 3× beyond the band — retail
 * specimen prices can sit at 28× the industrial ledger mid, and an uncapped
 * scale would crush the band to a sliver. A listing beyond the capped domain
 * clamps to the track edge with an off-scale chevron; the caption always
 * prints the real numbers. Pure CSS widths, no animation; the track is
 * aria-hidden — the caption row carries every figure as text.
 */
import { fmtUsdPrice } from '@/lib/format';
import type { LedgerComparisonDto } from '@/lib/marketplace/serialize';

const ZONE_MARKER: Record<LedgerComparisonDto['zone'], string> = {
  below: 'bg-up',
  within: 'bg-neutral',
  above: 'bg-down',
};

export function LedgerPositionStrip({
  comparison,
}: {
  comparison: LedgerComparisonDto;
}) {
  const listingPerKg = comparison.listing_per_kg_usd;
  const low = comparison.ledger_low_usd_per_kg;
  const mid = comparison.ledger_mid_usd_per_kg;
  const high = comparison.ledger_high_usd_per_kg;

  // Domain: pad around band ∪ listing, capped at 3× beyond the band.
  const lo = Math.max(Math.min(low, listingPerKg) * 0.9, low / 3);
  const hi = Math.min(Math.max(high, listingPerKg) * 1.1, high * 3);
  const span = hi - lo || 1;
  const pct = (x: number) => ((x - lo) / span) * 100;
  const clampPct = (p: number) => Math.min(98, Math.max(2, p));
  const offLow = listingPerKg < lo;
  const offHigh = listingPerKg > hi;

  const records = `${comparison.matched_records} record${
    comparison.matched_records === 1 ? '' : 's'
  }`;
  const nearestForm =
    comparison.match_mode === 'form-widened' ? ' (nearest form)' : '';

  return (
    <div className="mt-4">
      <div aria-hidden="true" className="relative">
        <div className="relative h-2 rounded-sm border border-border bg-raised">
          {/* Ledger retail band (always inside the domain by construction) */}
          <span
            className="absolute inset-y-0 border-x border-accent bg-accent/15"
            style={{
              left: `${pct(low)}%`,
              width: `${Math.max(0, pct(high) - pct(low))}%`,
            }}
          />
          {/* Mid tick */}
          <span
            className="absolute inset-y-0 w-px bg-fg-dim"
            style={{ left: `${pct(mid)}%` }}
          />
          {/* This listing (clamped to the edge when off-scale) */}
          <span
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${ZONE_MARKER[comparison.zone]}`}
            style={{ left: `${clampPct(pct(listingPerKg))}%` }}
          />
        </div>
        {/* Off-scale chevrons */}
        {offLow ? (
          <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm leading-none text-fg-dim">
            ‹
          </span>
        ) : null}
        {offHigh ? (
          <span className="absolute -right-3.5 top-1/2 -translate-y-1/2 font-mono text-sm leading-none text-fg-dim">
            ›
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-fg-muted">
        <span>
          {fmtUsdPrice(listingPerKg)}/kg this listing (
          {comparison.variant_label_basis})
        </span>
        <span>
          ledger {fmtUsdPrice(low)}–{fmtUsdPrice(high)}/kg · mid{' '}
          {fmtUsdPrice(mid)} · {records}
          {nearestForm} · {comparison.confidence} confidence
        </span>
      </div>

      <p className="mt-1 text-2xs leading-relaxed text-fg-dim">
        {comparison.basis_note}
      </p>
    </div>
  );
}
