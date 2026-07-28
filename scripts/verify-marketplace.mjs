#!/usr/bin/env node
/**
 * verify-marketplace.mjs — post-build output verifier (PLAN P6).
 *
 * Checks the BUILT artefacts (the .next/ tree from the last `npm run build`),
 * the git quarantine, and the listing-image contract — the things the vitest
 * suite cannot see because they only exist after a build:
 *
 *   A. Built HTML exists: marketplace index, every listing detail page, and
 *      every seller profile page under .next/server/app.
 *   B. In the site-wide header of a built page, the marketplace link is the
 *      SECOND item inside <nav> and carries "Lanthanides Marketplace" and its
 *      "Preliminary" badge.
 *   C. Every one of the 19 detail-page HTML files contains the provenance
 *      heading ("Provenance") and the string "Verification pending".
 *   D. Quarantine: `git ls-files` contains zero paths starting periodictech/.
 *   E. Every image path referenced in _marketplace/listings/*.md exists under
 *      public/.
 *
 * Zero dependencies (node builtins only). Not wired into package.json.
 *
 * Usage:  node scripts/verify-marketplace.mjs
 * Exits non-zero if any check fails.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_OUT = join(ROOT, '.next', 'server', 'app');
const LISTINGS_DIR = join(ROOT, '_marketplace', 'listings');

/** Listing slugs from the data files themselves — the count the build must honour. */
function listingSlugs() {
  return readdirSync(LISTINGS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

/** Seller handles from sellers.yml (zero-dep: top-level `- handle:` lines). */
function sellerHandles() {
  const yml = readFileSync(join(ROOT, '_marketplace', 'sellers.yml'), 'utf8');
  return [...yml.matchAll(/^- handle:\s*"?([a-z0-9-]+)"?\s*$/gm)].map((m) => m[1]);
}

// ── Checks ───────────────────────────────────────────────────────────────────
// Each returns { ok: boolean, detail: string }.

function checkBuiltHtmlExists() {
  if (!existsSync(APP_OUT)) {
    return { ok: false, detail: `.next/server/app missing — run \`npm run build\` first` };
  }
  const missing = [];
  const indexHtml = join(APP_OUT, 'marketplace.html');
  if (!existsSync(indexHtml)) missing.push('.next/server/app/marketplace.html');

  const slugs = listingSlugs();
  for (const slug of slugs) {
    const p = join(APP_OUT, 'marketplace', `${slug}.html`);
    if (!existsSync(p)) missing.push(`.next/server/app/marketplace/${slug}.html`);
  }
  const handles = sellerHandles();
  if (handles.length === 0) missing.push('(no seller handles parsed from _marketplace/sellers.yml)');
  for (const handle of handles) {
    const p = join(APP_OUT, 'marketplace', 'sellers', `${handle}.html`);
    if (!existsSync(p)) missing.push(`.next/server/app/marketplace/sellers/${handle}.html`);
  }
  if (missing.length > 0) {
    return { ok: false, detail: `missing built HTML: ${missing.join(', ')}` };
  }
  return {
    ok: true,
    detail: `index + ${slugs.length} detail pages + ${handles.length} seller page(s) built`,
  };
}

function checkHeaderNavOrder() {
  // Any built page carries the site-wide header; the home page is the natural pick.
  const page = join(APP_OUT, 'index.html');
  if (!existsSync(page)) {
    return { ok: false, detail: '.next/server/app/index.html missing — run `npm run build` first' };
  }
  const html = readFileSync(page, 'utf8');
  const navMatch = html.match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/);
  if (!navMatch) {
    return { ok: false, detail: 'no <nav aria-label="Main navigation"> block found in built HTML' };
  }
  const anchors = navMatch[1].match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
  if (anchors.length < 2) {
    return { ok: false, detail: `header nav has ${anchors.length} <a> item(s); expected at least 2` };
  }
  const second = anchors[1];
  const href = (second.match(/href="([^"]*)"/) ?? [])[1];
  const text = second.replace(/<[^>]+>/g, ' ');
  const problems = [];
  if (href !== '/marketplace/') problems.push(`second nav item href is "${href}", expected "/marketplace/"`);
  if (!text.includes('Lanthanides Marketplace')) problems.push('second nav item lacks "Lanthanides Marketplace"');
  if (!text.includes('Preliminary')) problems.push('second nav item lacks the "Preliminary" badge');
  if (problems.length > 0) return { ok: false, detail: problems.join('; ') };
  return { ok: true, detail: 'second <nav> item is /marketplace/ ("Lanthanides Marketplace" + "Preliminary")' };
}

function checkDetailPagesProvenance() {
  const slugs = listingSlugs();
  const bad = [];
  let checked = 0;
  for (const slug of slugs) {
    const p = join(APP_OUT, 'marketplace', `${slug}.html`);
    if (!existsSync(p)) {
      bad.push(`${slug}: built HTML missing`);
      continue;
    }
    const html = readFileSync(p, 'utf8');
    checked += 1;
    if (!html.includes('Provenance')) bad.push(`${slug}: no "Provenance" heading`);
    if (!html.includes('Verification pending')) bad.push(`${slug}: no "Verification pending"`);
  }
  if (bad.length > 0) return { ok: false, detail: bad.join('; ') };
  return { ok: true, detail: `${checked}/${slugs.length} detail pages carry "Provenance" + "Verification pending"` };
}

function checkQuarantine() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  const tracked = out.split('\n').filter((p) => p.startsWith('periodictech/'));
  if (tracked.length > 0) {
    return { ok: false, detail: `${tracked.length} tracked path(s) under periodictech/: ${tracked.slice(0, 5).join(', ')}` };
  }
  return { ok: true, detail: 'git ls-files has zero periodictech/ paths' };
}

