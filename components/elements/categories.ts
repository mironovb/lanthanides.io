/**
 * Shared presentation tokens for the four element categories, export-control
 * status, and regulatory status — the colour-coding that recurs across the
 * elements index tiles, the detail header, and the bottom navigation chips.
 *
 * Tailwind only emits classes it can see as complete literals, so every class
 * string here is spelled out in full (no runtime construction). Colours map to
 * the `category` / `risk` tokens in tailwind.config.ts; colour only ever encodes
 * meaning (CLAUDE.md design tokens).
 */
import type {
  ElementCategory,
  ExportControlStatus,
  RegulatoryStatus,
} from '@/lib/types';

/** Display order for the four categories (matches the legacy grid / CATEGORY_ORDER). */
export const CATEGORY_ORDER: readonly ElementCategory[] = [
  'rare_earth_light',
  'rare_earth_heavy',
  'strategic_metal',
  'semiconductor_metal',
];

export interface CategoryStyle {
  /** Full section heading, e.g. 'Light Rare Earths'. */
  label: string;
  /** Singular detail-header badge, e.g. 'Light Rare Earth'. */
  badgeLabel: string;
  /** Compact tile label, e.g. 'Light REE'. */
  short: string;
  /** Solid swatch background (heading swatch / chip accent). */
  swatch: string;
  /** Top-accent border colour utility. */
  borderTop: string;
  /** Foreground accent for the symbol/category text. */
  text: string;
  /** Outlined category badge (text + border + tint). */
  badge: string;
}

export const CATEGORY_STYLE: Record<ElementCategory, CategoryStyle> = {
  rare_earth_light: {
    label: 'Light Rare Earths',
    badgeLabel: 'Light Rare Earth',
    short: 'Light REE',
    swatch: 'bg-category-ree-light',
    borderTop: 'border-t-category-ree-light',
    text: 'text-category-ree-light',
    badge:
      'text-category-ree-light border border-category-ree-light/40 bg-category-ree-light/10',
  },
  rare_earth_heavy: {
    label: 'Heavy Rare Earths',
    badgeLabel: 'Heavy Rare Earth',
    short: 'Heavy REE',
    swatch: 'bg-category-ree-heavy',
    borderTop: 'border-t-category-ree-heavy',
    text: 'text-category-ree-heavy',
    badge:
      'text-category-ree-heavy border border-category-ree-heavy/40 bg-category-ree-heavy/10',
  },
  strategic_metal: {
    label: 'Strategic & Rare Metals',
    badgeLabel: 'Strategic Metal',
    short: 'Strategic',
    swatch: 'bg-category-strategic',
    borderTop: 'border-t-category-strategic',
    text: 'text-category-strategic',
    badge:
      'text-category-strategic border border-category-strategic/40 bg-category-strategic/10',
  },
  semiconductor_metal: {
    label: 'Semiconductor Metals',
    badgeLabel: 'Semiconductor Metal',
    short: 'Semi',
    swatch: 'bg-category-semiconductor',
    borderTop: 'border-t-category-semiconductor',
    text: 'text-category-semiconductor',
    badge:
      'text-category-semiconductor border border-category-semiconductor/40 bg-category-semiconductor/10',
  },
};

/** Export-control status → label + risk-coloured tag classes (teal/amber/red). */
export const CONTROL_STYLE: Record<
  ExportControlStatus,
  { label: string; classes: string }
> = {
  restricted: {
    label: 'Restricted',
    classes: 'text-risk-high bg-risk-high/10 border border-risk-high/25',
  },
  monitored: {
    label: 'Monitored',
    classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25',
  },
  normal: {
    label: 'Normal',
    classes: 'text-risk-low bg-risk-low/10 border border-risk-low/25',
  },
};

/**
 * Regulatory status → the badge shown on the detail header and inline notice.
 * 'none' has no badge (returns null at the call site).
 */
export const REGULATORY_BADGE: Record<
  Exclude<RegulatoryStatus, 'none'>,
  { label: string; classes: string }
> = {
  active: {
    label: 'Export Licence',
    classes:
      'text-risk-medium bg-risk-medium/10 border border-risk-medium/30',
  },
  suspended: {
    label: 'Suspended',
    classes:
      'text-risk-suspended bg-risk-suspended/10 border border-risk-suspended/30',
  },
};
