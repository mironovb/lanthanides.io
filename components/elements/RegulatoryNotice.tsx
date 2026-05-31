/**
 * Inline regulatory notice shown on controlled / suspended element pages — a
 * port of the auto-generated `.reg-notice-inline` block in
 * legacy/_layouts/element-detail.html. Renders nothing for unregulated elements
 * (the caller only mounts it for 'active' / 'suspended'). Composes the shared
 * Badge primitive (Prompt 12); the status-colored left rule is kept bespoke
 * because the suspended state has no Callout tone.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { REGULATORY_BADGE } from './categories';

export function RegulatoryNotice({
  status,
  name,
}: {
  status: 'active' | 'suspended';
  name: string;
}) {
  const badge = REGULATORY_BADGE[status];
  const text =
    status === 'active'
      ? `Chinese export licence required for ${name} in all controlled forms.`
      : 'Export controls paused under November 2025 suspension orders.';
  const accent =
    status === 'active' ? 'border-l-risk-medium' : 'border-l-risk-suspended';

  return (
    <div
      className={`mb-6 flex flex-col gap-2 border border-l-[3px] border-border ${accent} bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3`}
    >
      <Badge variant={status} href="/regulatory/" className="w-fit">
        {badge.label}
      </Badge>
      <span className="flex-1 text-fg-muted">{text}</span>
      <Link
        href="/regulatory/"
        className="whitespace-nowrap text-xs font-semibold text-fg-muted hover:text-fg"
      >
        Regulatory Tracker →
      </Link>
    </div>
  );
}
