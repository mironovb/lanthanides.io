/**
 * Import idempotency at the git level (PLAN P6): re-running the real importer
 * over the vendored periodictech catalog must be a byte-identical no-op.
 *
 * Proof shape: the marketplace output paths are git-clean BEFORE (precondition
 * — a dirty tree cannot prove anything), the script itself reports
 * "idempotency: PASS (byte-identical re-run)", and the paths are STILL clean
 * after — so not a single byte under `_marketplace/` or
 * `public/assets/marketplace/` moved.
 *
 * Requires the gitignored `periodictech/` source tree (present in this repo
 * checkout); the run compiles lib/marketplace with the repo tsc, so allow a
 * generous timeout.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_PATHS = ['_marketplace/', 'public/assets/marketplace/'];

function gitStatusOfOutputs(): string {
  return execFileSync('git', ['status', '--porcelain', '--', ...OUTPUT_PATHS], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

describe('scripts/import-periodictech.mjs', () => {
  it(
    're-runs byte-identically (git-level proof)',
    () => {
      // The importer reads the quarantined source catalog; without it the test
      // cannot run at all — fail with a plain message rather than a spawn error.
      expect(
        existsSync(join(ROOT, 'periodictech', 'src', 'lib', 'products.ts')),
        'periodictech/src/lib/products.ts missing — the vendored source catalog is required',
      ).toBe(true);

      expect(gitStatusOfOutputs(), 'marketplace output paths must be git-clean BEFORE').toBe('');

      // execFileSync throws on a non-zero exit, which fails the test — that IS
      // the exit-0 assertion.
      const stdout = execFileSync(process.execPath, ['scripts/import-periodictech.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      expect(stdout).toContain('idempotency: PASS (byte-identical re-run)');

      expect(gitStatusOfOutputs(), 'marketplace output paths must be git-clean AFTER').toBe('');
    },
    300_000,
  );
});
