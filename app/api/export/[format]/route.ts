/**
 * GET /api/export/[format] — the open-data export of the canonical price-records
 * dataset (Prompt 8). `format` is `json` or `csv`; both are generated from the
 * same `lib/data` accessor so the export can never drift from what the site
 * renders. Licensed CC BY 4.0 (surfaced in the response headers + the /data
 * page). This is the always-fresh companion to the preserved static export at
 * /assets/data/fluctuations.json (docs/MIGRATION.md §3.4).
 *
 * Pre-rendered at build for both formats (generateStaticParams +
 * dynamicParams=false); any other format 404s.
 */
import { getPriceRecords } from '@/lib/data';
import type { PriceRecord } from '@/lib/types';

export const dynamic = 'force-static';
export const dynamicParams = false;

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

export function generateStaticParams(): Array<{ format: string }> {
  return [{ format: 'json' }, { format: 'csv' }];
}

/** Preferred column order for the CSV; any unexpected keys are appended (no data loss). */
const PREFERRED_COLUMNS: Array<keyof PriceRecord> = [
  'id',
  'element_symbol',
  'element_name',
  'quote_date',
  'form',
  'purity',
  'market_tier',
  'normalized_usd_per_kg',
  'original_price_per_unit',
  'original_currency',
  'original_unit',
  'exchange_rate_used',
  'exchange_rate_date',
  'moq_kg',
  'quoted_quantity_kg',
  'incoterm',
  'taxes_included',
  'shipping_included',
  'source_type',
  'source_id',
  'source_url',
  'seller_name',
  'seller_country',
  'verification_status',
  'confidence_score',
  'invoice_ref',
  'notes',
  'ingestion_timestamp',
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(records: PriceRecord[]): string {
  // Union of keys so a leaner-row field never silently drops out of the export.
  const keys = new Set<string>();
  for (const r of records) for (const k of Object.keys(r)) keys.add(k);
  const columns = [
    ...PREFERRED_COLUMNS.filter((k) => keys.has(k as string)),
    ...[...keys].filter((k) => !PREFERRED_COLUMNS.includes(k as keyof PriceRecord)).sort(),
  ] as string[];

  const header = columns.map(csvCell).join(',');
  const rows = records.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    return columns.map((c) => csvCell(row[c])).join(',');
  });
  return [header, ...rows].join('\r\n');
}

export function GET(
  _request: Request,
  { params }: { params: { format: string } },
) {
  const records = getPriceRecords();
  const commonHeaders: Record<string, string> = {
    'X-License': 'CC-BY-4.0',
    Link: `<${LICENSE_URL}>; rel="license"`,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  };

  if (params.format === 'json') {
    return new Response(JSON.stringify(records, null, 2), {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'inline; filename="lanthanides-price-records.json"',
      },
    });
  }

  if (params.format === 'csv') {
    return new Response(toCsv(records), {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lanthanides-price-records.csv"',
      },
    });
  }

  // Unreachable under dynamicParams=false, but explicit for safety.
  return new Response('Unsupported export format. Use "json" or "csv".', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
