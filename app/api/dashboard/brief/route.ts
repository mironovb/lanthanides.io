/**
 * GET /api/dashboard/brief: a structured, machine-readable capture of the
 * /dashboard/ market overview — the China export-control posture, the
 * retail-vs-bulk premium leaderboard, price-data coverage, and the movement-event
 * summary the dashboard renders — serialized so a reader can capture the current
 * state without taking a screenshot or scraping the page.
 *
 * Every figure is derived at build time from the versioned `_data/` reference
 * files through the SAME `lib/data` accessors (and the same movements summarizer)
 * the dashboard itself uses, so the brief can never drift from the rendered page
 * and nothing is fabricated (CLAUDE.md hard rule #1).
 *
 * It reads NO database rows. The dashboard is intentionally DB-free
 * (docs/DASHBOARD-ROADMAP.md §5) and so is this endpoint: that keeps `npm run
 * build` green when Postgres is absent and guarantees the brief can never expose
 * a private Listing / Subscription / ScreenedOffer row.
 *
 * Cache-safe: pre-rendered at build (`force-static`) and served with a public
 * `Cache-Control`. It captures the FULL, unfiltered ledger — the same set the
 * page renders before its client-side element lens narrows it — so the response
 * is stable and shareable. Licensed CC BY 4.0, surfaced in both the response
 * headers and the body, matching the open-data export at /api/export/[format].
 */
import {
  getControlByCategory,
  getCoverageTally,
  getDataGeneratedAt,
  getElementCoverage,
  getMovements,
  getPremiumLeaderboard,
  getPriceRecords,
  getRegulatorySnapshot,
  getSiteSettings,
} from '@/lib/data';
import { summarizeMovements } from '@/components/dashboard/movement-summary';
import { MIN_SPARKLINE_POINTS } from '@/components/charts/sufficiency';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';
const ATTRIBUTION = 'lanthanides.io — Strategic Materials Ledger';

/**
 * Assemble the brief object from the typed data layer. Pure read: every value is
 * a real tally or a passed-through derived field; the prose `*_note` strings
 * describe the figures, never stand in for missing ones.
 */
function buildBrief() {
  const dataAsOf = getDataGeneratedAt();
  const snapshot = getRegulatorySnapshot();
  const records = getPriceRecords();
  const premiums = getPremiumLeaderboard();
  const coverage = getElementCoverage();
  const tally = getCoverageTally();
  const byCategory = getControlByCategory();
  const movements = getMovements();
  const moveSummary = summarizeMovements(movements.events);
  const settings = getSiteSettings();

  // Elements named in a Chinese export-control regime, in force or paused: the
  // same active + suspended set the dashboard's snapshot band counts.
  const underChinaControls =
    snapshot.regulatory.active + snapshot.regulatory.suspended;

  return {
    title: 'lanthanides.io — Market Dashboard brief',
    description:
      'A machine-readable capture of the /dashboard/ market overview: China export-control posture, retail-vs-bulk price premiums, and price-data coverage. Every figure is derived from the versioned open dataset — no fabricated values, no private database rows.',
    dashboard_url: `${SITE_URL}/dashboard/`,
    // The freshness anchor: the fluctuations dataset's generation timestamp, the
    // same "data as of" stamp the dashboard masthead shows. Not "now".
    data_as_of: dataAsOf,
    view: 'full_ledger',
    view_note:
      'The complete, unfiltered ledger — the same set the dashboard renders before its element lens (category / export-control) narrows it client-side. This brief is intentionally unfiltered so the response stays cache-safe and stable.',
    license: {
      id: 'CC-BY-4.0',
      name: 'Creative Commons Attribution 4.0 International',
      url: LICENSE_URL,
      attribution: ATTRIBUTION,
    },
    provenance: {
      derived_from:
        'Versioned reference files in _data/ (element catalog, price records, fluctuations, movements), read at build time through the typed lib/data layer.',
      contains_private_data: false,
      private_data_note:
        'Derived solely from the open _data/ files; no Listing, Subscription, ScreenedOffer, or other database rows are read or exposed.',
      methodology_url: `${SITE_URL}/methodology/`,
      open_data_export: {
        json: `${SITE_URL}/api/export/json/`,
        csv: `${SITE_URL}/api/export/csv/`,
      },
    },
    // Display labels for the raw category / export-control enums used below, so a
    // consumer can resolve them without re-deriving the vocabulary.
    labels: {
      category: settings.category_labels,
      export_control: settings.export_control_labels,
    },
    snapshot: {
      tracked_elements: snapshot.total,
      sourced_price_records: records.length,
      sourced_price_records_note:
        'Carry a seller, date, and source each — sourced into the dataset, not all independently verified.',
      priced_in_both_tiers: premiums.length,
      under_china_controls: underChinaControls,
      under_china_controls_note:
        'Elements named in an active or suspended Chinese export-control regime.',
    },
    regulatory: {
      note: `Counts partition all ${snapshot.total} tracked elements; derived from the element catalog.`,
      export_control: snapshot.export_control,
      regulatory_state: snapshot.regulatory,
      by_category: byCategory,
      detail_url: `${SITE_URL}/regulatory/`,
    },
    retail_premium_leaderboard: {
      note: 'Latest retail reference ÷ latest bulk benchmark, ranked by markup. Only elements priced in both tiers appear. A premium can mix forms (each side discloses its form, quote date, and purity), so it is a snapshot, not a strict like-for-like spread.',
      unit: 'USD/kg',
      count: premiums.length,
      rows: premiums.map((p) => ({
        symbol: p.symbol,
        name: p.name,
        category: p.category,
        retail_usd_per_kg: p.retail_usd_per_kg,
        bulk_usd_per_kg: p.bulk_usd_per_kg,
        premium: p.premium,
        retail_form: p.retail_form,
        bulk_form: p.bulk_form,
        retail_date: p.retail_date,
        bulk_date: p.bulk_date,
        retail_purity: p.retail_purity,
        bulk_purity: p.bulk_purity,
      })),
    },
    data_coverage: {
      note: 'Each element graded by how many distinct days of price observations back it. Thin coverage is shown, not hidden.',
      tally,
      elements: coverage.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        category: c.category,
        quality: c.quality,
        observations: c.observations,
        distinct_days: c.distinctDays,
        tiers: {
          retail: c.retailAvailable,
          bulk: c.bulkAvailable,
          lab: c.labAvailable,
        },
        data_since: c.dataSince,
        data_until: c.dataUntil,
      })),
    },
    movement_events: {
      note: 'Auto-detected price and regulatory events. No "movers" board is ranked: most windows span only two observation days, so ranking them would surface oxide-vs-metal artefacts as real moves. The /movements feed shows each event with its own confidence and sample size.',
      detection: {
        threshold_pct: movements.config?.threshold_pct ?? 10,
        window: movements.config?.window ?? '30d',
        min_observation_days_for_trend: MIN_SPARKLINE_POINTS,
      },
      total: moveSummary.total,
      by_type: moveSummary.byType,
      price_moves: moveSummary.priceMoves,
      windows_reaching_min_days: moveSummary.multiDay,
      thin_two_day_windows: moveSummary.thin,
      confidence: moveSummary.confidence,
      latest_event: moveSummary.latestEvent,
      detail_url: `${SITE_URL}/movements/`,
    },
  };
}

export function GET() {
  const brief = buildBrief();
  return new Response(JSON.stringify(brief, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition':
        'inline; filename="lanthanides-dashboard-brief.json"',
      'X-License': 'CC-BY-4.0',
      Link: `<${LICENSE_URL}>; rel="license"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
