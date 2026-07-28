/**
 * Loader hard-rule validation (PLAN P6): prove `lib/marketplace` THROWS on
 * each authoring mistake it claims to reject, against a minimal fixture
 * `_marketplace/` tree copied from a REAL listing file and mutated one rule at
 * a time.
 *
 * Isolation mechanics (reported in the suite docs): `lib/marketplace` memoises
 * per process AND resolves `_marketplace/` from `process.cwd()` at module
 * evaluation, so every scenario gets a FRESH `mkdtemp` tree, `process.chdir`s
 * into it, then re-imports the loader via `vi.resetModules()` + dynamic
 * `import()` — a fresh module registry per scenario. `pool: 'forks'` in
 * vitest.config.ts makes `process.chdir` legal (unavailable in worker
 * threads) and isolates this file's registry games from the other suites.
 *
 * Every mutation goes through `mutate()`, which fails the test if the pattern
 * did not match — a scenario can never silently test the unmutated file.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Real source material, read once from the repo before any chdir.
const REAL_SETTINGS = readFileSync(join(ROOT, '_marketplace', 'settings.yml'), 'utf8');
// Keep the fixture minimal and future-proof: only the first (real) seller —
// demonstration sellers and their assets are irrelevant to loader validation.
const REAL_SELLERS = readFileSync(join(ROOT, '_marketplace', 'sellers.yml'), 'utf8').split(
  '# Demonstration seller',
)[0];
const REAL_LISTING = readFileSync(
  join(ROOT, '_marketplace', 'listings', 'scandium-1900.md'),
  'utf8',
);

const ORIGINAL_CWD = process.cwd();
let tmp: string | null = null;

beforeEach(() => {
  tmp = null;
});

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  if (tmp !== null) rmSync(tmp, { recursive: true, force: true });
});

/** Replace `pattern` in `source`, failing the test on a no-op mutation. */
function mutate(source: string, pattern: string | RegExp, replacement: string): string {
  const out = source.replace(pattern, replacement);
  if (out === source) {
    throw new Error(`fixture mutation did not match: ${String(pattern)}`);
  }
  return out;
}

interface FixtureOptions {
  /** Listing file content; defaults to the real scandium-1900.md. */
  listing?: string;
  /** Listing file name; defaults to scandium-1900.md. */
  listingFileName?: string;
  /** settings.yml expected_listings; defaults to 1 (the fixture has 1 file). */
  expectedListings?: number;
}

/** Build a fresh minimal `_marketplace/` tree in a tmp dir and chdir into it. */
function buildFixture(opts: FixtureOptions = {}): void {
  const dir = mkdtempSync(join(tmpdir(), 'marketplace-fixture-'));
  tmp = dir;

  mkdirSync(join(dir, '_marketplace', 'listings'), { recursive: true });
  mkdirSync(join(dir, '_marketplace', 'sellers'), { recursive: true });

  const expected = opts.expectedListings ?? 1;
  writeFileSync(
    join(dir, '_marketplace', 'settings.yml'),
    mutate(REAL_SETTINGS, /expected_listings: \d+/, `expected_listings: ${expected}`),
  );
  writeFileSync(join(dir, '_marketplace', 'sellers.yml'), REAL_SELLERS);
  cpSync(
    join(ROOT, '_marketplace', 'sellers', 'kazakhelements.md'),
    join(dir, '_marketplace', 'sellers', 'kazakhelements.md'),
  );

  writeFileSync(
    join(dir, '_marketplace', 'listings', opts.listingFileName ?? 'scandium-1900.md'),
    opts.listing ?? REAL_LISTING,
  );

  // The on-disk assets the loader existence-checks (avatar + listing photo).
  cpSync(
    join(ROOT, 'public', 'assets', 'marketplace', 'sellers', 'kazakhelements', 'avatar.svg'),
    join(dir, 'public', 'assets', 'marketplace', 'sellers', 'kazakhelements', 'avatar.svg'),
  );
  cpSync(
    join(ROOT, 'public', 'assets', 'marketplace', 'listings', 'scandium-1900', '01.jpg'),
    join(dir, 'public', 'assets', 'marketplace', 'listings', 'scandium-1900', '01.jpg'),
  );

  process.chdir(dir);
}

/**
 * Import a FRESH copy of the loader (post-chdir) and return the integrity
 * entry point. `assertMarketplaceIntegrity` runs settings + sellers + every
 * listing parse plus the cross-file count gate — the exact build-time path.
 */
async function freshLoader(): Promise<() => void> {
  vi.resetModules();
  const mod = await import('@/lib/marketplace/verify');
  return mod.assertMarketplaceIntegrity;
}

describe('loader validation over a mutated fixture tree', () => {
  it('control: the unmutated fixture passes integrity', async () => {
    buildFixture();
    expect(await freshLoader()).not.toThrow();
  });

  it('throws on an unknown front-matter key', async () => {
    buildFixture({
      listing: mutate(REAL_LISTING, 'slug: "scandium-1900"', 'slug: "scandium-1900"\nbogus_key: true'),
    });
    expect(await freshLoader()).toThrow(/unknown key "bogus_key"/);
  });

  it('throws on an unquoted YAML date (js-yaml Date coercion)', async () => {
    buildFixture({
      listing: mutate(REAL_LISTING, 'listed_on: "2026-03-11"', 'listed_on: 2026-03-11'),
    });
    expect(await freshLoader()).toThrow(/YAML parsed the unquoted date into a Date object/);
  });

  it('throws on a wrong-case element symbol, naming the canonical form', async () => {
    buildFixture({
      listing: mutate(REAL_LISTING, '  - "Sc"', '  - "sc"'),
    });
    expect(await freshLoader()).toThrow(/case-sensitive; did you mean "Sc"\?/);
  });

  it('throws on form set for an equipment-category listing', async () => {
    buildFixture({
      listing: mutate(REAL_LISTING, 'category: "pure-metal"', 'category: "equipment"'),
    });
    expect(await freshLoader()).toThrow(/"form" must be null for category "equipment"/);
  });

  it('throws on an image path whose file does not exist', async () => {
    buildFixture({
      listing: mutate(
        REAL_LISTING,
        '/assets/marketplace/listings/scandium-1900/01.jpg',
        '/assets/marketplace/listings/scandium-1900/02.jpg',
      ),
    });
    expect(await freshLoader()).toThrow(/points at a file that does not exist/);
  });

  it('throws on a duplicate variant legacy_sku', async () => {
    buildFixture({
      // Second variant's SKU overwritten with the first's.
      listing: mutate(REAL_LISTING, '"396682381010-66869"', '"396682381010-66868"'),
    });
    expect(await freshLoader()).toThrow(/duplicate legacy_sku "396682381010-66868"/);
  });

  it('throws on a non-USD currency', async () => {
    buildFixture({
      listing: mutate(REAL_LISTING, 'currency: "USD"', 'currency: "EUR"'),
    });
    expect(await freshLoader()).toThrow(/"currency" is "EUR"/);
  });

  it('throws on the reserved slug "sellers"', async () => {
    buildFixture({
      listingFileName: 'sellers.md',
      listing: mutate(REAL_LISTING, 'slug: "scandium-1900"', 'slug: "sellers"'),
    });
    expect(await freshLoader()).toThrow(/reserved route segment/);
  });

  it('throws when the listing count differs from settings.yml expected_listings', async () => {
    buildFixture({ expectedListings: 2 });
    expect(await freshLoader()).toThrow(/expected 2 listings .*loaded 1/);
  });
});
