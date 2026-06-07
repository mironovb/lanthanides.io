/**
 * MarketSnapshot: a compact band of headline ledger figures at the top of
 * /dashboard, so an analyst can read the shape of the dataset before scrolling
 * into the detail panels. Not a hero: a dense, monochrome readout.
 *
 * Every value is derived from the versioned _data/ files via lib/data and passed
 * in as a prop; nothing here is fabricated (CLAUDE.md hard rule #1). A value that
 * cannot be resolved renders as "n/a", never blank, so a gap is shown not hidden.
 *
 * Deliberately omitted from THIS band: a live discussion-thread count. The board
 * lives in Prisma, and reading it here would couple this build-time, file-derived
 * readout to the database (docs/DASHBOARD-ROADMAP.md §5). The live board instead
 * reaches the dashboard lower down via the CommunityIntel panel — a client island
 * over the force-dynamic /api/dashboard/discussion route (§6) — so these four
 * figures stay file-derived and build-safe even when the database is absent.
 *
 * Server component, presentational. No colour: the dashboard reserves colour for
 * the regulatory risk scale, so a plain count band stays monochrome.
 */
import { Stat, StatGrid, cn } from '@/components/ui';
import { formatDate } from '@/lib/format';

export interface MarketSnapshotProps {
  /** All tracked catalog elements. */
  totalElements: number;
  /** Price records sourced into the dataset (sourced, not all verified). */
  priceRecords: number;
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
  priceRecords,
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
      <StatGrid cols={4} className="gap-y-5 p-5">
        <Stat
          label="Tracked elements"
          value={totalElements}
          hint="Four categories"
        />
        <Stat
          label="Sourced price records"
          value={priceRecords}
          hint="Seller, date, source each"
        />
        <Stat
          label="Priced in both tiers"
          value={dualTierElements}
          hint="Retail and bulk references"
        />
        <Stat
          label="Under China controls"
          value={controlledElements}
          hint="Active or suspended"
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
