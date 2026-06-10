/**
 * TypeScript data contracts for the versioned reference + provenance datasets
 * in `_data/` (docs/ARCHITECTURE.md §3, the single source of schema truth).
 *
 * Field names match the authored data files VERBATIM (snake_case). Optionality
 * here reflects what is actually present in the files today: a field is marked
 * optional (`?`) only because some records genuinely omit it (verified against
 * `_data/` on 2026-05-31), never as a guess. The data-access layer
 * (`lib/data/load.ts`) validates the always-present fields so a malformed file
 * fails `npm run build` loudly.
 *
 * `lib/types.ts` re-exports this module; both import paths resolve here.
 */

// ── Shared scalars ──────────────────────────────────────────────────────────

export type ElementCategory =
  | 'rare_earth_light'
  | 'rare_earth_heavy'
  | 'strategic_metal'
  | 'semiconductor_metal';

export type ExportControlStatus = 'restricted' | 'monitored' | 'normal';
export type RegulatoryStatus = 'active' | 'suspended' | 'none';

/**
 * Union of every market-tier value that appears in the data OR is referenced by
 * the ported reference-price selection (`lib/price-gauge.ts`):
 *   • `price_records.json` → 'retail' | 'wholesale' | 'bulk'
 *   • `price_history/*.yml` tiers + `fluctuations.json` tier keys → 'retail' | 'bulk' | 'lab'
 *   • legacy `price-selection.html` bulk branch also tests 'industrial' (no rows today,
 *     kept so the faithful port type-checks).
 */
export type MarketTier = 'retail' | 'wholesale' | 'bulk' | 'lab' | 'industrial';

/** The three tier keys present in `fluctuations.json` `tiers` and price-history rows. */
export type FluctuationTier = 'retail' | 'bulk' | 'lab';

export type Confidence = 'low' | 'medium' | 'high';
export type Direction = 'up' | 'down' | 'flat';
export type WindowKey = '7d' | '30d' | '90d' | '1y' | 'all_time';
export type DataQuality = 'sparse' | 'moderate' | 'rich';

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // RFC3339, e.g. '2026-03-26T00:00:00Z'

// ── Element  (from _data/element_catalog.yml, 31 entries) ───────────────────

export interface Element {
  symbol: string; // 'Dy', case-sensitive; used in the URL
  name: string; // 'Dysprosium'
  atomic_number: number; // 66
  category: ElementCategory; // 'rare_earth_heavy'
  family: string; // 'Lanthanide' | 'Transition metal' | 'Metalloid' | 'Post-transition metal' | 'Alkali metal'
  default_forms: string[]; // ['oxide','metal'] ...
  export_control_status: ExportControlStatus;
  regulatory_status: RegulatoryStatus;
  dominant_source_country: string; // ISO-2, e.g. 'CN'
  origin_countries: string[]; // ['CN','US','AU']
  trade_form: string; // 'Oxide (Dy₂O₃)'
  notes: string;
  price_tier: number; // 1 to 4
  high_demand: boolean;
  cn_export_control: boolean;
  purity_range?: string; // '99.9% to 99.99%', present on 11 of 31 entries only
}

// ── PriceRecord  (from _data/price_records.json, 238 records) ───────────────
// Two shapes coexist: the full early rows (R-0001..R-0128) carry the original
// currency / exchange / provenance fields; the leaner later rows (R-0129+) omit
// them. Fields below the divider are absent on the leaner rows.

export interface PriceRecord {
  // always present (all 238 rows)
  id: string; // 'R-0001'
  element_symbol: string; // 'La'  (FK → Element.symbol)
  element_name: string; // 'Lanthanum'
  normalized_usd_per_kg: number;
  form: string; // 'oxide' | 'metal' | 'powder' | 'alloy' | 'compound'
  purity: string; // '99.9% (3N)'
  market_tier: MarketTier; // 'retail' | 'wholesale' | 'bulk' in the data today
  moq_kg: number | null;
  quoted_quantity_kg: number | null;
  incoterm: string | null; // 'DDP' | 'FOB' | null
  source_type: string; // 'distributor_offer' | 'marketplace_listing' | 'benchmark' | ...
  seller_name: string;
  seller_country: string; // ISO-2
  verification_status: string; // 'single_source_offer' | 'corroborated' | 'verified' | ...
  confidence_score: number; // 0..1
  notes: string | null;
  quote_date: ISODate; // newest drives the footer freshness badge

