/**
 * MarketSnapshot: the compact band of headline ledger figures at the top of
 * /dashboard. Every value is derived from _data/ via lib/data and passed in as
 * a prop (CLAUDE.md hard rule #1); an unresolvable value renders "n/a".
 * Server component, presentational, monochrome.
 */
import { Stat, StatGrid, cn } from '@/components/ui';
import { formatDate } from '@/lib/format';

export interface MarketSnapshotProps {
  /** All tracked catalog elements (the denominator for the two stats). */
  totalElements: number;
  /** Elements with both a retail reference and a bulk benchmark. */
  dualTierElements: number;
  /** Elements with an active or suspended Chinese export-control regime. */
  controlledElements: number;
  /** RFC3339 dataset generation timestamp, or null if it cannot be read. */
  generatedAt: string | null;
  className?: string;
}

export function MarketSnapshot({
  totalElements,
  dualTierElements,
  controlledElements,
  generatedAt,
  className,
}: MarketSnapshotProps) {
  return (
    <section
      aria-label="Market snapshot"
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
        className,
      )}
    >
      {/* Only the dashboard-specific figures: the premium board's denominator
          and the risk matrix's headline. Element and record totals live in the
          home hero ribbon (single owner per stat). */}
      <StatGrid cols={2} className="gap-y-5 p-5">
        <Stat
          label="Priced in both tiers"
          value={dualTierElements}
          hint={`of ${totalElements} tracked elements`}
        />
        <Stat
          label="Under China controls"
          value={controlledElements}
          hint="Active or suspended regime"
        />
      </StatGrid>

      <p className="border-t border-border bg-raised px-5 py-2.5 font-mono text-2xs text-fg-dim">
        Latest data{' '}
        {generatedAt ? (
          <time dateTime={generatedAt} className="text-fg-muted">
            {formatDate(generatedAt)}
          </time>
        ) : (
          <span className="text-fg-dim">n/a</span>
        )}
      </p>
    </section>
  );
}
