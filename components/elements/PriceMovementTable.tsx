/**
 * Price Movement panel — the factual rolling-window percent-change table for an
 * element's retail and bulk tiers across 7d / 30d / 90d / 1y windows. A port of
 * legacy/_includes/price-movement-panel.html.
 *
 * Note (AUDIT §3): this is a *table*, not the per-observation line chart — the
 * line chart is deliberately deferred to Prompts 9–10. Missing windows render as
 * "—" rather than a fabricated zero; the panel renders nothing when the element
 * has no fluctuation entry.
 */
import type {
  DataQuality,
  Fluctuation,
  FluctuationTier,
  WindowKey,
} from '@/lib/types';

const TIERS: { key: FluctuationTier; label: string }[] = [
  { key: 'retail', label: 'Retail' },
  { key: 'bulk', label: 'Bulk' },
];

const WINDOWS: WindowKey[] = ['7d', '30d', '90d', '1y'];

const QUALITY_DOT: Record<DataQuality, string> = {
  sparse: 'bg-down',
  moderate: 'bg-risk-medium',
  rich: 'bg-up',
};

export function PriceMovementTable({
  fluctuation,
  symbol,
}: {
  fluctuation: Fluctuation | null;
  symbol: string;
}) {
  if (!fluctuation) return null;

  const quality = fluctuation.data_quality ?? 'sparse';
  const showThrough =
    fluctuation.data_until && fluctuation.data_until !== fluctuation.data_since;

  return (
    <section
      className="mb-6 border border-border bg-surface p-4"
      aria-labelledby={`pm-title-${symbol}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2
          id={`pm-title-${symbol}`}
          className="font-serif text-lg font-semibold text-fg"
        >
          Price Movement
        </h2>
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted"
          title={`Coverage classification: ${fluctuation.observation_count} observation(s) across ${fluctuation.distinct_days} day(s)`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${QUALITY_DOT[quality]}`}
            aria-hidden="true"
          />
          {capitalizeWord(quality)} data
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">
                <span className="sr-only">Tier</span>
              </th>
              {WINDOWS.map((w) => (
                <th
                  key={w}
                  className="px-3 py-2 text-right font-mono text-xs font-semibold uppercase tracking-wide text-fg-dim"
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier, ti) => {
              const block = fluctuation.tiers[tier.key];
              const last = ti === TIERS.length - 1;
              return (
                <tr key={tier.key}>
                  <th
                    scope="row"
                    className={`whitespace-nowrap px-3 py-3 text-left font-semibold text-fg ${
                      last ? '' : 'border-b border-dotted border-border'
                    }`}
                  >
                    {tier.label}
                  </th>
                  {WINDOWS.map((w) => (
                    <MovementCell
                      key={w}
                      window={block?.windows[w] ?? null}
                      borderless={last}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-fg-muted">
        {fluctuation.data_since && (
          <>
            Data available since{' '}
            <time dateTime={fluctuation.data_since}>
              {fluctuation.data_since}
            </time>
            {showThrough && (
              <>
                {' '}
                through{' '}
                <time dateTime={fluctuation.data_until}>
                  {fluctuation.data_until}
                </time>
              </>
            )}
            .{' '}
          </>
        )}
        {fluctuation.observation_count > 0 && (
          <>
            Based on {fluctuation.observation_count} observation
            {fluctuation.observation_count !== 1 ? 's' : ''} across{' '}
            {fluctuation.distinct_days} day
            {fluctuation.distinct_days !== 1 ? 's' : ''}.
          </>
        )}
      </p>
    </section>
  );
}

function MovementCell({
  window,
  borderless,
}: {
  window: Fluctuation['tiers'][FluctuationTier]['windows'][WindowKey];
  borderless: boolean;
}) {
  const border = borderless ? '' : 'border-b border-dotted border-border';

  if (!window) {
    return (
      <td
        className={`px-3 py-3 text-right font-mono text-fg-dim ${border}`}
        title="No qualifying observation in this window"
      >
        —
      </td>
    );
  }

  const abs = Math.abs(window.pct_change).toFixed(1);
  const tip = `${window.start_date} → ${window.end_date} · ${window.confidence} confidence`;
  const cell = `whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-semibold ${border}`;

  if (window.direction === 'up') {
    return (
      <td className={`${cell} text-up`} title={tip}>
        <span aria-hidden="true">▲</span> +{abs}%
      </td>
    );
  }
  if (window.direction === 'down') {
    return (
      <td className={`${cell} text-down`} title={tip}>
        <span aria-hidden="true">▼</span> −{abs}%
      </td>
    );
  }
  return (
    <td className={`${cell} text-neutral`} title={tip}>
      <span aria-hidden="true">—</span> flat
    </td>
  );
}

function capitalizeWord(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
