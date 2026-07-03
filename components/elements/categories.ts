/**
 * Shared presentation tokens for the four element categories, export-control
 * status, and regulatory status: the colour-coding that recurs across the
 * elements index tiles, the detail header, and the bottom navigation chips.
 *
 * Tailwind only emits classes it can see as complete literals, so every class
 * string here is spelled out in full (no runtime construction). Colours map to
 * the `category` / `risk` tokens in tailwind.config.ts; colour only ever encodes
 * meaning (CLAUDE.md design tokens).
 */
import type { ElementCategory, RegulatoryStatus } from '@/lib/types';

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
  /** Solid swatch background (heading swatch / chip accent). */
  swatch: string;
  /** Top-accent border colour utility. */
  borderTop: string;
  /** Hover border colour (whole tile turns the category colour on hover). */
  hoverBorder: string;
}

export const CATEGORY_STYLE: Record<ElementCategory, CategoryStyle> = {
  rare_earth_light: {
    label: 'Light Rare Earths',
    badgeLabel: 'Light Rare Earth',
    swatch: 'bg-category-ree-light',
    borderTop: 'border-t-category-ree-light',
    hoverBorder: 'hover:border-category-ree-light',
  },
  rare_earth_heavy: {
    label: 'Heavy Rare Earths',
    badgeLabel: 'Heavy Rare Earth',
    swatch: 'bg-category-ree-heavy',
    borderTop: 'border-t-category-ree-heavy',
    hoverBorder: 'hover:border-category-ree-heavy',
  },
  strategic_metal: {
    label: 'Strategic & Rare Metals',
    badgeLabel: 'Strategic Metal',
    swatch: 'bg-category-strategic',
    borderTop: 'border-t-category-strategic',
    hoverBorder: 'hover:border-category-strategic',
  },
  semiconductor_metal: {
    label: 'Semiconductor Metals',
    badgeLabel: 'Semiconductor Metal',
    swatch: 'bg-category-semiconductor',
    borderTop: 'border-t-category-semiconductor',
    hoverBorder: 'hover:border-category-semiconductor',
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
