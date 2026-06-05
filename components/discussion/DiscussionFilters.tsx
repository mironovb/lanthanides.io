import Link from 'next/link';
import { Badge } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import {
  DISCUSSION_CATEGORIES,
  PUBLIC_THREAD_STATUSES,
  categoryLabel,
  statusLabel,
} from './discussion';

const CHIP =
  'inline-flex min-h-8 items-center rounded-sm border px-2.5 py-1 text-xs transition-colors duration-fast';

function hrefFor(key: 'category' | 'status', value: string | null, current: {
  category?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  const category = key === 'category' ? value : current.category;
  const status = key === 'status' ? value : current.status;
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  const query = params.toString();
  return query ? `/discussion/?${query}` : '/discussion/';
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
}: {
  category?: string;
  status?: string;
}) {
  return (
    <div className="grid gap-4 border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p className="eyebrow mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          <FilterLink
            href={hrefFor('category', null, { category, status })}
            active={!category}
          >
            All categories
          </FilterLink>
          {DISCUSSION_CATEGORIES.map((c) => (
            <FilterLink
              key={c.id}
              href={hrefFor('category', c.id, { category, status })}
              active={category === c.id}
            >
              {c.label}
            </FilterLink>
          ))}
        </div>
      </div>

      <div className="sm:min-w-[220px]">
        <p className="eyebrow mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          <FilterLink
            href={hrefFor('status', null, { category, status })}
            active={!status}
          >
            All visible
          </FilterLink>
          {PUBLIC_THREAD_STATUSES.map((s) => (
            <FilterLink
              key={s}
              href={hrefFor('status', s, { category, status })}
              active={status === s}
            >
              {statusLabel(s)}
            </FilterLink>
          ))}
        </div>
      </div>

      {(category || status) && (
        <p className="text-2xs text-fg-dim sm:col-span-2">
          Showing{' '}
          {category ? <Badge>{categoryLabel(category)}</Badge> : 'all categories'}{' '}
          {status ? (
            <>
              with <Badge>{statusLabel(status)}</Badge> status.
            </>
          ) : (
            'across visible statuses.'
          )}
        </p>
      )}
    </div>
  );
}
