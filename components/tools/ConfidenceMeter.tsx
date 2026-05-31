/**
 * ConfidenceMeter — a compact three-segment meter for the gauge's holistic
 * confidence grade (low / medium / high), computed by the engine from match
 * count, seller diversity, recency, form precision, and price agreement.
 *
 * Deliberately MONOCHROME: the design system reserves colour for price-movement,
 * regulatory-risk, and element-category meaning, so confidence is shown by filled
 * segment count + label, never a new colour axis (matches trust/ProvenanceBadge).
 * Server component; the explanation rides the native `title` attribute.
 */
import { cn } from '@/components/ui';
import type { Confidence } from '@/lib/types';

const FILLED: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };
const LABEL: Record<Confidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const TITLE =
  'Holistic confidence — from how many records matched, how many distinct sellers, how recent they are, whether the exact form was found, and how closely the prices agree. Conservative: thin or dispersed evidence grades low.';

export function ConfidenceMeter({
  level,
  className,
}: {
  level: Confidence;
  className?: string;
}) {
  const filled = FILLED[level];
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={TITLE}
      aria-label={`Confidence: ${LABEL[level]}`}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'inline-block w-1.5',
              i === 0 ? 'h-2' : i === 1 ? 'h-3' : 'h-4',
              i < filled ? 'bg-fg-muted' : 'bg-border-strong',
            )}
          />
        ))}
      </span>
      <span className="font-mono text-2xs font-semibold uppercase tracking-caps text-fg">
        {LABEL[level]} confidence
      </span>
    </span>
  );
}
