/**
 * Placeholder home (Prompt 3). The crown-jewel-forward home page is built in
 * Prompt 6 (docs/MIGRATION.md §4). This exists only to keep `npm run build`
 * green while the app shell is stood up.
 *
 * Prompt 4 adds a temporary "data layer self-check" panel below: it exercises
 * `lib/data` at build time (SSG) so the integrity assertions run and the counts
 * are proven against the real `_data/` files. Prompt 6 removes this panel when
 * the real home page lands.
 */
import {
  getCategoryCounts,
  getControlledElementCount,
  getCoverageTally,
  getElements,
  getPremiumLeaderboard,
  getPriceRecords,
  getRegulatedElements,
  getSources,
} from '@/lib/data';

export default function HomePage() {
  const elements = getElements();
  const priceRecords = getPriceRecords();
  const sources = getSources();
  const controlled = getControlledElementCount();
  const regulated = getRegulatedElements();
  const categories = getCategoryCounts();
  const coverage = getCoverageTally();
  const topPremiums = getPremiumLeaderboard(5);

  const stats: Array<[string, string | number]> = [
    ['elements', elements.length],
    ['price records', priceRecords.length],
    ['CN-controlled', controlled],
    ['active regulatory', regulated.length],
    ['data sources', sources.length],
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col justify-center px-6 py-16">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
        Strategic Materials Ledger
      </p>

      <h1 className="mt-3 font-serif text-4xl font-semibold text-fg">
        lanthanides.io
      </h1>

      <p className="mt-4 max-w-prose text-base leading-relaxed text-fg-muted">
        Sourced pricing, supply-chain risk, and regulatory intelligence for
        rare-earth and strategic materials.
      </p>

      <div className="mt-8 inline-flex w-fit items-center gap-2 border border-border bg-surface px-3 py-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-risk-medium"
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-fg-muted">
          Migration in progress — Next.js app shell (Prompt 3 of 25)
        </span>
      </div>

      {/* TEMPORARY — Prompt 4 data-layer self-check; removed in Prompt 6. */}
      <section className="mt-12 border border-border bg-surface p-5">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
          Prompt 4 · data layer self-check
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dd className="font-mono text-2xl text-fg">{value}</dd>
              <dt className="font-mono text-2xs uppercase tracking-wider text-fg-dim">
                {label}
              </dt>
            </div>
          ))}
        </dl>

        <p className="mt-5 font-mono text-2xs text-fg-muted">
          categories — light {categories.rare_earth_light} · heavy{' '}
          {categories.rare_earth_heavy} · strategic {categories.strategic_metal}{' '}
          · semiconductor {categories.semiconductor_metal}
        </p>
        <p className="mt-1 font-mono text-2xs text-fg-muted">
          coverage — rich {coverage.rich} · moderate {coverage.moderate} ·
          sparse {coverage.sparse} · none {coverage.none}
        </p>

        <p className="mt-5 font-mono text-2xs uppercase tracking-wider text-fg-dim">
          top retail premiums (retail ÷ bulk)
        </p>
        <ul className="mt-2 space-y-1">
          {topPremiums.map((row) => (
            <li key={row.symbol} className="font-mono text-xs text-fg-muted">
              <span className="text-fg">{row.symbol}</span> ×
              {row.premium.toFixed(1)} — ${row.retail_usd_per_kg.toLocaleString()}{' '}
              retail / ${row.bulk_usd_per_kg.toLocaleString()} bulk
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
