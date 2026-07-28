'use client';

/**
 * MarketplaceView: the interactive shell of /marketplace/ — filter chips for
 * element / category / form, min/max USD bounds, a debounced free-text search
 * over the serialised `search_text` haystack (the exact field the listings API
 * matches, so island and endpoint can never disagree), a native sort select,
 * and the card grid.
 *
 * The RegulatoryView contract, preserved exactly: this component is SSR'd with
 * every filter cleared, so the complete grid ships in the initial HTML and the
 * page reads, crawls, and works with JavaScript disabled — filtering is pure
 * progressive enhancement. Props are plain serialised DTOs; no `fs`, no
 * `lib/marketplace` runtime import crosses the client boundary.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ListingSummaryDto } from '@/lib/marketplace/serialize';
import { Button, FilterChips, SectionHeading } from '@/components/ui';
import { ListingCard } from './ListingCard';
import {
  type ElementVariantMap,
  type MarketplaceLabels,
  type MarketplaceSort,
  SORT_OPTIONS,
  compareListings,
  parseUsdToCents,
} from './marketplace';

/** Facet values actually present in the catalog (derived server-side). */
export interface MarketplaceViewFacets {
  elements: string[];
  categories: string[];
  forms: string[];
}

const FIELD =
  'h-11 w-full rounded-sm border border-border-field bg-surface px-2.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast focus-visible:border-accent';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';

export function MarketplaceView({
  listings,
  facets,
  labels,
  elementVariants,
}: {
  listings: ListingSummaryDto[];
  facets: MarketplaceViewFacets;
  labels: MarketplaceLabels;
  elementVariants: ElementVariantMap;
}) {
  const [element, setElement] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [form, setForm] = useState<string | null>(null);
  const [minUsd, setMinUsd] = useState('');
  const [maxUsd, setMaxUsd] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<MarketplaceSort>('newest');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const elementOptions = useMemo(
    () => facets.elements.map((sym) => ({ value: sym, label: sym })),
    [facets.elements],
  );
  const categoryOptions = useMemo(
    () =>
      facets.categories.map((c) => ({
        value: c,
        label: labels.categories[c as keyof MarketplaceLabels['categories']] ?? c,
      })),
    [facets.categories, labels.categories],
  );
  const formOptions = useMemo(
    () =>
      facets.forms.map((f) => ({
        value: f,
        label: labels.forms[f as keyof MarketplaceLabels['forms']] ?? f,
      })),
    [facets.forms, labels.forms],
  );

  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    const minCents = parseUsdToCents(minUsd);
    const maxCents = parseUsdToCents(maxUsd);
    const matched = listings.filter(
      (l) =>
        (element === null || l.elements.includes(element)) &&
        (category === null || l.category === category) &&
        (form === null || l.form === form) &&
        (minCents === null || l.price_from_cents >= minCents) &&
        (maxCents === null || l.price_from_cents <= maxCents) &&
        (needle === '' || l.search_text.includes(needle)),
    );
    return [...matched].sort((a, b) => compareListings(sort, a, b));
  }, [listings, element, category, form, minUsd, maxUsd, debouncedQuery, sort]);

  const hasFilters =
    element !== null ||
    category !== null ||
    form !== null ||
    minUsd !== '' ||
    maxUsd !== '' ||
    query !== '';

  function clearFilters() {
    setElement(null);
    setCategory(null);
    setForm(null);
    setMinUsd('');
    setMaxUsd('');
    setQuery('');
    setDebouncedQuery('');
  }

  return (
    <>
      <FilterChips
        options={elementOptions}
        value={element}
        onChange={setElement}
        label="Element"
        className="mt-8"
      />
      <FilterChips
        options={categoryOptions}
        value={category}
        onChange={setCategory}
        label="Category"
        className="mt-2"
      />
      <FilterChips
        options={formOptions}
        value={form}
        onChange={setForm}
        label="Form"
        className="mt-2"
      />

      {/* Price bounds, free text, sort — 44px-tall controls, all labelled. */}
      <div className="mt-2 grid grid-cols-2 gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-sm sm:grid-cols-[1fr_6.5rem_6.5rem_auto] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="marketplace-q" className={LABEL}>
            Search
          </label>
          <input
            id="marketplace-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, element, spec…"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="marketplace-min" className={LABEL}>
            Min USD
          </label>
          <input
            id="marketplace-min"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={minUsd}
            onChange={(e) => setMinUsd(e.target.value)}
            placeholder="0"
            className={`${FIELD} numeric text-left`}
          />
        </div>
        <div>
          <label htmlFor="marketplace-max" className={LABEL}>
            Max USD
          </label>
          <input
            id="marketplace-max"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={maxUsd}
            onChange={(e) => setMaxUsd(e.target.value)}
            placeholder="Any"
            className={`${FIELD} numeric text-left`}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="marketplace-sort" className={LABEL}>
            Sort
          </label>
          <select
            id="marketplace-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as MarketplaceSort)}
            className={FIELD}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="mt-8">
        <SectionHeading
          title="Listings"
          count={visible.length}
          description="Every price is the seller's catalog price for that pack size."
        />

        {visible.length > 0 ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
            {visible.map((dto) => (
              <ListingCard
                key={dto.slug}
                dto={dto}
                labels={labels}
                elementVariants={elementVariants}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border bg-surface px-4 py-10 text-center">
            <p className="text-sm text-fg-dim">No listings match these filters.</p>
            {hasFilters ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