function checkListingImagesExist() {
  const files = readdirSync(LISTINGS_DIR).filter((f) => f.endsWith('.md'));
  const missing = [];
  let checked = 0;
  for (const f of files) {
    const text = readFileSync(join(LISTINGS_DIR, f), 'utf8');
    // Every quoted /assets/marketplace/... reference in the front matter
    // (image paths today; document paths if any ever land) must resolve.
    const refs = [...text.matchAll(/"(\/assets\/marketplace\/[^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) {
      checked += 1;
      if (!existsSync(join(ROOT, 'public', ref))) missing.push(`${f}: public${ref}`);
    }
  }
  if (checked === 0) return { ok: false, detail: 'no /assets/marketplace/ references found in any listing (parser broken?)' };
  if (missing.length > 0) return { ok: false, detail: `missing under public/: ${missing.join(', ')}` };
  return { ok: true, detail: `${checked} referenced image path(s) exist under public/ (${files.length} listings)` };
}

// ── Run + report ─────────────────────────────────────────────────────────────

const CHECKS = [
  ['built HTML (index/detail/seller)', checkBuiltHtmlExists],
  ['header nav: marketplace second', checkHeaderNavOrder],
  ['detail pages: provenance strings', checkDetailPagesProvenance],
  ['quarantine: periodictech untracked', checkQuarantine],
  ['listing images exist under public/', checkListingImagesExist],
];

let failed = 0;
const rows = [];
for (const [name, run] of CHECKS) {
  let result;
  try {
    result = run();
  } catch (err) {
    result = { ok: false, detail: `check crashed: ${err.message}` };
  }
  if (!result.ok) failed += 1;
  rows.push([result.ok ? 'PASS' : 'FAIL', name, result.detail]);
}

const nameWidth = Math.max(...rows.map(([, name]) => name.length));
console.log('verify-marketplace — built-output checks');
console.log('-'.repeat(72));
for (const [status, name, detail] of rows) {
  console.log(`${status}  ${name.padEnd(nameWidth)}  ${detail}`);
}
console.log('-'.repeat(72));
console.log(failed === 0 ? `PASS (${rows.length}/${rows.length} checks)` : `FAIL (${failed} of ${rows.length} checks failed)`);
process.exit(failed === 0 ? 0 : 1);