  // full-record-only (absent on the leaner R-0129+ rows)
  invoice_ref?: string | null;
  original_price_per_unit?: number;
  original_currency?: string; // 'USD'
  original_unit?: string; // 'kg'
  exchange_rate_used?: number; // 1.0
  exchange_rate_date?: ISODate;
  taxes_included?: boolean;
  shipping_included?: boolean;
  source_id?: string; // FK → Source.id, OR free-text seller for non-registry sources
  source_url?: string | null;
  ingestion_timestamp?: ISODateTime;
}

// ── PriceHistory  (from _data/price_history/<Symbol>.yml, 285 observations) ──

export interface PriceObservation {
  date: ISODate;
  tier: MarketTier; // 'retail' | 'bulk' | 'lab' in the data today
  price_per_kg: number;
  currency: string; // 'USD'
  source: string; // Source.id | free-text seller | 'median_aggregate'
  source_type: string; // 'public_listing' | 'aggregate' | 'benchmark'
  record_id?: string; // 'R-0036', absent on aggregate rows
  form?: string; // 'oxide' | 'metal' | 'metal, oxide'
  purity?: string;
  seller?: string; // present on registry-source rows
  notes?: string; // present on median_aggregate rows
  original_tier?: string; // present where a row was reclassified
}

export interface PriceHistory {
  symbol: string;
  observations: PriceObservation[];
}

// ── Fluctuation  (from _data/fluctuations.json, keyed by symbol) ────────────

export interface LatestPrice {
  contributing_observations: number;
  currency: string;
  date: ISODate;
  form_summary: string; // 'metal' | 'metal, oxide'
  notes: string;
  price_per_kg: number;
  source_type: string; // e.g. 'median_aggregate'
  sources: string[];
}

export interface FluctuationWindow {
  abs_change: number;
  actual_span_days: number;
  confidence: Confidence;
  confidence_note: string;
  direction: Direction;
  distinct_days_in_window: number; // < 3 ⇒ render rule: no line / no %move (AUDIT §3)
  end_date: ISODate;
  end_price: number;
  observations_in_window: number;
  pct_change: number;
  start_date: ISODate;
  start_price: number;
  window_days: number | null; // null for 'all_time'
}

export interface TierFluctuation {
  distinct_days: number;
  observation_count: number;
  windows: Record<WindowKey, FluctuationWindow | null>; // null when the window has no data
}

export interface Fluctuation {
  data_quality: DataQuality; // 'sparse' | 'moderate' | 'rich'
  data_since: ISODate;
  data_until: ISODate;
  distinct_days: number;
  latest_bulk_price: LatestPrice | null;
  latest_lab_price: LatestPrice | null;
  latest_retail_price: LatestPrice | null;
  observation_count: number;
  tiers: Record<FluctuationTier, TierFluctuation>; // keys: 'retail' | 'bulk' | 'lab'
}

export interface FluctuationsFile {
  elements: Record<string, Fluctuation>; // keyed by element symbol
  flat_threshold_pct: number; // 1.0
  generated_at: ISODateTime;
  windows: WindowKey[]; // ['7d','30d','90d','1y','all_time']
}

// ── RegulatoryNotice  (from _data/regulatory/*.yml, 5 notices) ──────────────
// The shape is the union across the 5 notices; variant fields appear only where
// relevant.

export interface ComplianceRequirement {
  required?: boolean; // on end_user_certificate
  duration_working_days?: number; // on review_period (always 45 in current data)
  legal_basis: string;
  description: string;
}

export interface NoticeSuspension {
  suspended_by: string;
  suspension_ref: string;
  suspension_effective: ISODate;
  suspension_expires: ISODate; // e.g. '2026-11-28'
  notes: string;
}

export interface IndividualAnnouncement {
  number: number | string; // int (55) or string ('1/2026')
  scope: string;
  date_effective?: ISODate; // present on Nos. 1/17 2026
  status?: string; // 'active' | 'suspended'
}

export interface NoticeArticle {
  article: number;
  scope: string;
  status: string;
  description: string;
  suspended: boolean;
  suspension_notice?: string;
  suspension_expires?: ISODate;
}

export interface SanctionedEntities {
  count: number;
  designation: string;
  effect: string;
  note: string;
}

