/**
 * Home (placeholder). The crown-jewel-forward home page is built in a later
 * prompt (docs/MIGRATION.md §4); this is a coherent, design-system-composed
 * landing that surfaces live coverage counts and routes into the reference
 * surfaces. All figures come from the live data layer (no fabricated data).
 */
import {
  getControlledElementCount,
  getElements,
  getPriceRecords,
  getRegulatedElements,
  getSources,
} from '@/lib/data';
import { Container } from '@/components/layout';
import { Callout, LinkButton, Stat, StatGrid } from '@/components/ui';

export default function HomePage() {
  const elements = getElements().length;
  const priceRecords = getPriceRecords().length;
  const controlled = getControlledElementCount();
  const regulated = getRegulatedElements().length;
  const sources = getSources().length;

  const stats: Array<[string, number]> = [
    ['Elements', elements],
    ['Price records', priceRecords],
    ['CN-controlled', controlled],
    ['Active regulatory', regulated],
    ['Data sources', sources],
  ];

  return (
    <Container as="main" className="py-16">
      <p className="eyebrow">Strategic Materials Ledger</p>

      <h1 className="mt-3 font-serif text-4xl font-semibold text-fg sm:text-5xl">
        lanthanides.io
      </h1>

      <p className="mt-4 max-w-prose text-md leading-relaxed text-fg-muted">
        Sourced pricing, supply-chain risk, and regulatory intelligence for
        rare-earth and strategic materials — open data, fully provenanced, free to
        use.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/elements/" variant="primary">
          Browse elements
        </LinkButton>
        <LinkButton href="/regulatory/">Regulatory tracker</LinkButton>
        <LinkButton href="/data/" variant="ghost">
          Open data
        </LinkButton>
      </div>

      <StatGrid cols={5} className="mt-15">
        {stats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </StatGrid>

      <Callout tone="note" className="mt-15 max-w-prose">
        Migration in progress — the terminal-grade design system is being rolled
        across every page (Prompt 12 of 25). The full home page lands in a later
        prompt; meanwhile, the reference surfaces above are complete.
      </Callout>
    </Container>
  );
}
