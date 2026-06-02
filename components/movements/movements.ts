/**
 * Presentation tokens for the market-movements feed, remapped onto the project's
 * semantic color tokens to match the static site.
 *
 * Note the deliberate, ported semantics: a price spike reads red (a rising
 * strategic-materials price is the alarming signal), while a price drop reads
 * azure rather than the financial green. Color encodes "this moved", not "good
 * or bad". Direction colors mirror the chip colors so a row is internally
 * consistent. Every class is a full literal so Tailwind emits it.
 */
import type { Direction, MovementType } from '@/lib/types';

export interface MovementStyle {
  /** Short chip label, e.g. 'Spike'. */
  chipLabel: string;
  /** Chip text + tint classes. */
  chip: string;
  /** Left-accent border utility for the row. */
  border: string;
}

export const MOVEMENT_STYLE: Record<MovementType, MovementStyle> = {
  price_spike: {
    chipLabel: 'Spike',
    chip: 'text-down bg-down/10',
    border: 'border-l-down',
  },
  price_drop: {
    chipLabel: 'Drop',
    chip: 'text-category-ree-light bg-category-ree-light/10',
    border: 'border-l-category-ree-light',
  },
  regulatory_change: {
    chipLabel: 'Regulatory',
    chip: 'text-risk-medium bg-risk-medium/10',
    border: 'border-l-risk-medium',
  },
  new_data: {
    chipLabel: 'New data',
    chip: 'text-risk-low bg-risk-low/10',
    border: 'border-l-risk-low',
  },
};

export const MOVEMENT_FALLBACK: MovementStyle = {
  chipLabel: 'Movement',
  chip: 'text-fg-muted bg-overlay',
  border: 'border-l-border-strong',
};

/** Direction → sparkline stroke / end-dot fill / percent-change text colour. */
export const DIRECTION_COLOR: Record<
  Direction,
  { stroke: string; fill: string; text: string }
> = {
  up: { stroke: 'stroke-down', fill: 'fill-down', text: 'text-down' },
  down: {
    stroke: 'stroke-category-ree-light',
    fill: 'fill-category-ree-light',
    text: 'text-category-ree-light',
  },
  flat: { stroke: 'stroke-neutral', fill: 'fill-neutral', text: 'text-neutral' },
};

/** Confidence → tag classes (low muted, medium amber, high green). */
export const CONFIDENCE_STYLE: Record<'low' | 'medium' | 'high', string> = {
  low: 'text-fg-muted bg-overlay',
  medium: 'text-risk-medium bg-risk-medium/10',
  high: 'text-up bg-up/10',
};