export interface RegulatoryNotice {
  notice_id: string; // 'MOFCOM No. 46/2024'
  chinese_ref: string; // '商务部公告2024年第46号'
  issuing_authority: string; // 'MOFCOM' | 'MOFCOM/GAC'
  date_issued: ISODate;
  date_effective: ISODate;
  status: 'active' | 'suspended';
  affected_elements: string[]; // element symbols
  controlled_forms: string[]; // ['metal','alloy','oxide','compound', ...]
  measure_type: string; // 'export_licence_required' | 'presumptive_denial' | ...
  description: string;
  compliance_requirements: {
    end_user_certificate?: ComplianceRequirement;
    review_period?: ComplianceRequirement;
  };
  notes: string[];
  // variant fields (present only on some notices):
  suspension?: NoticeSuspension;
  newly_controlled_elements?: string[]; // Nos. 55 to 62: [Ho, Er, Tm, Eu, Yb]
  individual_announcements?: IndividualAnnouncement[];
  articles?: NoticeArticle[]; // gac_46_2024
  related_notices?: string[]; // gac_46_2024
  target_country?: string; // mofcom_1_17_2026: 'JP'
  sanctioned_entities?: SanctionedEntities; // mofcom_1_17_2026
}

// ── PolicyEvent  (from _data/policy_events.yml, 11 events) ──────────────────

export type PolicyEventType =
  | 'export_control'
  | 'export_ban'
  | 'sanction'
  | 'suspension'
  | 'regulation';

export interface PolicyEvent {
  id: string; // 'pe-2025-04-04'
  date: ISODate;
  title: string;
  description: string;
  affected_elements: string[]; // may be [] (e.g. EU CRMA, sanctions)
  affected_forms: string[]; // may be []
  event_type: PolicyEventType;
  source_country: string; // 'CN' | 'EU'
  source_name: string; // 'MOFCOM/GAC Announcement No. 18 of 2025'
  source_url: string | null;
  notes: string; // includes the Chinese reference string
}

// ── Movements  (from _data/movements.yml, auto-generated event feed) ────────
// Written by scripts/detect_movements.py: factual price-movement and
// regulatory-change events. `events` is the reverse-chronological feed; `config`
// and `state` drive the page footer + the Atom feed's <updated> stamp. Fields
// below the always-present block are present only on certain event `type`s.

export type MovementType =
  | 'price_spike'
  | 'price_drop'
  | 'regulatory_change'
  | 'new_data';

export interface MovementSparkline {
  width: number;
  height: number;
  path: string; // SVG path `d` attribute
  point_count: number;
  min_price: number;
  max_price: number;
  last_x: number;
  last_y: number;
}

export interface MovementEvent {
  // always present (every event)
  id: string; // 'Y-retail-30d-2026-04-04', anchors #mv-<id>
  date: ISODate;
  element: string; // 'Y' (FK → Element.symbol)
  element_name: string; // 'Yttrium'
  element_url: string; // '/elements/Y/'
  type: MovementType;
  description: string; // deterministic factual summary (no editorial interpretation)
  source: string; // 'fluctuations.json'

  // price_spike / price_drop only
  tier?: FluctuationTier; // 'retail' | 'bulk' | 'lab'
  tier_label?: string;
  window?: string; // '30d'
  direction?: Direction; // 'up' | 'down' | 'flat'
  magnitude_pct?: number;
  abs_magnitude_pct?: number;
  start_date?: ISODate;
  end_date?: ISODate;
  start_price_per_kg?: number;
  end_price_per_kg?: number;
  currency?: string; // 'USD'
  confidence?: Confidence;
  actual_span_days?: number;
  sparkline?: MovementSparkline;

  // price_spike / price_drop / new_data
  observation_count?: number;
  distinct_days?: number;

  // regulatory_change only (none in the data today; typed for the ported row)
  prior_signature?: string;
  current_signature?: string;
}

export interface MovementsConfig {
  threshold_pct: number; // 10.0, the detection threshold
  window: string; // '30d'
  tiers: string[]; // ['retail','bulk','lab']
}

export interface MovementsState {
  /** symbol → 'status|controlled=…|signature' string used to detect regulatory changes. */
  regulatory: Record<string, string>;
  last_run: ISODateTime; // drives the Atom feed <updated> + page footer
}

export interface MovementsFile {
  config: MovementsConfig;
  state: MovementsState;
  events: MovementEvent[]; // reverse-chronological as authored
}

// ── Source  (from _data/source_registry.yml, 5 sources) ─────────────────────

export type SourceType = 'distributor' | 'marketplace';

export interface Source {
  id: string; // 'stanford-advanced-materials-01'
  name: string; // 'Stanford Advanced Materials'
  type: SourceType;
  trust_tier: number; // 1 (highest) .. 5
  country: string; // ISO-2
  supported_elements: string[]; // element symbols this source quotes
  parse_status: string; // 'active'
  review_status: string; // 'reviewed'
}

// ── SourceBreakdown  (from _data/source_breakdown.yml) ───────────────────────

