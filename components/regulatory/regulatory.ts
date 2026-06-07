/**
 * Shared presentation tokens for the regulatory tracker: how each control notice
 * is classified, and the color coding for policy event types. This mirrors the
 * classification logic and the styles from the static site, remapped onto the
 * project's semantic risk tokens (teal, amber, red, gray). Color only ever
 * encodes meaning.
 *
 * Tailwind only emits classes it can see as complete literals, so every class
 * string here is spelled out in full (no runtime construction). Pure module with
 * no I/O, safe in both Server and Client Components.
 */
import { formatDate } from '@/lib/format';
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
 * Classify a notice the same way the static site did, in order: a Japan target
 * is a country prohibition, then suspended, then presumptive denial, then the
 * baseline export licence requirement.
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

/**
 * Long date shared by the cards and timeline. Delegates to the shared
 * `formatDate` so every editorial and feed surface formats dates identically
 * ("Apr 9, 2025"); see lib/format.ts. Returns the input unchanged if unparseable.
 */
export function fmtLongDate(iso: string): string {
  return formatDate(iso);
}

/**
 * Stable in-page anchor id for a control notice, derived purely from its
 * notice_id so a deep link (`/regulatory/#<anchor>`) and the card's own id always
 * agree. Used by RegulatoryNoticeCard (the scroll target) and by anything that
 * cross-links to a notice (the discussion board). Slugifies to lowercase ascii +
 * single hyphens, e.g. 'MOFCOM No. 46/2024' -> 'notice-mofcom-no-46-2024'.
 */
export function noticeAnchor(noticeId: string): string {
  const slug = noticeId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `notice-${slug}`;
}
