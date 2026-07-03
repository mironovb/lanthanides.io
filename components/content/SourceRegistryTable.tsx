/**
 * SourceRegistryTable: the registered-source registry, moved onto /methodology
 * when the standalone /sources page merged into it (2026-07 simplification;
 * /sources 301s here). One row per curated source: name, type, trust tier,
 * country, supported elements, parse status, review status. Only fields that
 * exist in the registry are shown (hard rule #1).
 *
 * Server component, presentational.
 */
import type { Source } from '@/lib/types';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { capitalize } from '@/components/elements/format';

const PILL =
  'inline-block rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold';

const REVIEW_STYLE: Record<string, string> = {
  reviewed: 'text-accent-strong',
  pending: 'text-risk-medium',
};

export function SourceRegistryTable({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return (
      <div className="border border-border bg-surface px-4 py-6 text-sm text-fg-dim">
        No sources are registered yet.
      </div>
    );
  }

  return (
    <Table>
      <THead>
        <TR hover={false}>
          {['Source', 'Type', 'Trust Tier', 'Country', 'Supported Elements', 'Status', 'Review'].map(
            (h) => (
              <TH key={h}>{h}</TH>
            ),
          )}
        </TR>
      </THead>
      <TBody>
        {sources.map((source) => (
          <TR key={source.id}>
            <TD className="font-medium">
              <span className="text-fg">{source.name}</span>
            </TD>
            <TD>{capitalize(source.type)}</TD>
            <TD className="font-mono tabular-nums">{source.trust_tier}</TD>
            <TD className="font-mono">{source.country || 'n/a'}</TD>
            <TD>
              <span className="mb-1 block font-mono text-2xs text-fg-dim">
                {source.supported_elements.length} elements
              </span>
              <span className="flex flex-wrap gap-1">
                {source.supported_elements.map((sym) => (
                  <code
                    key={sym}
                    className="rounded-sm bg-overlay px-1 py-px font-mono text-2xs text-fg-muted"
                  >
                    {sym}
                  </code>
                ))}
              </span>
            </TD>
            <TD>
              {source.parse_status === 'active' ? (
                <span className={`${PILL} border border-up/25 bg-up/10 text-up`}>
                  Active
                </span>
              ) : (
                <span className="font-mono text-2xs text-fg-dim">
                  {source.parse_status}
                </span>
              )}
            </TD>
            <TD className="text-xs">
              <span className={REVIEW_STYLE[source.review_status] ?? 'text-fg-dim'}>
                {capitalize(source.review_status)}
              </span>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
