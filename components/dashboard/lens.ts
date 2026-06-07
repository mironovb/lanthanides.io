/**
 * Pure helpers for the dashboard element lens (the category / export-control
 * filter that scopes the dashboard panels). Side-effect-free and framework-free
 * so the logic is testable and the island (DashboardLens) stays presentational —
 * mirrors the offers/sell/alerts pure-helper modules.
 *
 * The lens has two orthogonal axes (category, export-control posture); both
 * default to null (unfiltered). It is serialised to the URL query so a filtered
 * view is shareable, and parsed back defensively (unknown values are dropped, so
 * a hand-edited or stale link never throws).
 */
import type { ChipOption } from '@/components/ui';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '@/components/elements/categories';
import type {
  ElementCategory,
  ExportControlStatus,
  RegulatorySnapshot,
  RegulatoryStatus,
} from '@/lib/types';

/** The element fields the lens needs to scope the panels (a lean catalog slice). */
export interface ElementLensMeta {
  symbol: string;
  category: ElementCategory;
  control: ExportControlStatus;
  regulatory: RegulatoryStatus;
}

/** The two lens axes; null on an axis = unfiltered there. */
export interface LensFilters {
  category: ElementCategory | null;
  control: ExportControlStatus | null;
}

export const EMPTY_LENS: LensFilters = { category: null, control: null };

/** Compact category chips, in the canonical display order (reusing the short labels). */
export const CATEGORY_OPTIONS: ChipOption[] = CATEGORY_ORDER.map((c) => ({
  value: c,
  label: CATEGORY_STYLE[c].short,
}));

const CONTROL_ORDER: readonly ExportControlStatus[] = [
  'restricted',
  'monitored',
  'normal',
];

/**
 * Export-control chip labels. "Unrestricted" for the `normal` posture matches
 * the dashboard's regulatory-snapshot vocabulary (the element pages say
 * "Normal"), so the control reads consistently with the panel it scopes.
 */
export const CONTROL_LABEL: Record<ExportControlStatus, string> = {
  restricted: 'Restricted',
  monitored: 'Monitored',
  normal: 'Unrestricted',
};

export const CONTROL_OPTIONS: ChipOption[] = CONTROL_ORDER.map((c) => ({
  value: c,
  label: CONTROL_LABEL[c],
}));

const CATEGORY_VALUES = new Set<string>(CATEGORY_ORDER);
const CONTROL_VALUES = new Set<string>(CONTROL_ORDER);

/** True when either axis is constrained. */
export function lensActive(f: LensFilters): boolean {
  return f.category !== null || f.control !== null;
}

/** Parse + validate the lens from a URL query string; unknown values are dropped. */
export function parseLensFromSearch(search: string): LensFilters {
  const params = new URLSearchParams(search);
  const category = params.get('category');
  const control = params.get('control');
  return {
    category:
      category && CATEGORY_VALUES.has(category)
        ? (category as ElementCategory)
        : null,
    control:
      control && CONTROL_VALUES.has(control)
        ? (control as ExportControlStatus)
        : null,
  };
}

/** Serialise the lens to a query string (omitting unset axes); '' when empty. */
export function lensToSearchParams(f: LensFilters): string {
  const params = new URLSearchParams();
  if (f.category) params.set('category', f.category);
  if (f.control) params.set('control', f.control);
  return params.toString();
}

/** The in-scope elements: those matching every constrained axis (AND). */
export function scopeElements(
  elements: ElementLensMeta[],
  f: LensFilters,
): ElementLensMeta[] {
  return elements.filter(
    (e) =>
      (f.category === null || e.category === f.category) &&
      (f.control === null || e.control === f.control),
  );
}

/**
 * Recompute the regulatory-snapshot counts over an in-scope element subset, so
 * the snapshot can report "within filter" figures (never a fabricated count;
 * every figure is a real tally of the scoped catalog rows).
 */
export function snapshotOf(scope: ElementLensMeta[]): RegulatorySnapshot {
  const snapshot: RegulatorySnapshot = {
    export_control: { restricted: 0, monitored: 0, normal: 0 },
    regulatory: { active: 0, suspended: 0, none: 0 },
    total: scope.length,
  };
  for (const e of scope) {
    snapshot.export_control[e.control] += 1;
    snapshot.regulatory[e.regulatory] += 1;
  }
  return snapshot;
}
