/**
 * Pure helpers for the dashboard element lens (the category / export-control
 * filter that scopes the dashboard panels). Side-effect-free and framework-free
 * so the logic is testable and the island (DashboardLens) stays presentational,
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

// ── Regulatory risk matrix (category × current control posture) ──────────────

/**
 * The four mutually-exclusive control postures the risk matrix crosses against
 * element category. They are the export-control statuses (restricted /
 * monitored / normal) with `suspended` overlaid, so they partition every
 * element exactly once.
 */
export type ControlPosture = 'restricted' | 'monitored' | 'suspended' | 'normal';

/** Column order, most-controlling first, then paused, then unrestricted. */
export const POSTURE_ORDER: readonly ControlPosture[] = [
  'restricted',
  'monitored',
  'suspended',
  'normal',
];

/**
 * One element's current control posture. A suspended regime is reported as
 * `suspended` (its export listing is currently paused) rather than its
 * underlying export-control class, so the pause is visible and the four
 * postures stay mutually exclusive; otherwise it is the element's
 * export_control_status. Pure projection of authored catalog fields, never a
 * fabricated state.
 */
export function postureOf(e: ElementLensMeta): ControlPosture {
  return e.regulatory === 'suspended' ? 'suspended' : e.control;
}

/** One matrix cell: the elements in a given category and posture. */
export interface RiskCell {
  posture: ControlPosture;
  count: number;
  /** Symbols in this cell, in the order supplied; drives the cell tooltip. */
  symbols: string[];
}

/** One matrix row: a category, its four posture cells, and row summaries. */
export interface RiskRow {
  category: ElementCategory;
  cells: RiskCell[]; // in POSTURE_ORDER
  total: number;
  /** restricted + monitored + suspended (every posture except unrestricted). */
  underControl: number;
}

export interface RiskMatrix {
  rows: RiskRow[]; // categories present in scope, in CATEGORY_ORDER
  columnTotals: Record<ControlPosture, number>;
  total: number;
  underControlTotal: number;
}

/**
 * Cross-tabulate the in-scope elements by category × current control posture.
 * Every count is a real tally of the scoped catalog rows (never a fabricated
 * figure); rows appear only for categories present in scope, in canonical
 * CATEGORY_ORDER, so a filtered view never invents an empty category.
 */
export function buildRiskMatrix(scope: ElementLensMeta[]): RiskMatrix {
  const byCategory = new Map<ElementCategory, Map<ControlPosture, string[]>>();
  const columnTotals: Record<ControlPosture, number> = {
    restricted: 0,
    monitored: 0,
    suspended: 0,
    normal: 0,
  };

  for (const e of scope) {
    const posture = postureOf(e);
    columnTotals[posture] += 1;
    let row = byCategory.get(e.category);
    if (!row) {
      row = new Map();
      byCategory.set(e.category, row);
    }
    const symbols = row.get(posture);
    if (symbols) symbols.push(e.symbol);
    else row.set(posture, [e.symbol]);
  }

  const rows: RiskRow[] = [];
  for (const category of CATEGORY_ORDER) {
    const row = byCategory.get(category);
    if (!row) continue; // category absent from the current scope
    const cells: RiskCell[] = POSTURE_ORDER.map((posture) => {
      const symbols = row.get(posture) ?? [];
      return { posture, symbols, count: symbols.length };
    });
    const total = cells.reduce((n, c) => n + c.count, 0);
    const normal = row.get('normal')?.length ?? 0;
    rows.push({ category, cells, total, underControl: total - normal });
  }

  return {
    rows,
    columnTotals,
    total: scope.length,
    underControlTotal: scope.length - columnTotals.normal,
  };
}
