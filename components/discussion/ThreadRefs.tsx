/**
 * ThreadRefs: the linked-reference chips for one discussion thread — an element
 * chip (to its reference page) and a control-notice chip (to that notice on the
 * regulatory tracker). Shared by the board list and the thread detail header so
 * both render the links identically.
 *
 * These are navigational links into the reference site, NOT provenance rows: a
 * linked element or notice never means the open dataset changed. The copy that
 * says so lives next to the chips on the detail page (ThreadMeta) and at the
 * point of entry (the submission form); this component only draws the chips.
 *
 * Server component, pure display. The notice href is derived from the same
 * `noticeAnchor` slug the regulatory cards use as their scroll target, so the two
 * always agree.
 */
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { noticeAnchor } from '@/components/regulatory/regulatory';

const CHIP =
  'inline-flex items-center rounded-sm border border-border bg-raised px-1.5 py-0.5 text-2xs text-fg-muted transition-colors duration-fast hover:border-accent hover:text-accent-strong';

export function ThreadRefs({
  elementSymbol,
  noticeId,
  className,
}: {
  elementSymbol?: string | null;
  noticeId?: string | null;
  className?: string;
}) {
  if (!elementSymbol && !noticeId) return null;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {elementSymbol ? (
        <Link
          href={`/elements/${elementSymbol}/`}
          aria-label={`Element ${elementSymbol}`}
          className={cn(CHIP, 'font-mono font-semibold')}
        >
          {elementSymbol}
        </Link>
      ) : null}
      {noticeId ? (
        <Link
          href={`/regulatory/#${noticeAnchor(noticeId)}`}
          aria-label={`Control notice ${noticeId}`}
          className={CHIP}
        >
          {noticeId}
        </Link>
      ) : null}
    </span>
  );
}
