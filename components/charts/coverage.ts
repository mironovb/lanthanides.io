/**
 * Shared coverage-grade vocabulary: the labels, ordering, tile styling, sort
 * rank, and plain-language definitions for the four data-coverage grades. One
 * source of truth for the CoverageGrid (the monochrome heatmap) and the
 * CoverageTable (the drilldown that decodes it), so the two never drift.
 *
 * The grades come straight from the pipeline's classifier
 * (scripts/fluctuations.py `_classify_quality`): the grade is a function of how
 * many DISTINCT observation days back an element (plus an individual-observation
 * floor), never a fabricated score. 'none' is the UI-only grade the data layer
 * assigns when an element has no observations at all.
 */
import type { ElementCoverage } from '@/lib/types';

export type CoverageGrade = ElementCoverage['quality']; // 'rich' | 'moderate' | 'sparse' | 'none'

/** Best-backed first; matches the grid legend and the table's default ranking. */
export const GRADE_ORDER: readonly CoverageGrade[] = [
  'rich',
  'moderate',
  'sparse',
  'none',
];

export const GRADE_LABEL: Record<CoverageGrade, string> = {
  rich: 'Rich',
  moderate: 'Moderate',
  sparse: 'Sparse',
  none: 'None',
};

/**
 * Teal density ramp: darker = more data. Standard Tailwind opacity steps only
 * (/25, /10, /5), so every class is guaranteed to emit; full literals so the
 * content scanner sees them. Monochrome on purpose — density is the only meaning,
 * deliberately NOT the price/risk colours.
 */
export const GRADE_TILE: Record<CoverageGrade, string> = {
  rich: 'border-accent/40 bg-accent/25 text-fg',
  moderate: 'border-accent/25 bg-accent/10 text-fg',
  sparse: 'border-border bg-accent/5 text-fg-muted',
  none: 'border-dashed border-border bg-surface text-fg-dim',
};

/** Numeric rank for sorting and the density order (rich highest, none lowest). */
export const GRADE_RANK: Record<CoverageGrade, number> = {
  rich: 3,
  moderate: 2,
  sparse: 1,
  none: 0,
};

/**
 * Plain-language definition of each grade, mirroring the pipeline thresholds
 * (distinct observation days is the primary driver). Used to decode the grid so
 * its colours are never a heatmap with hidden meaning.
 */
export const GRADE_DEFINITION: Record<CoverageGrade, string> = {
  rich: '4 or more distinct observation days',
  moderate: '2 to 3 distinct observation days',
  sparse: 'a single observation day, or under 2 individual observations',
  none: 'no observations on file',
};
