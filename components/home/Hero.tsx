/**
 * Home hero: the plain masthead from the last deployed static site
 * (_layouts/home.html, .home-hero in _sass/_home.scss). A small eyebrow, a one
 * line headline, a one sentence lede, and a four number stat ribbon. Every
 * number is passed in from the data layer (app/page.tsx); nothing is hard coded.
 *
 * Server component.
 */

export interface HeroProps {
  totalElements: number;
  records: number;
  controlled: number;
  sources: number;
}

export function Hero({
  totalElements,
  records,
  controlled,
  sources,
}: HeroProps) {
  const stats: { value: number; label: string }[] = [
    { value: totalElements, label: 'elements' },
    { value: records, label: 'price records' },
    { value: controlled, label: 'CN-controlled' },
    { value: sources, label: 'data sources' },
  ];

  return (
    <section
      className="border-b border-border pb-8 pt-10 sm:pt-12"
      aria-label="Strategic Materials Ledger"
    >
      <p className="eyebrow text-accent">Strategic Materials Ledger</p>
      <h1 className="mt-3 max-w-[22ch] font-serif text-3xl font-bold leading-tight tracking-tightish text-fg sm:text-4xl">
        Rare earth &amp; critical metal prices, with provenance.
      </h1>
      <p className="mt-3 max-w-[64ch] text-md leading-relaxed text-fg-muted">
        {totalElements} elements across four categories. Retail surveys and bulk
        benchmarks tracked separately. Every record carries a seller, date,
        quantity, and verification status.
      </p>

      {/* Stat ribbon: hairline-divided on wide screens so the four readouts
          scan as one ledger strip; a plain two-column grid on mobile. */}
      <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:flex-wrap sm:gap-0 sm:divide-x sm:divide-border">
        {stats.map((s) => (
          <li
            key={s.label}
            className="flex flex-col gap-0.5 sm:px-8 sm:first:pl-0 sm:last:pr-0"
          >
            <span className="font-mono text-xl font-bold leading-none tracking-tightish tabular-nums text-fg">
              {s.value}
            </span>
            <span className="text-2xs uppercase tracking-wide text-fg-dim">
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
