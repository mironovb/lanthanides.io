/**
 * OffersBanner: the feed's headline honesty statement (Prompt 21). It sets
 * expectations plainly: the feed is REAL but SEEDED from the verified price
 * dataset; live internet screening is in development. No "scanned 10,000
 * listings" theatre (CLAUDE.md hard rule #1); it states the actual provenance
 * and counts, derived from the rows the page passes in.
 *
 * Presentational server component. The page computes the counts (from `screen()`
 * + the catalog) and the status (from lib/screening's `SCREENING_BACKEND`).
 */
import Link from 'next/link';

const GITHUB = 'https://github.com/mironovb/lanthanides.io';

export function OffersBanner({
  total,
  elementCount,
  seededCount,
  screenedCount,
}: {
  /** Offers shown. */
  total: number;
  /** Distinct elements represented. */
  elementCount: number;
  /** Rows sourced from the seeded dataset (origin='seed'). */
  seededCount: number;
  /** Rows from live screening (origin='screened'), 0 today. */
  screenedCount: number;
}) {
  return (
    <section
      aria-label="Feed status"
      className="border border-border border-l-4 border-l-accent bg-accent/5 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="eyebrow text-accent-strong">Feed status</p>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-caps text-fg-muted">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          Seeded from dataset
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-caps text-fg-dim">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-neutral"
            aria-hidden="true"
          />
          Live screening: in development
        </span>
      </div>

      <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
        Every offer below is a real, sourced price record from our open
        dataset.{' '}
        <span className="font-mono tabular-nums text-fg">{total}</span> offers
        across{' '}
        <span className="font-mono tabular-nums text-fg">{elementCount}</span>{' '}
        elements, each ranked by value against that element&rsquo;s same-form
        median.{' '}
        {screenedCount === 0 ? (
          <>
            All{' '}
            <span className="font-mono tabular-nums text-fg">{seededCount}</span>{' '}
            are <span className="text-fg">seeded</span> from the verified ledger;
            none come from scanning the open web yet.{' '}
          </>
        ) : (
          <>
            <span className="font-mono tabular-nums text-fg">{screenedCount}</span>{' '}
            are live-screened and{' '}
            <span className="font-mono tabular-nums text-fg">{seededCount}</span>{' '}
            seeded.{' '}
          </>
        )}
        Live screening of external marketplaces (Chinese B2B platforms, eBay, and
        specialty suppliers) is in development. When it lands, screened offers
        will appear here on the same value scale, each labelled by origin.
      </p>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <Link
          href="/methodology/#verification-and-confidence"
          className="font-medium text-accent hover:text-accent-strong"
        >
          How offers are scored →
        </Link>
        <Link href="/data/" className="font-medium text-accent hover:text-accent-strong">
          The dataset behind the feed →
        </Link>
        <a
          href={`${GITHUB}/blob/main/docs/OFFER-SCREENING.md`}
          target="_blank"
          rel="noopener"
          className="font-medium text-accent hover:text-accent-strong"
        >
          Screening architecture →
        </a>
      </p>
    </section>
  );
}
