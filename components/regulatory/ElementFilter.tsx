'use client';

/**
 * The element-filter chip strip for the regulatory tracker — a port of the
 * `.reg-filter-strip` in legacy/pages/regulatory.html (filtering previously in
 * legacy/assets/js/regulatory-timeline.js). A controlled component: it owns no
 * state, just renders one chip per regulated element plus "All" and reports the
 * selection up to <RegulatoryView>, which filters the notices + timeline.
 *
 * Native <button>s keep it keyboard-accessible (Tab to focus, Enter/Space to
 * activate); `aria-pressed` exposes the active state to assistive tech. Clicking
 * the active element chip again deselects it (back to "All"), matching the
 * legacy toggle behaviour.
 */

export function ElementFilter({
  elements,
  selected,
  onSelect,
}: {
  elements: string[];
  selected: string | null;
  onSelect: (symbol: string | null) => void;
}) {
  const baseChip =
    'rounded-sm border px-2 py-0.5 font-mono text-2xs font-semibold transition-colors';

  return (
    <div className="mb-6 flex flex-col gap-2 border border-border bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3">
      <span
        id="reg-filter-label"
        className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-fg-dim"
      >
        Filter by element
      </span>
      <div
        role="group"
        aria-labelledby="reg-filter-label"
        className="flex flex-wrap gap-1"
      >
        <button
          type="button"
          aria-pressed={selected === null}
          onClick={() => onSelect(null)}
          className={`${baseChip} ${
            selected === null
              ? 'border-accent bg-accent text-base'
              : 'border-border bg-raised text-fg-muted hover:border-accent hover:text-accent-strong'
          }`}
        >
          All
        </button>
        {elements.map((sym) => {
          const active = selected === sym;
          return (
            <button
              key={sym}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : sym)}
              className={`${baseChip} ${
                active
                  ? 'border-accent bg-accent text-base'
                  : 'border-border bg-raised text-fg-muted hover:border-accent hover:text-accent-strong'
              }`}
            >
              {sym}
            </button>
          );
        })}
      </div>
    </div>
  );
}
