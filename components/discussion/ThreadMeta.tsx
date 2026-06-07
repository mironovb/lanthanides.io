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
  type DiscussionThreadDTO,
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
    </Card>
  );
}
