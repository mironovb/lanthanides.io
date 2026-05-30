/**
 * Cached, build-time loaders over the repo-root `_data/` directory.
 *
 * Read-only: this layer NEVER writes to `_data/` (CLAUDE.md hard rule — the
 * Python pipeline owns those files). Each loader parses once and memoises the
 * result per process. JSON is read via `fs` + `JSON.parse`; YAML via the `yaml`
 * package. Light structural validation runs at parse time so a malformed file
 * fails `npm run build` loudly (docs/ARCHITECTURE.md §3).
 *
 * These modules use `fs`, so they are server-only by construction — import them
 * from Server Components and route handlers, never from a Client Component.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import type {
  Element,
  FluctuationsFile,
  MovementsFile,
  NewsItem,
  PolicyEvent,
  PriceHistory,
  PriceRecord,
  RegulatoryNotice,
  SiteSettings,
  Source,
  SourceBreakdown,
} from './types';

// `process.cwd()` is the repo root during `next build` and `next dev`.
const DATA_DIR = join(process.cwd(), '_data');

function fail(file: string, message: string): never {
  throw new Error(`[lib/data] malformed _data/${file}: ${message}`);
}

function readText(file: string): string {
  try {
    return readFileSync(join(DATA_DIR, file), 'utf8');
  } catch (err) {
    throw new Error(
      `[lib/data] could not read _data/${file}: ${(err as Error).message}`,
    );
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(readText(file)) as T;
}

function readYaml<T>(file: string): T {
  return parseYaml(readText(file)) as T;
}

/** Memoise a zero-arg loader so the file is read & parsed at most once per process. */
function once<T>(fn: () => T): () => T {
  let cached: { value: T } | undefined;
  return () => (cached ??= { value: fn() }).value;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireFields(
  file: string,
  row: Record<string, unknown>,
  label: string,
  fields: string[],
): void {
  for (const f of fields) {
    if (!(f in row) || row[f] === undefined) {
      fail(file, `${label} is missing required field "${f}"`);
    }
  }
}

// ── Element catalog ──────────────────────────────────────────────────────────

export const loadElementCatalog = once<Element[]>(() => {
  const file = 'element_catalog.yml';
  const data = readYaml<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level list of elements');
  data.forEach((row, i) => {
    if (!isObject(row)) fail(file, `entry ${i} is not a mapping`);
    requireFields(file, row, `element ${row.symbol ?? i}`, [
      'symbol',
      'name',
      'atomic_number',
      'category',
      'regulatory_status',
      'export_control_status',
    ]);
  });
  return data as Element[];
});

// ── Price records ─────────────────────────────────────────────────────────────

export const loadPriceRecords = once<PriceRecord[]>(() => {
  const file = 'price_records.json';
  const data = readJson<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level array of records');
  data.forEach((row, i) => {
    if (!isObject(row)) fail(file, `record ${i} is not an object`);
    // Validate only the fields present on every row (both record shapes).
    requireFields(file, row, `record ${row.id ?? i}`, [
      'id',
      'element_symbol',
      'normalized_usd_per_kg',
      'market_tier',
      'confidence_score',
      'quote_date',
    ]);
  });
  return data as PriceRecord[];
});

// ── Price history (one file per element symbol) ────────────────────────────────

export const loadAllPriceHistory = once<Map<string, PriceHistory>>(() => {
  const dir = 'price_history';
  let files: string[];
  try {
    files = readdirSync(join(DATA_DIR, dir)).filter((f) => f.endsWith('.yml'));
  } catch (err) {
    throw new Error(
      `[lib/data] could not list _data/${dir}: ${(err as Error).message}`,
    );
  }
  const bySymbol = new Map<string, PriceHistory>();
  for (const f of files) {
    const rel = `${dir}/${f}`;
    const data = readYaml<unknown>(rel);
    if (!isObject(data) || typeof data.symbol !== 'string') {
      fail(rel, 'expected a mapping with a "symbol" key');
    }
    if (!Array.isArray(data.observations)) {
      fail(rel, '"observations" must be a list');
    }
    bySymbol.set(data.symbol as string, data as unknown as PriceHistory);
  }
  return bySymbol;
});

// ── Fluctuations ────────────────────────────────────────────────────────────

export const loadFluctuationsFile = once<FluctuationsFile>(() => {
  const file = 'fluctuations.json';
  const data = readJson<unknown>(file);
  if (!isObject(data) || !isObject(data.elements)) {
    fail(file, 'expected an object with an "elements" map');
  }
  return data as unknown as FluctuationsFile;
});

// ── Regulatory notices ────────────────────────────────────────────────────────

export const loadRegulatoryNotices = once<RegulatoryNotice[]>(() => {
  const dir = 'regulatory';
  let files: string[];
  try {
    files = readdirSync(join(DATA_DIR, dir))
      .filter((f) => f.endsWith('.yml'))
      .sort();
  } catch (err) {
    throw new Error(
      `[lib/data] could not list _data/${dir}: ${(err as Error).message}`,
    );
  }
  return files.map((f) => {
    const rel = `${dir}/${f}`;
    const data = readYaml<unknown>(rel);
    if (!isObject(data)) fail(rel, 'expected a mapping');
    requireFields(rel, data, 'notice', [
      'notice_id',
      'status',
      'affected_elements',
    ]);
    if (!Array.isArray(data.affected_elements)) {
      fail(rel, '"affected_elements" must be a list');
    }
    return data as unknown as RegulatoryNotice;
  });
});

// ── Movements (auto-generated event feed) ──────────────────────────────────────

export const loadMovements = once<MovementsFile>(() => {
  const file = 'movements.yml';
  const data = readYaml<unknown>(file);
  if (!isObject(data) || !Array.isArray(data.events)) {
    fail(file, 'expected a mapping with an "events" list');
  }
  data.events.forEach((row, i) => {
    if (!isObject(row)) fail(file, `event ${i} is not a mapping`);
    requireFields(file, row, `event ${row.id ?? i}`, [
      'id',
      'date',
      'element',
      'type',
    ]);
  });
  return data as unknown as MovementsFile;
});

// ── Policy events ──────────────────────────────────────────────────────────────

export const loadPolicyEvents = once<PolicyEvent[]>(() => {
  const file = 'policy_events.yml';
  const data = readYaml<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level list of events');
  data.forEach((row, i) => {
    if (!isObject(row)) fail(file, `event ${i} is not a mapping`);
    requireFields(file, row, `event ${row.id ?? i}`, ['id', 'date', 'event_type']);
  });
  return data as PolicyEvent[];
});

// ── News ───────────────────────────────────────────────────────────────────────

export const loadNews = once<NewsItem[]>(() => {
  const file = 'news.yml';
  const data = readYaml<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level list of news items');
  data.forEach((row, i) => {
    if (!isObject(row)) fail(file, `news item ${i} is not a mapping`);
    requireFields(file, row, `news item ${i}`, ['date', 'headline']);
  });
  return data as NewsItem[];
});

// ── Source registry ──────────────────────────────────────────────────────────

export const loadSources = once<Source[]>(() => {
  const file = 'source_registry.yml';
  const data = readYaml<unknown>(file);
  if (!Array.isArray(data)) fail(file, 'expected a top-level list of sources');
  data.forEach((row, i) => {
    if (!isObject(row)) fail(file, `source ${i} is not a mapping`);
    requireFields(file, row, `source ${row.id ?? i}`, ['id', 'name', 'type']);
  });
  return data as Source[];
});

// ── Source breakdown ─────────────────────────────────────────────────────────

export const loadSourceBreakdown = once<SourceBreakdown>(() => {
  const file = 'source_breakdown.yml';
  const data = readYaml<unknown>(file);
  if (!isObject(data) || !Array.isArray(data.by_source_type)) {
    fail(file, 'expected a mapping with a "by_source_type" list');
  }
  return data as unknown as SourceBreakdown;
});

// ── Site settings ──────────────────────────────────────────────────────────

export const loadSiteSettings = once<SiteSettings>(() => {
  const file = 'site_settings.yml';
  const data = readYaml<unknown>(file);
  if (!isObject(data) || !isObject(data.source_trust_tiers)) {
    fail(file, 'expected a mapping with a "source_trust_tiers" map');
  }
  return data as unknown as SiteSettings;
});