export interface SourceBreakdownEntry {
  source_type: string; // 'public_listing' | 'benchmark' | 'aggregate' | ...
  label: string; // 'Public listings'
  description: string;
  count: number;
  percent: number;
}

export interface SourceBreakdown {
  generated_on: ISODate;
  total_observations: number;
  by_source_type: SourceBreakdownEntry[];
}

// ── News  (from _data/news.yml, 16 items) ───────────────────────────────────

export interface NewsReference {
  label: string;
  note?: string;
}

export interface NewsItem {
  date: ISODate;
  headline: string;
  body: string;
  status: string; // 'active' | 'suspended' | 'superseded' | 'historic'
  tag: string; // 'Analysis' | 'Market Research' | ...
  elements?: string[]; // related element symbols
  references?: NewsReference[];
  article?: string; // slug → _articles/<slug>.md (present on the long-form items)
}

// ── SiteSettings  (from _data/site_settings.yml) ─────────────────────────────
// Configurable thresholds and display labels. Field names verbatim; the trust
// tiers / label maps are keyed exactly as authored (numeric keys parse to JS
// number keys via YAML).

export interface SiteSettings {
  freshness_threshold_days: number;
  stale_threshold_days: number;
  default_currency: string;
  default_unit: string;
  high_confidence_minimum: number;
  medium_confidence_minimum: number;
  verification_labels: Record<string, string>;
  source_trust_tiers: Record<number, string>; // 1 (highest) .. 5
  category_labels: Record<ElementCategory, string>;
  export_control_labels: Record<ExportControlStatus, string>;
}

// ── Derived / aggregate result shapes (computed by lib/data/index.ts) ────────

/** Output of the ported reference-price selection (lib/price-gauge.ts). */
export interface ReferencePrices {
  retailRef: PriceRecord | null;
  bulkRef: PriceRecord | null;
  retailPremium: number | null; // retailRef ÷ bulkRef when both exist
}

export interface PremiumLeaderboardRow {
  symbol: string;
  name: string;
  category: ElementCategory;
  retail_usd_per_kg: number;
  bulk_usd_per_kg: number;
  premium: number; // retail ÷ bulk
  retail_form: string; // form the retail reference is quoted in (e.g. 'metal')
  bulk_form: string; // form the bulk benchmark is quoted in (e.g. 'oxide')
  // Source dates of the two reference records (the basis disclosure on the
  // leaderboard): a premium is only a clean snapshot when both sides are quoted
  // close in time, so each side carries its own quote date.
  retail_date: ISODate; // quote_date of the retail reference
  bulk_date: ISODate; // quote_date of the bulk benchmark
  // Purity each side is quoted at. Surfaced in the row tooltip (not a column) so
  // a reader can see that even a same-form premium may not be strictly
  // like-for-like; null where the source did not state a purity.
  retail_purity: string | null;
  bulk_purity: string | null;
}

/** Counts of elements by their fluctuation `data_quality`, plus uncovered ('none'). */
export interface CoverageTally {
  rich: number;
  moderate: number;
  sparse: number;
  none: number;
}

/**
 * Per-element price-data coverage. Drives the data-coverage grid (Prompt 10) and
 * the coverage drilldown table on the dashboard. The grade is a function of the
 * counts below, so the table can show exactly why each element earns its grade.
 */
export interface ElementCoverage {
  symbol: string;
  name: string;
  category: ElementCategory;
  quality: DataQuality | 'none'; // 'none' = no fluctuation entry / zero observations
  observations: number; // individual (non-aggregate) observations, the grade's obs input
  distinctDays: number; // distinct observation days across all tiers (the grade's primary driver); 0 when none
  retailAvailable: boolean; // any retail-tier observations on file
  bulkAvailable: boolean; // any bulk-tier observations on file
  labAvailable: boolean; // any lab-tier observations on file (rare)
  dataSince: ISODate | null; // earliest observation date; null when none
  dataUntil: ISODate | null; // latest observation date; null when none
}

/**
 * China-export-control tally for one element category. It drives the
 * market-structure bars (Prompt 10). `controlled` counts elements with
 * `cn_export_control === true`.
 */
export interface CategoryControl {
  category: ElementCategory;
  controlled: number;
  total: number;
}

/**
 * Dashboard regulatory snapshot: element counts by Chinese export-control
 * posture and current regulatory state (Prompt 17). Each breakdown partitions
 * all `total` catalog elements; counts come straight from the catalog.
 */
export interface RegulatorySnapshot {
  export_control: Record<ExportControlStatus, number>; // restricted | monitored | normal
  regulatory: Record<RegulatoryStatus, number>; // active | suspended | none
  total: number;
}
