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
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { buttonClasses } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { MovementRow } from '@/components/movements/MovementRow';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';

const DESCRIPTION =
  'Reverse-chronological feed of significant price movements (>10% in 30 days) and regulatory state changes across tracked rare earth and strategic metals. Auto-generated from the underlying observation data — no editorial interpretation.';

export const metadata: Metadata = buildMetadata({
  title: 'Market Movements — Auto-Generated Price & Regulatory Alerts',
  description: DESCRIPTION,
  keywords:
    'rare earth price alerts, price movement feed, strategic metals price spikes, regulatory change feed, rare earth market signals',
  path: '/movements/',
});

export default function MovementsPage() {
  const { config, state, events } = getMovements();
  const threshold = config?.threshold_pct ?? 10;
  const windowLabel = config?.window ?? '30d';
  const total = events.length;

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Market Movements', path: '/movements/' }]} />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Market Movements' }]}
        eyebrow="Market Feed"
        title="Market Movements"
        lead={`Auto-generated factual events from the underlying observation data — significant price movements (default threshold ${threshold}% over the ${windowLabel} window) and regulatory state changes. No editorial interpretation: each entry is a deterministic summary of what the data shows.`}
        actions={
          <>
            <span className="font-mono text-xs text-fg-dim">
              {total} event{total !== 1 ? 's' : ''}
            </span>
            <a
              href="/movements.xml"
              rel="alternate"
              type="application/atom+xml"
              className={buttonClasses('secondary', 'sm')}
            >
              <span aria-hidden="true">⏚</span> Atom feed
            </a>
          </>
        }
      >
        <StoryLink>
          These are the facts; for the interpretation behind a move, read{' '}
          <Link href="/news/">News &amp; Analysis</Link>, or trace it to the
          announcement in the <Link href="/regulatory/">Regulatory Tracker</Link>
          .
        </StoryLink>
      </PageHeader>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-fg-muted">
          No movements detected yet. The detector runs as part of the data
          pipeline whenever new price observations land.
        </p>
      ) : (
        <>
          <ul className="mt-8 flex flex-col gap-3">
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
                <time dateTime={state.last_run}>{formatDate(state.last_run)}</time>
              ) : (
                'unknown'
              )}
              . See{' '}
              <Link
                href="/methodology/"
                className="text-accent hover:text-accent-strong"
              >
                methodology
              </Link>{' '}
              for how movements are aggregated.
            </p>
          </footer>
        </>
      )}
    </Container>
  );
}
