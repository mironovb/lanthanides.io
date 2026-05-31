/**
 * Callout — a bordered, tinted aside for methodology notes, caveats, and data
 * limitations (the site's honesty-about-uncertainty surfaces). A left accent
 * rule carries the tone; the tint is faint so it never competes with data.
 *
 * Server component. Tone is the only color decision: `note`/`info` (teal),
 * `warning` (amber), `danger` (red), `success` (green) — all from the semantic
 * scale, never decorative.
 */
import { cn } from './cn';

export type CalloutTone = 'note' | 'info' | 'warning' | 'danger' | 'success';

const TONE: Record<
  CalloutTone,
  { box: string; title: string; glyph: string }
> = {
  note: { box: 'border-l-accent bg-accent/5', title: 'text-accent-strong', glyph: '›' },
  info: { box: 'border-l-accent bg-accent/5', title: 'text-accent-strong', glyph: 'ⓘ' },
  warning: {
    box: 'border-l-risk-medium bg-risk-medium/5',
    title: 'text-risk-medium',
    glyph: '▲',
  },
  danger: {
    box: 'border-l-risk-high bg-risk-high/5',
    title: 'text-risk-high',
    glyph: '■',
  },
  success: { box: 'border-l-up bg-up/5', title: 'text-up', glyph: '✓' },
};

export interface CalloutProps {
  children: React.ReactNode;
  tone?: CalloutTone;
  title?: React.ReactNode;
  /** Override the leading glyph; pass `null` to hide it. */
  glyph?: React.ReactNode | null;
  className?: string;
}

export function Callout({
  children,
  tone = 'note',
  title,
  glyph,
  className,
}: CalloutProps) {
  const t = TONE[tone];
  const mark = glyph === undefined ? t.glyph : glyph;
  return (
    <div
      className={cn(
        'border-l-4 px-4 py-3 text-sm text-fg-muted',
        t.box,
        className,
      )}
    >
      {title ? (
        <p className={cn('mb-1 flex items-center gap-2 font-semibold', t.title)}>
          {mark != null ? (
            <span aria-hidden="true" className="text-xs">
              {mark}
            </span>
          ) : null}
          {title}
        </p>
      ) : null}
      <div className="leading-relaxed [&_a:hover]:text-accent-strong [&_a]:text-accent [&_a]:underline [&_a]:decoration-dotted">
        {children}
      </div>
    </div>
  );
}
