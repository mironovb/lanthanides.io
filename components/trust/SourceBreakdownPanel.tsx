/**
 * SourceBreakdownPanel: the intake-path mix (`_data/source_breakdown.yml`) as a
 * compact, honest panel (Prompt 16). The detailed prose table lives on
 * /methodology (<SourceBreakdownTable>); this is the at-a-glance companion meant
 * to be reused wherever the dataset's credibility should be legible (home,
 * dashboard, /contribute).
 *
 * Each row is a single-colour bar whose *length* (not colour) carries the share,
 * so it stays inside the design system's "colour = meaning" discipline and reads
 * as an instrument-panel readout, not a pie chart. Counts come from the file
 * verbatim, including the source types that are currently 0 (community
 * submissions, supplier quotes, invoices), shown rather than hidden so the panel
 * never overstates how the data was gathered (CLAUDE.md hard rule #1).
 *
 * Server component; the breakdown is passed in (the page does the I/O), matching
 * the SourceBreakdownTable pattern.
 */
import Link from 'next/link';
import { cn } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { SourceBreakdown } from '@/lib/types';

export function SourceBreakdownPanel({
  breakdown,
  title = 'How the data got here',
  className,
}: {
  breakdown: SourceBreakdown;
  title?: React.ReactNode;
  className?: string;
}) {
  const rows = [...breakdown.by_source_type].sort((a, b) => b.count - a.count);

  return (
    <section className={cn('border border-border bg-surface', className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="eyebrow">Intake mix</p>
          <h3 className="font-serif text-base font-semibold text-fg">{title}</h3>
        </div>
        <span className="shrink-0 font-mono text-2xs tabular-nums text-fg-dim">
          {breakdown.total_observations} obs · {formatDate(breakdown.generated_on)}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.source_type} className="px-4 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  'truncate text-xs font-medium',
                  r.count > 0 ? 'text-fg' : 'text-fg-dim',
                )}
                title={r.description}
              >
                {r.label}
              </span>
              <span className="shrink-0 font-mono text-2xs tabular-nums text-fg-dim">
                {r.count} · {r.percent}%
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full bg-raised" aria-hidden="true">
              <div
                className={cn('h-full', r.count > 0 ? 'bg-accent/70' : 'bg-transparent')}
                style={{ width: `${Math.max(r.percent, 0)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <footer className="border-t border-border px-4 py-2.5 text-2xs leading-relaxed text-fg-dim">
        Every observation is tagged with the path it came through and validated
        the same way. See the{' '}
        <Link
          href="/methodology/#provenance-chain"
          className="text-accent underline decoration-dotted underline-offset-2 hover:text-accent-strong"
        >
          provenance chain
        </Link>
        .
      </footer>
    </section>
  );
}
