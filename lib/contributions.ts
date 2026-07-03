/**
 * Server-side access to the contributions inbox: ONE Neon table
 * (price_contributions, db/schema.sql), used for community price contributions
 * and nothing else. This module is the only place the app touches a database.
 *
 * Rules (CLAUDE.md data strategy):
 * - The build never reads the DB: the client is created lazily at request time
 *   and every consumer is force-dynamic, so `npm run build` stays green with no
 *   DATABASE_URL at all (the inbox simply reports itself unavailable).
 * - Rows are a review queue, never reference data: the app only INSERTs
 *   status 'pending' rows and SELECTs recent rows for display. Publishing an
 *   accepted observation into _data/ stays a maintainer git-PR step.
 * - Reads are resilient: a DB outage degrades the queue panel, never the page.
 *
 * Server-only: importing this from a client component would fail at build
 * (the driver needs Node APIs) and must never happen.
 */
import { neon } from '@neondatabase/serverless';
import type {
  CleanContribution,
  ContributionDTO,
} from '@/components/contribute/contributions';

type Sql = ReturnType<typeof neon>;

let cached: Sql | null | undefined;

/** The lazy HTTP client, or null when DATABASE_URL is unset (inbox offline). */
function getSql(): Sql | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL?.trim();
  // cache: 'no-store' is correctness, not tuning: the driver
  // queries over fetch(), and Next's Data Cache will happily persist a
  // server-component fetch across requests AND builds, freezing the queue at
  // its first render. Opting out at the driver level protects every consumer
  // regardless of route segment config.
  cached = url ? neon(url, { fetchOptions: { cache: 'no-store' } }) : null;
  return cached;
}

/** Whether the inbox is configured at all (env present; says nothing about reachability). */
export function inboxConfigured(): boolean {
  return getSql() !== null;
}

// The Neon HTTP driver parses DATE/TIMESTAMPTZ columns into JS Dates; normalise
// both to ISO strings so the DTO is stable however the value arrives. A DATE
// is parsed as LOCAL midnight, so read it back with local getters: UTC-based
// toISOString would shift the calendar day on a UTC+ server.
function isoTimestamp(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function isoDate(v: unknown): string {
  if (v instanceof Date) {
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${v.getFullYear()}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

function rowToDTO(row: Record<string, unknown>): ContributionDTO {
  return {
    id: Number(row.id),
    createdAt: isoTimestamp(row.created_at),
    element: String(row.element),
    form: String(row.form),
    purity: row.purity == null ? null : String(row.purity),
    quantityKg: row.quantity_kg == null ? null : Number(row.quantity_kg),
    price: Number(row.price),
    currency: String(row.currency),
    unit: String(row.unit),
    tier: String(row.tier),
    sourceName: String(row.source_name),
    sourceUrl: row.source_url == null ? null : String(row.source_url),
    observedDate: isoDate(row.observed_date),
    submittedBy: row.submitted_by == null ? null : String(row.submitted_by),
    status: String(row.status),
  };
}

/** Insert a validated contribution as a pending queue row. Throws on DB failure. */
export async function insertContribution(
  c: CleanContribution,
): Promise<ContributionDTO> {
  const sql = getSql();
  if (!sql) throw new Error('contributions inbox is not configured');
  const rows = (await sql`
    INSERT INTO price_contributions
      (element, form, purity, quantity_kg, tier, price, currency, unit,
       source_name, source_url, observed_date, submitted_by, notes)
    VALUES
      (${c.element}, ${c.form}, ${c.purity}, ${c.quantityKg}, ${c.tier},
       ${c.price}, ${c.currency}, ${c.unit}, ${c.sourceName}, ${c.sourceUrl},
       ${c.observedDate}, ${c.submittedBy}, ${c.notes})
    RETURNING *
  `) as Record<string, unknown>[];
  return rowToDTO(rows[0]);
}

export interface ContributionQueue {
  rows: ContributionDTO[];
  pending: number;
}

/**
 * The recent queue for display, newest first, plus the pending count.
 * Returns null when the inbox is unconfigured OR unreachable, so callers
 * render a calm fallback instead of crashing the page.
 */
export async function listRecentContributions(
  limit = 20,
): Promise<ContributionQueue | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = (await sql`
      SELECT * FROM price_contributions
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as Record<string, unknown>[];
    const counts = (await sql`
      SELECT count(*)::int AS pending
      FROM price_contributions
      WHERE status = 'pending'
    `) as Record<string, unknown>[];
    return {
      rows: rows.map(rowToDTO),
      pending: Number(counts[0]?.pending ?? 0),
    };
  } catch {
    return null;
  }
}
