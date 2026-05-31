/**
 * ProvenanceBadge — the per-record trust-signal cluster (Prompt 16). Given one
 * PriceRecord it surfaces the three things that make a displayed price
 * *checkable* rather than asserted: its source/intake type, its verification
 * status, and its confidence. It's the compact companion to the full
 * ProvenanceTable — dropped beside a headline reference price so the trust
 * context travels with the number.
 *
 * HONESTY (CLAUDE.md hard rule #1): every value rendered is read straight off
 * the record — the source type and verification status are the literal fields
 * (humanised), and the confidence band is derived from the record's own 0–1
 * score against the published methodology thresholds. Nothing is inferred or
 * upgraded. The confidence meter is intentionally monochrome: the design system
 * reserves colour for price-movement / regulatory-risk / category meaning, so
 * "confidence" is shown by bar count + label, not a new colour axis.
 *
 * Server component (presentational; tooltips use the native `title` attribute so
 * it stays SSR-only and crawlable).
 */
import { Badge, cn } from '@/components/ui';
import { humanize } from '@/lib/format';
import type { PriceRecord } from '@/lib/types';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Confidence band from methodology #verification-and-confidence (high ≥ 0.80, medium ≥ 0.50). */
export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CONFIDENCE_FILLED: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Verification statuses that represent independent corroboration earn the accent
 * emphasis; single-source / estimate / benchmark statuses stay neutral so the
 * badge never over-claims (the 27 `verified` + corroborated/cross-referenced
 * rows, vs. the 187 single-source offers).
 */
const STRONG_VERIFICATION = /verified|corroborated|cross.?referenced/i;

/** A leading glyph by broad intake kind. The label itself is the literal field. */
function sourceGlyph(sourceType: string): string {
  if (/listing/.test(sourceType)) return '▸';
  if (/benchmark|index|estimate/.test(sourceType)) return '≈';
  if (/offer|quote|rfq|distributor|seller|platform|supplier/.test(sourceType))
    return '◆';
  return '•';
}

export function ProvenanceBadge({
  record,
  showSource = true,
  className,
}: {
  record: PriceRecord;
  /** Show the source-type chip (off when the surrounding UI already names it). */
  showSource?: boolean;
  className?: string;
}) {
  const level = confidenceLevel(record.confidence_score);
  const filled = CONFIDENCE_FILLED[level];
  const score = record.confidence_score.toFixed(2);
  const strong = STRONG_VERIFICATION.test(record.verification_status);
  const confTitle = `Confidence ${score} — ${CONFIDENCE_LABEL[level]} (high ≥ 0.80, medium 0.50–0.79, low < 0.50). Assigned at ingestion from source type, corroboration, and recency.`;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5 text-2xs', className)}
    >
      {showSource ? (
        <span
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-raised px-1.5 py-0.5 font-mono uppercase tracking-caps text-fg-dim"
          title={`Source type — how this price entered the ledger: ${humanize(
            record.source_type,
          )}`}
        >
          <span aria-hidden="true">{sourceGlyph(record.source_type)}</span>
          {humanize(record.source_type)}
        </span>
      ) : null}

      <Badge
        variant={strong ? 'accent' : 'default'}
        title={`Verification status: ${humanize(
          record.verification_status,
        )} — see Methodology for what each status means.`}
      >
        {humanize(record.verification_status)}
      </Badge>

      <span
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-1.5 py-0.5"
        title={confTitle}
        aria-label={`Confidence ${CONFIDENCE_LABEL[level]}, score ${score} of 1`}
      >
        <span aria-hidden="true" className="flex items-end gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'inline-block w-0.5',
                i === 0 ? 'h-1.5' : i === 1 ? 'h-2' : 'h-2.5',
                i < filled ? 'bg-fg-muted' : 'bg-border-strong',
              )}
            />
          ))}
        </span>
        <span className="font-mono tabular-nums text-fg-dim">Conf {score}</span>
      </span>
    </div>
  );
}
