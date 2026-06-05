import Link from 'next/link';
import { Badge, Panel, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  type DiscussionThreadDTO,
  statusLabel,
  statusVariant,
} from './discussion';

export function DiscussionThreadList({
  threads,
}: {
  threads: DiscussionThreadDTO[];
}) {
  return (
    <Panel
      title="Discussion board"
      eyebrow="Live threads"
      actions={
        <span className="font-mono text-2xs text-fg-dim">
          {threads.length} visible
        </span>
      }
      padding="none"
    >
      {threads.length === 0 ? (
        <div className="p-5">
          <p className="font-serif text-lg text-fg">No visible threads yet.</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            Start with a source tip, a price question, or a regulatory question.
            The board is empty by design until real users add notes.
          </p>
        </div>
      ) : (
        <Table bordered={false}>
          <THead>
            <TR hover={false}>
              <TH>Thread</TH>
              <TH>Category</TH>
              <TH>Status</TH>
              <TH numeric>Replies</TH>
              <TH>Latest</TH>
            </TR>
          </THead>
          <TBody>
            {threads.map((thread) => (
              <TR key={thread.id}>
                <TD className="min-w-[260px]">
                  <Link
                    href={`/discussion/${thread.id}/`}
                    className="font-medium text-fg transition-colors duration-fast hover:text-accent"
                  >
                    {thread.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 max-w-prose text-xs leading-relaxed text-fg-dim">
                    {thread.body}
                  </p>
                  <p className="mt-1 text-2xs text-fg-dim">
                    {thread.authorName}
                    {thread.organization ? ` · ${thread.organization}` : ''}
                  </p>
                </TD>
                <TD>
                  <Badge>{thread.categoryLabel}</Badge>
                </TD>
                <TD>
                  <Badge variant={statusVariant(thread.status)}>
                    {statusLabel(thread.status)}
                  </Badge>
                </TD>
                <TD numeric>{thread.replyCount}</TD>
                <TD className="whitespace-nowrap font-mono text-xs">
                  {formatDate(thread.updatedAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}
