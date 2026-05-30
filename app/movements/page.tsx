/**
 * /movements — the Market Movements feed (SSG, Prompt 7). A reverse-chronological
 * feed of factual price-movement and regulatory-change events from
 * _data/movements.yml, with the detection-threshold/window footer and event
 * count. A port of legacy/pages/movements.html.
 *
 * Honest by design: every row is a deterministic summary of what the observation
 * data shows — no editorial interpretation (that lives in /news). The Atom feed
 * at /movements.xml carries the same events.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getMovements } from '@/lib/data';
import { MovementRow } from '@/components/movements/MovementRow';

const DESCRIPTION =
  'Reverse-chronological feed of significant price movements (>10% in 30 days) and regulatory state changes across tracked rare earth and strategic metals. Auto-generated from the underlying observation data — no editorial interpretation.';

export const metadata: Metadata = {
  title: 'Market Movements — Auto-Generated Price & Regulatory Alerts',
  description: DESCRIPTION,
  keywords:
    'rare earth price alerts, price movement feed, strategic metals price spikes, regulatory change feed, rare earth market signals',
  alternates: {
    canonical: '/movements/',
    types: { 'application/atom+xml': '/movements.xml' },
  },
};

export default function MovementsPage() {
  const { config, state, events } = getMovements();
  const threshold = config?.threshold_pct ?? 10;
  const windowLabel = config?.window ?? '30d';
  const total = events.length;

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">Market Movements</span>
      </nav>

      <header className="flex flex-col gap-4 border-b-2 border-fg pb-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-prose">
          <h1 className="font-serif text-3xl font-semibold leading-tight text-fg">
            Market Movements
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Auto-generated factual events from the underlying observation data —
            significant price movements (default threshold {threshold}% over the{' '}
            {windowLabel} window) and regulatory state changes. No editorial
            interpretation: each entry is a deterministic summary of what the
            data shows.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-xs text-fg-dim">
            {total} event{total !== 1 ? 's' : ''}
          </span>
          <a
            href="/movements.xml"
            rel="alternate"
            type="application/atom+xml"
            className="rounded-sm border border-border px-2 py-1 font-mono text-2xs uppercase tracking-wide text-fg-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            <span aria-hidden="true">⏚</span> Atom feed
          </a>
        </div>
      </header>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-fg-muted">
          No movements detected yet. The detector runs as part of the data
          pipeline whenever new price observations land.
        </p>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {events.map((event) => (
              <MovementRow key={event.id} event={event} />
            ))}
          </ul>

          <footer className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-fg-dim">
            <p>
              Detection threshold:{' '}
              <strong className="font-semibold text-fg-muted">
                {threshold}% over {windowLabel}
              </strong>
              . Last detector run:{' '}
              {state?.last_run ? (
                <time dateTime={state.last_run}>{state.last_run}</time>
              ) : (
                'unknown'
              )}
              . See{' '}
              <Link href="/methodology/" className="text-accent hover:text-accent-strong">
                methodology
              </Link>{' '}
              for how movements are aggregated.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}
