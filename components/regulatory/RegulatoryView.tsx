'use client';

/**
 * Interactive shell for the regulatory tracker: owns the selected-element state,
 * renders the filter strip, and filters the notice cards + announcement timeline
 * by `affected_elements` in real time (the work legacy/assets/js/
 * regulatory-timeline.js did over server-rendered DOM).
 *
 * Everything is server-rendered in the initial HTML (this client component is
 * SSR'd with `selected = null`, i.e. all notices + events visible), so the page
 * is fully readable and crawlable without JS — filtering is pure progressive
 * enhancement, exactly as the original promised.
 */
import { useMemo, useState } from 'react';
import type { PolicyEvent, RegulatoryNotice } from '@/lib/types';
import { ElementFilter } from './ElementFilter';
import { RegulatoryNoticeCard } from './RegulatoryNoticeCard';
import { RegulatoryTimeline } from './RegulatoryTimeline';

export function RegulatoryView({
  notices,
  events,
  filterElements,
}: {
  notices: RegulatoryNotice[];
  events: PolicyEvent[];
  filterElements: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const visibleNotices = useMemo(
    () =>
      selected
        ? notices.filter((n) => n.affected_elements.includes(selected))
        : notices,
    [notices, selected],
  );

  const visibleEvents = useMemo(
    () =>
      selected
        ? events.filter((e) => e.affected_elements.includes(selected))
        : events,
    [events, selected],
  );

  return (
    <>
      <ElementFilter
        elements={filterElements}
        selected={selected}
        onSelect={setSelected}
      />

      <section className="mt-8">
        <h2 className="flex items-baseline gap-2 border-b border-border-strong pb-2 font-serif text-xl font-semibold text-fg">
          Active Control Regimes
          <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
            {visibleNotices.length}
          </span>
        </h2>
        <p className="mt-2 max-w-prose text-sm text-fg-muted">
          Each card represents a distinct regulatory action. Status reflects the
          current state of each control regime.
        </p>

        {visibleNotices.length > 0 ? (
          <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
            {visibleNotices.map((notice) => (
              <RegulatoryNoticeCard key={notice.notice_id} notice={notice} />
            ))}
          </div>
        ) : (
          <EmptyHint symbol={selected} noun="active control regime names" />
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-baseline gap-2 border-b border-border-strong pb-2 font-serif text-xl font-semibold text-fg">
          Announcement Timeline
          <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
            {visibleEvents.length}
          </span>
        </h2>
        <p className="mb-4 mt-2 max-w-prose text-sm text-fg-muted">
          All published Chinese export-control announcements affecting rare
          earths, strategic metals, and semiconductor materials — newest first.
        </p>

        {visibleEvents.length > 0 ? (
          <RegulatoryTimeline events={visibleEvents} />
        ) : (
          <EmptyHint symbol={selected} noun="announcement mentions" />
        )}
      </section>
    </>
  );
}

function EmptyHint({ symbol, noun }: { symbol: string | null; noun: string }) {
  return (
    <p className="mt-4 border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-fg-dim">
      No {noun}
      {symbol ? (
        <>
          {' '}
          <span className="font-mono text-fg-muted">{symbol}</span>
        </>
      ) : null}
      .
    </p>
  );
}
