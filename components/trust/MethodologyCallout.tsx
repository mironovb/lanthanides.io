/**
 * MethodologyCallout: the "how we verify" signpost (Prompt 16). Keeps the
 * rigorous methodology one click away from any price: the three core ideas
 * (two-reference model, confidence + verification, validated provenance)
 * each deep-link into the exact /methodology anchor.
 *
 * Two shapes: `panel` (a Callout, for page sections) and `inline` (a single
 * muted line of links, for sitting under a price block). Server component.
 *
 * Anchor contract: #display-price and #provenance-chain are explicit kramdown
 * ids; #verification-and-confidence is the slug the <Markdown> heading renderer
 * assigns to "## Verification and Confidence" (both preserved, AUDIT §2).
 */
import Link from 'next/link';
import { Callout, cn } from '@/components/ui';

const LINK =
  'text-accent underline decoration-dotted underline-offset-2 hover:text-accent-strong';

const POINTS = [
  {
    href: '/methodology/#display-price',
    label: 'Two reference prices',
    desc: 'a retail reference and a bulk benchmark, tracked separately and never averaged into one number.',
  },
  {
    href: '/methodology/#verification-and-confidence',
    label: 'Confidence + verification',
    desc: 'every record carries a 0 to 1 confidence score and an explicit verification status.',
  },
  {
    href: '/methodology/#provenance-chain',
    label: 'Validated provenance',
    desc: 'three intake paths, each one named, dated, attributed, and validated, never invented.',
  },
];

export function MethodologyCallout({
  variant = 'panel',
  className,
}: {
  variant?: 'panel' | 'inline';
  className?: string;
}) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-xs leading-relaxed text-fg-dim', className)}>
        How we verify every price:{' '}
        <Link href="/methodology/#display-price" className={LINK}>
          two-price model
        </Link>
        ,{' '}
        <Link href="/methodology/#verification-and-confidence" className={LINK}>
          confidence scores
        </Link>
        ,{' '}
        <Link href="/methodology/#provenance-chain" className={LINK}>
          provenance chain
        </Link>
        .
      </p>
    );
  }

  return (
    <Callout tone="note" title="How we verify every price" className={className}>
      <ul className="space-y-1.5">
        {POINTS.map((p) => (
          <li key={p.href}>
            {/* Callout styles nested <a> as accent links; just weight the label. */}
            <Link href={p.href} className="font-semibold">
              {p.label}
            </Link>
            <span className="text-fg-muted">: {p.desc}</span>
          </li>
        ))}
      </ul>
    </Callout>
  );
}
