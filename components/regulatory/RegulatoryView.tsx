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
 * enhancement, exactly as the original promised. Composes the shared FilterChips
 * + SectionHeading primitives (Prompt 12).
 */
import { useMemo, useState } from 'react';
import type { PolicyEvent, RegulatoryNotice } from '@/lib/types';
import { FilterChips, SectionHeading } from '@/components/ui';
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

  const filterOptions = useMemo(
    () => filterElements.map((sym) => ({ value: sym, label: sym })),
    [filterElements],
  );

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
      <FilterChips
        options={filterOptions}
        value={selected}
        onChange={setSelected}
        label="Filter by element"
        className="mt-8"
      />

      <section className="mt-8">
        <SectionHeading
          title="Active Control Regimes"
          count={visibleNotices.length}
          description="Each card represents a distinct regulatory action. Status reflects the current state of each control regime."
        />

        {visibleNotices.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
            {visibleNotices.map((notice) => (
              <RegulatoryNoticeCard key={notice.notice_id} notice={notice} />
            ))}
          </div>
        ) : (
          <EmptyHint symbol={selected} noun="active control regime names" />
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Announcement Timeline"
          count={visibleEvents.length}
          description="All published Chinese export-control announcements affecting rare earths, strategic metals, and semiconductor materials — newest first."
        />

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
    <p className="border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-fg-dim">
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
