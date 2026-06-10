/**
 * DiscussionFilters: the board's query toolbar — a no-JS search box plus the
 * category, status, and sort facets. Everything is a plain GET form / <Link>, so
 * it works without JavaScript and stays crawlable; the server page reads the
 * resulting ?category=&status=&sort=&q= params. Each control preserves the other
 * three axes (the search form via hidden inputs, the chips via discussionHref).
 */
import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import {
  DEFAULT_THREAD_SORT,
  DISCUSSION_CATEGORIES,
  PUBLIC_THREAD_STATUSES,
  SEARCH_MAX_LEN,
  THREAD_SORTS,
  discussionHref,
  statusLabel,
} from './discussion';

const CHIP =
  'inline-flex min-h-8 items-center rounded-sm border px-2.5 py-1 text-xs transition-colors duration-fast';

function FilterLink({
  href,
  active,
  title,
  children,
}: {
  href: string;
  active: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? 'true' : undefined}
      className={cn(
        CHIP,
        active
          ? 'border-accent bg-accent/10 text-accent-strong'
          : 'border-border bg-raised text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
    </Link>
  );
}

export function DiscussionFilters({
  category,
  status,
  sort,
  q,
}: {
  category?: string;
  status?: string;
  sort: string;
  q?: string;
}) {
  const current = { category, status, sort, q };

  return (
    <div className="border border-border bg-surface">
      {/* ── Search (plain GET form; works without JS) ───────────────────────── */}
      <form
        method="get"
        action="/discussion/"
        role="search"
        aria-label="Search discussion threads"
        className="flex flex-wrap items-end gap-2 border-b border-border p-3"
      >
        {/* Carry the active facets forward so search keeps the current view. */}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {sort && sort !== DEFAULT_THREAD_SORT ? (
          <input type="hidden" name="sort" value={sort} />
        ) : null}

        <div className="min-w-[14rem] grow">
          <label
            htmlFor="dq-search"
            className="mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim"
          >
            Search
          </label>
          <input
            id="dq-search"
            type="search"
            name="q"
            defaultValue={q ?? ''}
            maxLength={SEARCH_MAX_LEN}
            placeholder="Title, note, author, or organization"
            className="w-full rounded-sm border border-border-field bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast focus-visible:border-accent focus-visible:outline-none"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <Link
            href={discussionHref({ ...current, q: null })}
            className="self-center text-2xs font-medium text-fg-dim underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-fg"
          >
            Clear search
          </Link>
        ) : null}
      </form>

      {/* ── Facets: category · status · sort ────────────────────────────────── */}
      <div className="grid gap-4 p-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="eyebrow mb-2">Category</p>
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            <FilterLink
              href={discussionHref({ ...current, category: null })}
              active={!category}
            >
              All categories
            </FilterLink>
            {DISCUSSION_CATEGORIES.map((c) => (
              <FilterLink
                key={c.id}
                href={discussionHref({ ...current, category: c.id })}
                active={category === c.id}
                title={c.description}
              >
                {c.label}
              </FilterLink>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Status</p>
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
            <FilterLink
              href={discussionHref({ ...current, status: null })}
              active={!status}
            >
              All visible
            </FilterLink>
            {PUBLIC_THREAD_STATUSES.map((s) => (
              <FilterLink
                key={s}
                href={discussionHref({ ...current, status: s })}
                active={status === s}
              >
                {statusLabel(s)}
              </FilterLink>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Sort</p>
          <div role="group" aria-label="Sort threads" className="flex flex-wrap gap-2">
            {THREAD_SORTS.map((s) => (
              <FilterLink
                key={s.id}
                href={discussionHref({ ...current, sort: s.id })}
                active={(sort || DEFAULT_THREAD_SORT) === s.id}
                title={s.description}
              >
                {s.label}
              </FilterLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
