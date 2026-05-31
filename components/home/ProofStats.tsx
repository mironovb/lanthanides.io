/**
 * Home proof stats — the live coverage readout under the hero (Prompt 13).
 * Every value is computed from lib/data in app/page.tsx and passed in, so the
 * numbers can never drift from the dataset or overstate it (CLAUDE.md hard
 * rule #1). Rendered with the shared <Stat> primitive (mono + tabular figures).
 *
 * Server component.
 */
import { Stat, StatGrid } from '@/components/ui';

export interface ProofStat {
  label: string;
  value: number;
  hint?: string;
}

export function ProofStats({ stats }: { stats: ProofStat[] }) {
  return (
    <section className="mt-14 border-t border-border pt-8">
      <p className="eyebrow">Coverage today</p>
      <StatGrid cols={5} className="mt-5">
        {stats.map((s) => (
          <Stat
            key={s.label}
            label={s.label}
            value={s.value}
            hint={s.hint}
            size="lg"
          />
        ))}
      </StatGrid>
    </section>
  );
}
