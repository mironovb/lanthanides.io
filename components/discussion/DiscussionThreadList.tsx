import Link from 'next/link';
import {
  Badge,
  LinkButton,
  Panel,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import {
  type DiscussionThreadDTO,
  sourceHost,
  statusLabel,
  statusVariant,
} from './discussion';

export function DiscussionThreadList({
  threads,
  boardEmpty = false,
}: {
  threads: DiscussionThreadDTO[];
  /**
   * True only when there are no visible threads ANYWHERE on the board (not just
   * none under the current filters/search). Distinguishes the first-run empty
   * board from a filter/search that simply excluded everything.
   */
  boardEmpty?: boolean;
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
        boardEmpty ? (
          <div className="p-5">
            <p className="font-serif text-lg text-fg">No threads yet.</p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
              The board stays empty by design until contributors add notes. Start
              the first one with a source tip, a price question, or a regulatory
              question using the <span className="text-fg">Start a thread</span>{' '}
              form.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <p className="font-serif text-lg text-fg">
              No threads match your search.
            </p>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
              Threads do exist on the board, but none match the current filters or
              search terms. Widen the search or clear the filters to see them.
            </p>
            <div className="mt-4">
              <LinkButton href="/discussion/" variant="secondary" size="sm">
                Clear search and filters
              </LinkButton>
            </div>
          </div>
        )
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
                  {thread.elementSymbol || thread.sourceDate || thread.sourceUrl ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-fg-dim">
                      {thread.elementSymbol ? (
                        <Link
                          href={`/elements/${thread.elementSymbol}/`}
                          className="font-mono text-fg-muted transition-colors duration-fast hover:text-accent"
                        >
                          {thread.elementSymbol}
                        </Link>
                      ) : null}
                      {thread.sourceDate ? (
                        <time dateTime={thread.sourceDate} className="font-mono">
                          {formatDate(thread.sourceDate)}
                        </time>
                      ) : null}
                      {thread.sourceUrl ? (
                        <a
                          href={thread.sourceUrl}
                          target="_blank"
                          rel="nofollow ugc noopener noreferrer"
                          className="break-all text-accent underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-accent-strong"
                        >
                          {sourceHost(thread.sourceUrl)} ↗
                        </a>
                      ) : null}
                    </p>
                  ) : null}
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
