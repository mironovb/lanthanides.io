/**
 * ThreadMeta: the compact "record header" for one discussion thread — category,
 * status, reply count, author, organization, and the created/updated timestamps
 * in a single bordered definition strip, sitting directly under the page
 * masthead. It makes the thread fast to scan and cite without scattering these
 * facts across the post and reply panels.
 *
 * Server component; pure display over the public DTO. A thread has no private
 * contact column, so nothing here can leak (see components/discussion/discussion.ts).
 */
import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  SOURCE_TIP_CATEGORY,
  type DiscussionThreadDTO,
  sourceHost,
  statusLabel,
  statusVariant,
} from './discussion';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  );
}

export function ThreadMeta({ thread }: { thread: DiscussionThreadDTO }) {
  return (
    <Card className="mt-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Category">
          <Badge>{thread.categoryLabel}</Badge>
        </Field>
        <Field label="Status">
          <Badge variant={statusVariant(thread.status)}>
            {statusLabel(thread.status)}
          </Badge>
        </Field>
        <Field label="Replies">
          {thread.replyCount > 0 ? (
            <Link
              href="#discussion-replies"
              className="font-mono tabular-nums text-fg transition-colors duration-fast hover:text-accent"
            >
              {thread.replyCount}
            </Link>
          ) : (
            <span className="font-mono tabular-nums text-fg-muted">0</span>
          )}
        </Field>
        <Field label="Author">
          <span className="break-words">{thread.authorName}</span>
        </Field>
        {thread.organization ? (
          <Field label="Organization">
            <span className="break-words">{thread.organization}</span>
          </Field>
        ) : null}
        {thread.elementSymbol ? (
          <Field label="Element">
            <Link
              href={`/elements/${thread.elementSymbol}/`}
              className="font-mono text-fg transition-colors duration-fast hover:text-accent"
            >
              {thread.elementSymbol}
            </Link>
          </Field>
        ) : null}
        {thread.sourceDate ? (
          <Field label="Source date">
            <time
              dateTime={thread.sourceDate}
              className="font-mono text-xs text-fg-muted"
            >
              {formatDate(thread.sourceDate)}
            </time>
          </Field>
        ) : null}
        {thread.sourceUrl ? (
          <Field label="Source">
            <a
              href={thread.sourceUrl}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="break-all text-accent underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-accent-strong"
            >
              {sourceHost(thread.sourceUrl)} ↗
            </a>
          </Field>
        ) : null}
        <Field label="Created">
          <time
            dateTime={thread.createdAt}
            className="font-mono text-xs text-fg-muted"
          >
            {formatDate(thread.createdAt)}
          </time>
        </Field>
        <Field label="Updated">
          <time
            dateTime={thread.updatedAt}
            className="font-mono text-xs text-fg-muted"
          >
            {formatDate(thread.updatedAt)}
          </time>
        </Field>
      </dl>
      {thread.category === SOURCE_TIP_CATEGORY ? (
        <p className="mt-4 border-t border-border pt-3 text-2xs leading-relaxed text-fg-dim">
          Source tip — an unverified lead for maintainer review, not accepted
          data. It does not enter the open dataset without source review and a git
          pull request.
        </p>
      ) : null}
    </Card>
  );
}
