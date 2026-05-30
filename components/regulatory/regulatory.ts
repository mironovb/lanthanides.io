/**
 * Shared presentation tokens for the regulatory tracker — the classification of
 * each control notice and the colour-coding for policy-event types. Mirrors the
 * Liquid logic in legacy/pages/regulatory.html and the SCSS in
 * legacy/_sass/_regulatory-banner.scss, remapped onto the project's semantic
 * risk tokens (teal/amber/red/gray — colour only ever encodes meaning).
 *
 * Tailwind only emits classes it can see as complete literals, so every class
 * string here is spelled out in full (no runtime construction). Pure module: no
 * I/O, safe in both Server and Client Components.
 */
import type { PolicyEventType, RegulatoryNotice } from '@/lib/types';

/** The four control-regime classes the tracker buckets notices into. */
export type NoticeKind = 'export' | 'denial' | 'suspended' | 'japan';

export interface NoticeStyle {
  /** Human label shown next to the status dot. */
  label: string;
  /** Left-accent border utility for the card. */
  border: string;
  /** Status-dot background utility. */
  dot: string;
  /** Status-label text colour utility. */
  text: string;
}

/**
 * Classify a notice exactly as the legacy template did, in order:
 *   Japan target → country prohibition; suspended; presumptive denial; else
 *   the baseline export-licence requirement.
 */
export function classifyNotice(notice: RegulatoryNotice): NoticeKind {
  if (notice.target_country === 'JP') return 'japan';
  if (notice.status === 'suspended') return 'suspended';
  if (notice.measure_type === 'presumptive_denial') return 'denial';
  return 'export';
}

export const NOTICE_STYLE: Record<NoticeKind, NoticeStyle> = {
  export: {
    label: 'Export Licence Required',
    border: 'border-l-risk-medium',
    dot: 'bg-risk-medium',
    text: 'text-risk-medium',
  },
  denial: {
    label: 'Presumptive Denial',
    border: 'border-l-risk-high',
    dot: 'bg-risk-high',
    text: 'text-risk-high',
  },
  suspended: {
    label: 'Suspended',
    border: 'border-l-risk-suspended',
    dot: 'bg-risk-suspended',
    text: 'text-fg-dim',
  },
  japan: {
    label: 'Country Prohibition',
    border: 'border-l-risk-high',
    dot: 'bg-risk-high',
    text: 'text-risk-high',
  },
};

/** Policy-event type → timeline tag label + risk-coloured tag classes. */
export const EVENT_TYPE_STYLE: Record<
  PolicyEventType,
  { label: string; classes: string }
> = {
  export_control: {
    label: 'Export control',
    classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25',
  },
  export_ban: {
    label: 'Export ban',
    classes: 'text-risk-high bg-risk-high/10 border border-risk-high/25',
  },
  sanction: {
    label: 'Sanction',
    classes: 'text-risk-high bg-risk-high/10 border border-risk-high/25',
  },
  suspension: {
    label: 'Suspension',
    classes: 'text-fg-muted bg-overlay border border-border-strong',
  },
  regulation: {
    label: 'Regulation',
    classes: 'text-risk-low bg-risk-low/10 border border-risk-low/25',
  },
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format an ISO 'YYYY-MM-DD' date as 'D Mon YYYY' (legacy `date: "%-d %b %Y"`),
 * parsing the string directly so there is no timezone off-by-one. Returns the
 * input unchanged if it is not a plain ISO date.
 */
export function fmtLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${Number(m[3])} ${month} ${m[1]}`;
}
