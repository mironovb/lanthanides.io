/**
 * Vitest configuration for the marketplace suite (PLAN P6).
 *
 * - node environment: everything under test is server-side (fs loaders, route
 *   handlers called as plain functions, nav model) — no DOM anywhere.
 * - `@` alias → repo root, mirroring tsconfig.json `paths` so the tests import
 *   the exact modules the app imports (`@/lib/marketplace`, route files).
 * - `pool: 'forks'`: the loader-validation tests build fixture `_marketplace/`
 *   trees in tmp dirs and `process.chdir()` into them; chdir is unavailable in
 *   worker threads, so each test file runs in its own child process (which
 *   also isolates the per-process module memoisation between files).
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ROOT = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': ROOT },
  },
  test: {
    environment: 'node',
    include: ['tests/marketplace/**/*.test.ts'],
    pool: 'forks',
  },
});
