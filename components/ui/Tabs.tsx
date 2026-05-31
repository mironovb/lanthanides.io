'use client';

/**
 * Tabs — an accessible tab set following the WAI-ARIA pattern: roving tabindex,
 * Left/Right/Home/End arrow navigation, and `role=tab`/`tabpanel` wiring. All
 * panels stay in the DOM (inactive ones `hidden`) so content is crawlable and
 * focus is preserved. Self-contained/uncontrolled; pass `defaultTabId` to pick
 * the initial tab. Visual style is the terminal underline-tab.
 */
import { useId, useRef, useState } from 'react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  panel: React.ReactNode;
}

export function Tabs({
  tabs,
  defaultTabId,
  label,
  className,
}: {
  tabs: TabItem[];
  defaultTabId?: string;
  /** Accessible name for the tablist. */
  label: string;
  className?: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTabId ?? tabs[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const idx = tabs.findIndex((t) => t.id === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    const id = tabs[next].id;
    setActive(id);
    refs.current[id]?.focus();
  }

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex flex-wrap border-b border-border"
      >
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-fast',
                selected
                  ? 'border-accent text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={panelId(t.id)}
          aria-labelledby={tabId(t.id)}
          hidden={t.id !== active}
          tabIndex={0}
          className="pt-4"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
