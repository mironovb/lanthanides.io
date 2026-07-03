/**
 * RecentContributions: the server-rendered review queue on /contribute. Shows
 * the newest inbox rows so the community loop is visible end to end, with the
 * status column making plain that a row is queued, not published. Degrades to
 * a calm note when the inbox is unconfigured or unreachable (the dataset and
 * the GitHub path never depend on it).
 *
 * Server component, presentational.
 */
import Link from 'next/link';
import { Callout, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { capitalize, formatDate } from '@/lib/format';
import type { ContributionQueue } from '@/lib/contributions';
import {
  fmtContributionPrice,
  isHttpUrl,
} from '@/components/contribute/contributions';

export function RecentContributions({
  queue,
}: {
  queue: ContributionQueue | null;
}) {
  if (queue === null) {
    return (
      <Callout tone="note" title="Queue temporarily unavailable">
        The inbox cannot be reached right now. The dataset itself is
        unaffected; try again shortly, or submit via the{' '}
        <a
          href="https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml"
          target="_blank"
          rel="noopener"
          className="font-medium underline decoration-dotted underline-offset-2"
        >
          GitHub template
        </a>
        .
      </Callout>
    );
  }

  if (queue.rows.length === 0) {
    return (
      <Callout tone="info" glyph={null}>
        The review queue is empty. The next sourced observation submitted above
        will be the first in line.
      </Callout>
    );
  }

  return (
    <div>
      <p className="mb-2 font-mono text-2xs uppercase tracking-caps text-fg-dim">
        {queue.pending} pending · newest {queue.rows.length} shown
      </p>
      <Table>
        <THead>
          <TR hover={false}>
            <TH>Observed</TH>
            <TH>Element</TH>
            <TH>Form</TH>
            <TH>Price</TH>
            <TH>Tier</TH>
            <TH>Source</TH>
            <TH>Status</TH>
          </TR>
        </THead>
        <TBody>
          {queue.rows.map((c) => (
            <TR key={c.id}>
              <TD className="whitespace-nowrap font-mono text-xs">
                {formatDate(c.observedDate)}
              </TD>
              <TD>
                <Link
                  href={`/elements/${c.element}/`}
                  className="font-medium text-fg hover:text-accent-strong"
                >
                  {c.element}
                </Link>
              </TD>
              <TD>{capitalize(c.form)}</TD>
              <TD className="whitespace-nowrap font-mono text-xs tabular-nums">
                {fmtContributionPrice(c)}
              </TD>
              <TD>{capitalize(c.tier)}</TD>
              <TD className="max-w-[16rem]">
                {c.sourceUrl && isHttpUrl(c.sourceUrl) ? (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener nofollow"
                    className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
                  >
                    {c.sourceName}
                  </a>
                ) : (
                  c.sourceName
                )}
              </TD>
              <TD className="whitespace-nowrap font-mono text-2xs uppercase tracking-caps text-fg-dim">
                {c.status}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <p className="mt-2 text-2xs leading-relaxed text-fg-dim">
        A queued row is not part of the dataset. Accepted observations are
        merged into <span className="font-mono">_data/</span> by a maintainer
        as a reviewed change, then appear on the element pages after the next
        build.
      </p>
    </div>
  );
}
