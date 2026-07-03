'use client';

/**
 * DashboardLens: the client island that scopes the dashboard panels (risk
 * matrix, retail-premium leaderboard, data coverage) by element category and
 * China export-control posture.
 *
 * Server-rendered with EMPTY_LENS so the full dashboard is in the static HTML
 * and usable without JavaScript. The lens reads the URL after hydration (no
 * mismatch) and writes it with the native History API, so a filtered view is
 * shareable and the canonical /dashboard/ returns when cleared.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FilterChips, SectionHeading } from '@/components/ui';
import { CoverageGrid } from '@/components/charts/CoverageGrid';
import { CoverageTable } from '@/components/charts/CoverageTable';
import { PremiumLeaderboard } from '@/components/charts/PremiumLeaderboard';
import { RegulatoryRiskMatrix } from './RegulatoryRiskMatrix';
import type {
  CoverageTally,
  ElementCategory,
  ElementCoverage,
  ExportControlStatus,
  PremiumLeaderboardRow,
} from '@/lib/types';
import {
  CATEGORY_OPTIONS,
  CONTROL_OPTIONS,
  EMPTY_LENS,
  buildRiskMatrix,
  lensActive,
  lensToSearchParams,
  parseLensFromSearch,
  scopeElements,
  type ElementLensMeta,
  type LensFilters,
} from './lens';

export function DashboardLens({
  elements,
  premiums,
  coverage,
}: {
  /** Lean catalog slice (every tracked element), the authoritative scope source. */
  elements: ElementLensMeta[];
  /** Full retail-premium leaderboard (elements priced in both tiers). */
  premiums: PremiumLeaderboardRow[];
  /** Per-element coverage rows (every tracked element). */
  coverage: ElementCoverage[];
}) {
  const [filters, setFilters] = useState<LensFilters>(EMPTY_LENS);

  // Adopt any shared filter from the URL once, after hydration. Done in an
  // effect (not a lazy initializer) so the server HTML and the first client
  // render both show the full, unfiltered dashboard, no hydration mismatch.
  useEffect(() => {
    const fromUrl = parseLensFromSearch(window.location.search);
    if (lensActive(fromUrl)) setFilters(fromUrl);
  }, []);

  function apply(next: LensFilters) {
    setFilters(next);
    const qs = lensToSearchParams(next);
    // Native history update: shareable URL, no server round-trip, and the
    // canonical /dashboard/ (no query) when the lens is cleared. Next 14 syncs
    // these calls with its router.
    const url = window.location.pathname + (qs ? `?${qs}` : '');
    window.history.replaceState(null, '', url);
  }

  const total = elements.length;
  const scope = useMemo(
    () => scopeElements(elements, filters),
    [elements, filters],
  );
  const scopeSymbols = useMemo(
    () => new Set(scope.map((e) => e.symbol)),
    [scope],
  );

  const filteredPremiums = useMemo(
    () => premiums.filter((p) => scopeSymbols.has(p.symbol)),
    [premiums, scopeSymbols],
  );
  const filteredCoverage = useMemo(
    () => coverage.filter((c) => scopeSymbols.has(c.symbol)),
    [coverage, scopeSymbols],
  );
  const filteredTally = useMemo<CoverageTally>(() => {
    const t: CoverageTally = { rich: 0, moderate: 0, sparse: 0, none: 0 };
    for (const c of filteredCoverage) t[c.quality] += 1;
    return t;
  }, [filteredCoverage]);
  const matrix = useMemo(() => buildRiskMatrix(scope), [scope]);

  const active = lensActive(filters);

  return (
    <div>
      {/* ── Lens control ──────────────────────────────────────────────────── */}
      <section aria-label="Element lens" className="mt-8 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Lens</span>
            <span className="text-2xs text-fg-dim">
              Scope the panels below by category or export-control posture
            </span>
          </div>
          <p aria-live="polite" className="font-mono text-2xs text-fg-dim">
            Showing <span className="text-fg-muted">{scope.length}</span> of{' '}
            <span className="text-fg-muted">{total}</span> elements
            {active ? ' (filtered)' : ''}
            {active ? (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => apply(EMPTY_LENS)}
                  className="font-sans underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-fg"
                >
                  Clear
                </button>
              </>
            ) : null}
          </p>
        </div>
        <FilterChips
          label="Category"
          options={CATEGORY_OPTIONS}
          value={filters.category}
          onChange={(v) =>
            apply({ category: v as ElementCategory | null, control: filters.control })
          }
        />
        <FilterChips
          label="Export control"
          options={CONTROL_OPTIONS}
          value={filters.control}
          onChange={(v) =>
            apply({
              category: filters.category,
              control: v as ExportControlStatus | null,
            })
          }
        />
      </section>

      {/* ── Regulatory risk matrix ────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Regulatory risk matrix"
          actions={
            <Link
              href="/regulatory/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Open tracker →
            </Link>
          }
          description={
            active ? (
              <>
                Within the current filter: {scope.length} of {total} tracked
                elements by category and current export-control posture.
              </>
            ) : (
              <>
                All {total} tracked elements by category against current Chinese
                export-control posture. The Regulatory Tracker holds the
                announcement-level detail.
              </>
            )
          }
        />
        {scope.length > 0 ? (
          <RegulatoryRiskMatrix matrix={matrix} />
        ) : (
          <EmptyHint>No elements match this filter.</EmptyHint>
        )}
      </section>

      {/* ── Retail premium leaderboard ────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading
          title="Retail premium leaderboard"
          actions={
            <Link
              href="/elements/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Browse elements →
            </Link>
          }
          description={
            active ? (
              <>
                Latest retail reference ÷ latest bulk benchmark, ranked by
                markup. {filteredPremiums.length} of {premiums.length} dual-tier
                elements fall within the current filter.
              </>
            ) : (
              <>
                Latest retail reference ÷ latest bulk benchmark, ranked by
                markup. {premiums.length} of {total} elements are priced in both
                tiers.
              </>
            )
          }
        />
        {filteredPremiums.length > 0 ? (
          <PremiumLeaderboard rows={filteredPremiums} />
        ) : (
          <EmptyHint>
            No elements in this filter are priced in both tiers. Clear or widen
            the filter.
          </EmptyHint>
        )}
      </section>

      {/* ── Data coverage map ─────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading
          title="Data coverage"
          actions={
            <Link
              href="/data/"
              className="text-xs font-normal text-accent hover:text-accent-strong"
            >
              Open data →
            </Link>
          }
          description="One tile per element in scope, graded by how many distinct days of price observations back it. Each tile links to the element."
        />
        {filteredCoverage.length > 0 ? (
          <>
            <CoverageGrid items={filteredCoverage} tally={filteredTally} />
            <div className="mt-8">
              <SectionHeading
                as="h3"
                title="Coverage detail"
                description="The observations, distinct days, and market tiers behind each grade."
              />
              <CoverageTable items={filteredCoverage} />
            </div>
          </>
        ) : (
          <EmptyHint>No elements match this filter.</EmptyHint>
        )}
      </section>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-fg-dim">
      {children}
    </p>
  );
}
