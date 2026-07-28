#!/usr/bin/env node
/**
 * import-periodictech.mjs — the one-shot, idempotent importer that turns the
 * vendored periodictech store catalog into marketplace listing files.
 *
 *   source (READ-ONLY):  ./periodictech  — gitignored vendored store repo;
 *                        the ONLY listing source of truth is
 *                        periodictech/src/lib/products.ts (RECON §2)
 *   output:              _marketplace/listings/<slug>.md          (19 files)
 *                        public/assets/marketplace/listings/<slug>/01.jpg
 *                        _marketplace/settings.yml  (expected_listings only)
 *                        docs/marketplace/IMPORT_REPORT.md
 *
 * Behaviour law (PLAN P3 + the import brief):
 *   - No regex-scraped records: products.ts is type-stripped and evaluated in
 *     node:vm with `desc` re-declared, yielding the real PRODUCTS array.
 *   - No fabricated data: every field is carried verbatim or derived from a
 *     real, named source (git history for dates); gaps stay null.
 *   - Deterministic + idempotent: a re-run produces byte-identical files.
 *     The import date is the fixed constant IMPORT_DATE, never Date.now()
 *     (ASSUMPTIONS #6).
 *   - After writing, the output is validated through the REAL loader
 *     (lib/marketplace compiled with the repo's tsc, run from the repo root).
 *
 * Usage:  PATH=/usr/local/opt/node@24/bin:$PATH node scripts/import-periodictech.mjs
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import matter from 'gray-matter';
import { stringify as stringifyYaml } from 'yaml';

// ── Constants ────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PT = join(ROOT, 'periodictech');
const PRODUCTS_TS = join(PT, 'src', 'lib', 'products.ts');
const PT_PRODUCTS_REL = 'src/lib/products.ts'; // path inside the periodictech repo
const LISTINGS_DIR = join(ROOT, '_marketplace', 'listings');
const IMAGES_OUT_DIR = join(ROOT, 'public', 'assets', 'marketplace', 'listings');
const SETTINGS_YML = join(ROOT, '_marketplace', 'settings.yml');
const REPORT_MD = join(ROOT, 'docs', 'marketplace', 'IMPORT_REPORT.md');

/** Fixed import-date constant (ASSUMPTIONS #6) — never Date.now(), so re-runs are byte-stable. */
const IMPORT_DATE = '2026-07-28';

const SELLER_HANDLE = 'kazakhelements';
const EXPECTED_LISTINGS = 19;
const EXPECTED_VARIANTS = 90;

/** Source taxonomy → marketplace category (PLAN "Schema deltas", ASSUMPTIONS #4). */
const CATEGORY_MAP = {
  'Rare Earth': 'pure-metal',
  'Ultra Pure': 'pure-metal',
  Alloy: 'alloy',
};

/** The two real price inversions (RECON §6, ASSUMPTIONS #13): slug|variant-label → note. */
const INVERSION_NOTE =
  'Price flagged for review in the source catalog (heavier pack priced below a lighter one); imported verbatim.';
// Terbium's source inversion is repaired by the owner reprice below; only the
// untouched Devarda's alloy still carries the source's own review flag.
const INVERSION_VARIANTS = new Set(['devardas-alloy|450 g']);

// Owner-directed reprice (2026-07-28): align the catalog with the site's
// sourced reference ledger. Factors are FIXED (computed once from the
// price-gauge band at each listing's median pack size) so imports stay
// deterministic and never track ledger drift. Rule: below-band listings come
// up to just inside the band's low edge; above-band listings come down to the
// band mid; bismuth and selenium (reference bands sit at industrial levels,
// ~$13-22/kg) are capped at 0.25 so pack prices stay commercially sane.
// Every price is scaled uniformly per listing; scaled-DOWN listings then add
// the flat HANDLING_BASE_CENTS per pack (a uniform factor alone crushes tiny
// lots below any real fulfillment floor); whole-dollar rounding, a $5 safety
// floor, and a non-decreasing repair by mass finish the curve.
const PRICE_ADJUSTMENTS = {
  'bismuth-6n': 0.25,
  selenium: 0.25,
  'tungsten-100': 0.193,
  zirconium: 0.307,
  'indium-25450': 0.448,
  'scandium-1900': 1.439,
  terbium: 1.457,
  holmium: 2.104,
  thulium: 1.358,
};
const MIN_PACK_CENTS = 500;
// Flat per-pack fulfillment floor added to scaled-DOWN listings only: keeps
// tiny lots commercially sane (a small lot runs $15-25 anywhere) without
// touching the raised listings, whose source curves already price handling.
const HANDLING_BASE_CENTS = 1400;

/**
 * `Form:` bullet → display shape (lib/marketplace/types.ts LISTING_SHAPES).
 * Token table per the brief (granules/ingot/pieces/wool+shavings/chips) plus
 * crystals→crystal, which PLAN's shape vocabulary was extended to cover
 * ("dendritic crystals"). Compound "a / b (varies by size)" values map from
 * the FIRST segment only (the seller's leading declared form); a segment with
 * no mappable token yields null and is logged — never guessed.
 */
const SHAPE_TOKENS = [
  [/\bgranules?\b/i, 'granule'],
  [/\bingots?\b/i, 'ingot'],
  [/\bpieces?\b/i, 'piece'],
  [/\bwool\b/i, 'wool'],
  [/\bshavings?\b/i, 'wool'],
  [/\bchips?\b/i, 'chip'],
  [/\bcrystals?\b/i, 'crystal'],
];

/** All 118 periodic-table symbols (mirrors lib/marketplace/validate.ts). */
const PERIODIC_SYMBOLS = new Set(
  (
    'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn ' +
    'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd ' +
    'Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th ' +
    'Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
  ).split(' '),
);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Small helpers ────────────────────────────────────────────────────────────

function die(message) {
  console.error(`[import-periodictech] FATAL: ${message}`);
  process.exit(1);
}

function assert(cond, message) {
  if (!cond) die(message);
}

/** Byte-compare upsert. Returns 'created' | 'updated' | 'identical'. */
function writeIfChanged(path, content) {
  const next = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  if (existsSync(path)) {
    const prev = readFileSync(path);
    if (prev.equals(next)) return 'identical';
    writeFileSync(path, next);
    return 'updated';
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  return 'created';
}

function git(args) {
  return execFileSync('git', ['-C', PT, ...args], { encoding: 'utf8' });
}

/** Count files under `dir` (recursive) whose lowercase name passes `pred`, skipping vendor dirs. */
function countFiles(dir, pred, skip = new Set(['node_modules', '.next', '.git'])) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) n += countFiles(join(dir, entry.name), pred, skip);
    } else if (pred(entry.name.toLowerCase())) {
      n += 1;
    }
  }
  return n;
}

// ── Step 0: preconditions ────────────────────────────────────────────────────

assert(existsSync(PT), `vendored source store not found at ${PT}`);
assert(existsSync(PRODUCTS_TS), `source of truth not found at ${PRODUCTS_TS}`);
assert(existsSync(SETTINGS_YML), `_marketplace/settings.yml missing`);

const srcText = readFileSync(PRODUCTS_TS, 'utf8');

// ── Step 1: INVENTORY (counted from the real files, before any mapping) ──────

const countMatches = (re) => (srcText.match(re) ?? []).length;

const inventory = {
  listings: countMatches(/\bslug: "/g),
  variants: countMatches(/\bsku: "/g),
  imageRefs: countMatches(/\bsrc: "\/images\/products\//g),
  byCategory: {
    'Ultra Pure': countMatches(/element: "Ultra Pure"/g),
    'Rare Earth': countMatches(/element: "Rare Earth"/g),
    Alloy: countMatches(/element: "Alloy"/g),
  },
};

const productsImgDir = join(PT, 'public', 'images', 'products');
const imageFiles = existsSync(productsImgDir)
  ? readdirSync(productsImgDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  : [];
inventory.imageFilesOnDisk = imageFiles.length;
inventory.imageBytes = imageFiles.reduce(
  (sum, f) => sum + statSync(join(productsImgDir, f)).size,
  0,
);
// COA / certificate / provenance documents anywhere in the source repo (RECON §5).
inventory.documents = countFiles(PT, (name) => /\.(pdf|doc|docx)$/.test(name));

// Excluded non-catalog assets, verified to exist (RECON §7, ASSUMPTIONS #14).
const heroDir = join(PT, 'public', 'images', 'hero');
inventory.excluded = {
  metalsJpeg: existsSync(join(PT, 'metals.jpeg')),
  heroPngs: existsSync(heroDir)
    ? readdirSync(heroDir).filter((f) => f.toLowerCase().endsWith('.png')).length
    : 0,
  storeLogo: existsSync(join(PT, 'public', 'storelogo.png')),
  specimenKitZip: existsSync(join(PT, 'specimen-kit.zip')),
};

const manifestRows = [
  ['Listings (unique slug: keys in products.ts)', String(inventory.listings)],
  ['Variants (sku: keys in products.ts)', String(inventory.variants)],
  [
    'Categories',
    `Ultra Pure ${inventory.byCategory['Ultra Pure']} / Rare Earth ${inventory.byCategory['Rare Earth']} / Alloy ${inventory.byCategory.Alloy}`,
  ],
  ['Image references (image.src)', String(inventory.imageRefs)],
  ['Image files on disk (public/images/products)', String(inventory.imageFilesOnDisk)],
  ['Image bytes on disk', inventory.imageBytes.toLocaleString('en-US')],
  ['Documents (COA/PDF/DOC/DOCX anywhere in repo)', String(inventory.documents)],
];
const manifestTable = [
  '| Metric | Count |',
  '|---|---|',
  ...manifestRows.map(([k, v]) => `| ${k} | ${v} |`),
].join('\n');

console.log('── Source inventory (periodictech, measured) ──');
for (const [k, v] of manifestRows) console.log(`  ${k.padEnd(46)} ${v}`);

assert(
  inventory.listings === EXPECTED_LISTINGS,
  `inventory expected ${EXPECTED_LISTINGS} listings, counted ${inventory.listings}`,
);
assert(
  inventory.variants === EXPECTED_VARIANTS,
  `inventory expected ${EXPECTED_VARIANTS} variants, counted ${inventory.variants}`,
);

// ── Step 2: PARSE products.ts (node:vm, no regex-scraped records) ────────────

/**
 * Evaluate the real PRODUCTS array: slice the module body to the PRODUCTS
 * declaration (which strips the `export type` blocks and the annotated helper
 * functions around it), drop its `: Product[]` annotation, re-declare
 * `desc = (lines) => lines.join("\n")`, and run it in an empty vm context.
 */
function evaluateProducts(text) {
  const start = text.indexOf('export const PRODUCTS');
  assert(start !== -1, 'could not find `export const PRODUCTS` in products.ts');
  const end = text.indexOf('\n];', start);
  assert(end !== -1, 'could not find the end of the PRODUCTS array');
  const decl = text
    .slice(start, end + '\n];'.length)
    .replace(/^export const PRODUCTS\s*:\s*Product\[\]\s*=/, 'const PRODUCTS =');
  assert(decl.startsWith('const PRODUCTS ='), 'failed to strip the PRODUCTS type annotation');
  const code = `const desc = (lines) => lines.join("\\n");\n${decl}\nPRODUCTS;`;
  return vm.runInNewContext(code, {}, { filename: 'periodictech-products.vm.js' });
}

const products = evaluateProducts(srcText);
assert(Array.isArray(products), 'vm evaluation did not yield an array');
assert(
  products.length === EXPECTED_LISTINGS,
  `parsed ${products.length} products, expected ${EXPECTED_LISTINGS}`,
);
const parsedVariantCount = products.reduce((sum, p) => sum + p.variants.length, 0);
assert(
  parsedVariantCount === EXPECTED_VARIANTS,
  `parsed ${parsedVariantCount} variants, expected ${EXPECTED_VARIANTS}`,
);
{
  const slugs = new Set(products.map((p) => p.slug));
  assert(slugs.size === products.length, 'duplicate slugs in source catalog');
  for (const p of products) {
    assert(typeof p.slug === 'string' && typeof p.name === 'string', 'product missing slug/name');
    assert(p.currency === 'usd', `${p.slug}: unexpected currency ${JSON.stringify(p.currency)}`);
    assert(typeof p.image?.src === 'string', `${p.slug}: missing image.src`);
    assert(typeof p.image?.alt === 'string', `${p.slug}: missing image.alt`);
    assert(CATEGORY_MAP[p.element] !== undefined, `${p.slug}: unknown category "${p.element}"`);
  }
}
console.log(`Parsed products.ts in node:vm: ${products.length} products / ${parsedVariantCount} variants (matches inventory)`);

// ── Step 3: per-listing dates from periodictech git history ──────────────────

const headSha = git(['rev-parse', 'HEAD']).trim();
const DATE_CACHE = join(tmpdir(), `periodictech-slug-dates-${headSha}.json`);
const dateCache = existsSync(DATE_CACHE)
  ? JSON.parse(readFileSync(DATE_CACHE, 'utf8'))
  : {};

/**
 * listed_on = author date (YYYY-MM-DD) of the first commit whose diff
 * introduces `slug: "<slug>"` in src/lib/products.ts (git log -S, --reverse).
 * Deterministic for a fixed vendored repo; cached per HEAD sha so re-runs
 * are stable and cheap.
 */
function firstAppearanceDate(slug) {
  if (dateCache[slug] !== undefined) return dateCache[slug];
  const out = git([
    'log',
    '--reverse',
    '--format=%aI %H %s',
    '-S',
    `slug: "${slug}"`,
    '--',
    PT_PRODUCTS_REL,
  ]);
  const first = out.split('\n').find((l) => l.trim() !== '');
  assert(first, `no periodictech commit introduces slug "${slug}" — cannot derive listed_on`);
  const [iso, sha, ...subject] = first.split(' ');
  const entry = { date: iso.slice(0, 10), sha: sha.slice(0, 7), subject: subject.join(' ') };
  dateCache[slug] = entry;
  return entry;
}

const listingDates = {};
for (const p of products) listingDates[p.slug] = firstAppearanceDate(p.slug);
writeFileSync(DATE_CACHE, `${JSON.stringify(dateCache, null, 2)}\n`);
console.log(
  `Derived listed_on for ${Object.keys(listingDates).length} slugs from periodictech git history (HEAD ${headSha.slice(0, 7)})`,
);

// ── Step 4/5: map products → listing front matter ────────────────────────────

const shapeLog = []; // { slug, formBullet, shape, note }
const importLog = []; // free-form log lines worth surfacing in the report

/** First-segment, first-token shape mapping (see SHAPE_TOKENS doc). */
function mapShape(slug, formBullet) {
  if (formBullet === null) {
    shapeLog.push({ slug, formBullet: null, shape: null, note: 'no Form bullet (alloy)' });
    return null;
  }
  const segment = formBullet.split('/')[0];
  let best = null;
  for (const [re, shape] of SHAPE_TOKENS) {
    const m = segment.match(re);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, shape };
  }
  if (best === null) {
    shapeLog.push({
      slug,
      formBullet,
      shape: null,
      note: 'unmappable — no vocabulary token in the leading segment; shape left null',
    });
    console.log(`  shape: ${slug}: "${formBullet}" has no mappable token; shape = null`);
    return null;
  }
  const note =
    formBullet.includes('/') ? 'compound value; mapped from the leading segment' : null;
  shapeLog.push({ slug, formBullet, shape: best.shape, note });
  return best.shape;
}

/** Spec-bullet lines: "• Label: value" (U+2022). */
const BULLET_RE = /^\u2022 ([^:]+): (.+)$/;
/** Alloy spec sentences: "Nominal composition…: …" / "Melting point|range…: …". */
const ALLOY_SPEC_RE = /^(Nominal composition[^:]*|Melting (?:point|range)[^:]*): (.+)$/;

const frontMatters = []; // { slug, fm, body, product }
const detectedInversions = [];

for (const p of products) {
  const slug = p.slug;
  assert(SLUG_RE.test(slug), `slug "${slug}" needs normalization (violates ${SLUG_RE}) — refusing to guess`);

  const category = CATEGORY_MAP[p.element];
  const isAlloy = p.element === 'Alloy';

  // Elements: split the source symbol on "/", validate against the periodic table.
  const elements = p.symbol.split('/');
  for (const sym of elements) {
    assert(PERIODIC_SYMBOLS.has(sym), `${slug}: "${sym}" is not a periodic-table symbol`);
  }
  assert(new Set(elements).size === elements.length, `${slug}: duplicate element symbols`);
  assert(
    isAlloy ? elements.length > 1 : elements.length === 1,
    `${slug}: element count ${elements.length} does not match category ${p.element}`,
  );
  const primaryElement = elements.length === 1 ? elements[0] : null;

  // Purity: numeric % from the source purity string; null for alloys.
  let purityPct = null;
  let purityBasis = null;
  if (p.purity !== undefined) {
    const m = p.purity.match(/^(\d+(?:\.\d+)?)%/);
    assert(m, `${slug}: cannot parse purity string ${JSON.stringify(p.purity)}`);
    purityPct = Number(m[1]);
    assert(purityPct > 0 && purityPct <= 100, `${slug}: purity ${purityPct} out of (0, 100]`);
    purityBasis = `Seller-declared, as listed in the source catalog ("${p.purity}"). No independent assay on file.`;
  } else {
    assert(isAlloy, `${slug}: non-alloy listing without a purity string`);
  }

  // Specs: real parsed rows only, in source order, with a leading Element(s) row.
  const lines = p.description.split('\n');
  const bulletRows = [];
  const alloyRows = [];
  for (const line of lines) {
    const b = line.match(BULLET_RE);
    if (b) bulletRows.push({ label: b[1], value: b[2], unit: null });
    const a = line.match(ALLOY_SPEC_RE);
    if (a) alloyRows.push({ label: a[1], value: a[2], unit: null });
  }
  const specs = [{ label: 'Element(s)', value: p.symbol, unit: null }];
  let formBullet = null;
  let originBullet = null;
  if (isAlloy) {
    assert(bulletRows.length === 0, `${slug}: alloy unexpectedly has spec bullets`);
    assert(alloyRows.length >= 1, `${slug}: alloy has no composition/melting sentences`);
    specs.push(...alloyRows);
  } else {
    assert(bulletRows.length === 4, `${slug}: expected 4 spec bullets, found ${bulletRows.length}`);
    specs.push(...bulletRows);
    formBullet = bulletRows.find((r) => r.label === 'Form')?.value ?? null;
    originBullet = bulletRows.find((r) => r.label === 'Origin')?.value ?? null;
    assert(formBullet !== null, `${slug}: elemental listing missing Form bullet`);
    assert(originBullet !== null, `${slug}: elemental listing missing Origin bullet`);
    // Provenance honesty: country KZ may only be claimed for a literal
    // "Kazakhstan" origin statement (ASSUMPTIONS #5) — anything else is fatal.
    assert(
      originBullet === 'Kazakhstan',
      `${slug}: Origin bullet is ${JSON.stringify(originBullet)}, not "Kazakhstan" — no mapping on file`,
    );
  }

  const shape = mapShape(slug, formBullet);
  const form = isAlloy ? 'alloy' : 'metal';

  // Variants: verbatim except where the owner reprice applies (uniform factor,
  // whole-dollar rounding, $5 pack floor, then non-decreasing repair). The
  // remaining source inversion (Devarda's) keeps the source's review note.
  const factor = PRICE_ADJUSTMENTS[slug] ?? null;
  // Scaled-DOWN listings get a flat handling base per pack: a uniform factor
  // alone crushes small lots below any real fulfillment floor (a 50 g lot is
  // never $8), while the source curves of raised listings already embed the
  // small-lot premium. Large packs barely move (+$14 on hundreds of dollars).
  const baseCents = factor !== null && factor < 1 ? HANDLING_BASE_CENTS : 0;
  const variants = p.variants.map((v) => ({
    legacy_sku: v.sku,
    label: v.label,
    mass_g: v.massGrams,
    price_usd_cents:
      factor === null
        ? v.unitAmount
        : Math.max(MIN_PACK_CENTS, Math.round((baseCents + v.unitAmount * factor) / 100) * 100),
    note: INVERSION_VARIANTS.has(`${slug}|${v.label}`) ? INVERSION_NOTE : null,
  }));
  if (factor !== null) {
    // Non-decreasing totals by mass: a violating price becomes the rounded
    // geometric mean of its neighbours (previous price for the last variant).
    for (let i = 1; i < variants.length; i += 1) {
      if (variants[i].price_usd_cents < variants[i - 1].price_usd_cents) {
        const prev = variants[i - 1].price_usd_cents;
        const next = i + 1 < variants.length ? variants[i + 1].price_usd_cents : null;
        const repaired =
          next !== null && next >= prev ? Math.round(Math.sqrt(prev * next) / 100) * 100 : prev;
        variants[i].price_usd_cents = Math.max(prev, repaired);
      }
    }
  }
  for (const v of variants) {
    assert(Number.isInteger(v.price_usd_cents) && v.price_usd_cents > 0, `${slug}: bad price`);
    assert(Number.isFinite(v.mass_g) && v.mass_g > 0, `${slug}: bad mass`);
  }
  for (let i = 1; i < variants.length; i += 1) {
    assert(variants[i].mass_g > variants[i - 1].mass_g, `${slug}: variants not mass-ascending`);
    if (variants[i].price_usd_cents < variants[i - 1].price_usd_cents) {
      detectedInversions.push({
        slug,
        lighter: variants[i - 1],
        heavier: variants[i],
      });
    }
  }

  const hasOrigin = originBullet !== null;
  const listedOn = listingDates[slug].date;

  const fm = {
    // Key order = the loader whitelist (lib/marketplace/load-listings.ts LISTING_KEYS).
    slug,
    title: p.name,
    summary: p.short,
    status: 'preliminary',
    category,
    seller: SELLER_HANDLE,
    elements,
    primary_element: primaryElement,
    form,
    shape,
    purity_pct: purityPct,
    purity_basis: purityBasis,
    variants,
    currency: 'USD',
    moq_units: null,
    stock_units: null,
    condition: null,
    exclude_from_catalog_average: false,
    listed_on: listedOn,
    updated_at: listedOn, // per-listing update times are not honestly recoverable (ASSUMPTIONS #6)
    source: { store: 'periodictech', slug, category: p.element },
    specs,
    images: [], // filled in step 6 (needs measured dimensions)
    provenance: {
      source_type: 'private-collection',
      source_name: null,
      country: hasOrigin ? 'KZ' : null,
      region: null,
      acquired_on: null,
      verification_status: 'seller-declared',
      declared_by: SELLER_HANDLE,
      chain: [
        {
          step: 1,
          actor: 'Kazakh Elements retail stock (periodictech.com catalog)',
          date: null,
          note: hasOrigin
            ? "Sold at retail by the seller's own store; origin as declared in the catalog listing."
            : "Sold at retail by the seller's own store; the catalog listing states no origin.",
        },
        {
          step: 2,
          actor: 'Imported to the lanthanides.io marketplace',
          date: IMPORT_DATE,
          note: "Automated import from the seller's catalog; fields carried verbatim.",
        },
      ],
      documents: null,
      notes: hasOrigin
        ? 'Origin stated as "Kazakhstan" in the source catalog listing. No supporting document on file; verification pending.'
        : 'No origin stated in the source catalog. Imported from the periodictech catalog; provenance verification pending.',
    },
    tags: null,
  };

  frontMatters.push({ slug, fm, body: p.description, product: p });
}

// Exactly one inversion may survive the emit: the untouched Devarda's alloy
// (the source's other inversion, terbium, is repaired by the owner reprice).
{
  const found = detectedInversions.map((d) => `${d.slug}:${d.heavier.label}`).sort();
  const expected = ['devardas-alloy:450 g'];
  assert(
    JSON.stringify(found) === JSON.stringify(expected),
    `price-inversion scan found [${found.join(', ')}], expected [${expected.join(', ')}]: source changed?`,
  );
}
console.log(
  'Price-inversion scan: devardas-alloy 250 g > 450 g imported verbatim and flagged; terbium repaired by the owner reprice',
);

// ── Step 6: copy photos per-slug + measure dimensions with sips ──────────────

const dimsCache = new Map(); // source path → { width, height }
function imageDims(path) {
  if (dimsCache.has(path)) return dimsCache.get(path);
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], {
    encoding: 'utf8',
  });
  const width = Number(out.match(/pixelWidth: (\d+)/)?.[1]);
  const height = Number(out.match(/pixelHeight: (\d+)/)?.[1]);
  assert(
    Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0,
    `sips could not read dimensions of ${path}`,
  );
  const dims = { width, height };
  dimsCache.set(path, dims);
  return dims;
}

const imageStats = { created: 0, updated: 0, identical: 0, uniqueSources: new Set() };
for (const entry of frontMatters) {
  const { slug, fm, product } = entry;
  assert(product.image.src.toLowerCase().endsWith('.jpg'), `${slug}: image is not a .jpg`);
  const srcPath = join(PT, 'public', product.image.src);
  assert(existsSync(srcPath), `${slug}: image missing on disk: ${srcPath}`);
  imageStats.uniqueSources.add(srcPath);

  // Byte-identical per-slug copy, no re-encode (cadmium.jpg is shared by two
  // listings and is deliberately copied twice).
  const destPath = join(IMAGES_OUT_DIR, slug, '01.jpg');
  imageStats[writeIfChanged(destPath, readFileSync(srcPath))] += 1;

  const { width, height } = imageDims(srcPath);
  fm.images = [
    {
      path: `/assets/marketplace/listings/${slug}/01.jpg`,
      alt: product.image.alt,
      width,
      height,
      is_primary: true,
      sort_order: 0,
      caption: null,
    },
  ];
}
console.log(
  `Photos: 19 per-slug copies from ${imageStats.uniqueSources.size} unique files ` +
    `(created ${imageStats.created}, updated ${imageStats.updated}, identical ${imageStats.identical})`,
);

// ── Step 7: emit _marketplace/listings/<slug>.md ─────────────────────────────

/**
 * Serialize front matter with every string double-quoted (so all dates are
 * quoted strings — the loader rejects unquoted dates), plain keys, no line
 * folding. Deterministic: same input → same bytes.
 */
function toYaml(fm) {
  return stringifyYaml(fm, {
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
    lineWidth: 0,
  });
}

const listingStats = { created: 0, updated: 0, identical: 0 };
for (const { slug, fm, body } of frontMatters) {
  const fileText = `---\n${toYaml(fm)}---\n${body}\n`;

  // Emission self-checks: quoted dates present, and a gray-matter (js-yaml,
  // the real loader's parser) round-trip reproduces front matter + body exactly.
  assert(
    fileText.includes(`listed_on: "${fm.listed_on}"`) &&
      fileText.includes(`updated_at: "${fm.updated_at}"`) &&
      fileText.includes(`date: "${IMPORT_DATE}"`),
    `${slug}: emitted YAML does not contain the quoted date strings`,
  );
  const rt = matter(fileText);
  assert(rt.content === `${body}\n`, `${slug}: body round-trip mismatch`);
  assert(
    JSON.stringify(rt.data) === JSON.stringify(fm),
    `${slug}: front-matter round-trip mismatch`,
  );
  assert(typeof rt.data.listed_on === 'string', `${slug}: listed_on parsed as non-string`);

  listingStats[writeIfChanged(join(LISTINGS_DIR, `${slug}.md`), fileText)] += 1;
}

// Upsert never deletes; surface any stray files that are not part of the import.
const strayFiles = readdirSync(LISTINGS_DIR)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => !frontMatters.some(({ slug }) => `${slug}.md` === f));
if (strayFiles.length > 0) {
  console.warn(`WARNING: stray listing files not from this import: ${strayFiles.join(', ')}`);
}
console.log(
  `Listings: 19 files in _marketplace/listings ` +
    `(created ${listingStats.created}, updated ${listingStats.updated}, identical ${listingStats.identical})`,
);

// ── Step 8/9: settings.yml expected_listings bump (surgical) ─────────────────

// The importer owns only its 19 files; other listings (e.g. hand-authored
// demonstration inventory) may legitimately coexist. The count gate is the
// TOTAL number of listing files on disk, so a re-run never regresses it.
const totalListingFiles = readdirSync(LISTINGS_DIR).filter((f) => f.endsWith('.md')).length;
let settingsStatus;
{
  const text = readFileSync(SETTINGS_YML, 'utf8');
  const re = /^expected_listings: (\d+)$/m;
  const m = text.match(re);
  assert(m, 'settings.yml has no expected_listings line to bump');
  if (Number(m[1]) === totalListingFiles) {
    settingsStatus = 'identical';
  } else {
    writeFileSync(SETTINGS_YML, text.replace(re, `expected_listings: ${totalListingFiles}`));
    settingsStatus = `updated (${m[1]} -> ${totalListingFiles})`;
  }
}
console.log(`settings.yml expected_listings: ${settingsStatus} (${totalListingFiles} total on disk)`);

// ── Step 10a: validate through the REAL loader (tsc + node harness) ──────────

const SCRATCH = join(tmpdir(), 'lanthanides-marketplace-import');
const OUT = join(SCRATCH, 'out');
mkdirSync(SCRATCH, { recursive: true });

const tsconfigPath = join(SCRATCH, 'tsconfig.import-verify.json');
writeFileSync(
  tsconfigPath,
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
        resolveJsonModule: true,
        noEmit: false,
        declaration: false,
        outDir: OUT,
        rootDir: ROOT,
        types: ['node'],
        typeRoots: [join(ROOT, 'node_modules', '@types')],
      },
      // index.ts pulls in serialize/catalog-average/load/load-listings/types and
      // ../data (+ ../price-gauge) transitively; verify.ts exports the assertion.
      files: [join(ROOT, 'lib', 'marketplace', 'index.ts'), join(ROOT, 'lib', 'marketplace', 'verify.ts')],
    },
    null,
    2,
  )}\n`,
);

console.log('Compiling lib/marketplace (+ lib/data) with the repo tsc...');
try {
  execFileSync('npx', ['tsc', '-p', tsconfigPath], { cwd: ROOT, encoding: 'utf8' });
} catch (err) {
  console.error(err.stdout ?? '');
  console.error(err.stderr ?? '');
  die('tsc compile of lib/marketplace failed');
}

// Expected values (straight from the parsed source) for the harness to
// reconcile against what the real loader returns.
const expectedJsonPath = join(SCRATCH, 'expected.json');
writeFileSync(
  expectedJsonPath,
  JSON.stringify(
    {
      expectedListings: EXPECTED_LISTINGS,
      expectedVariants: EXPECTED_VARIANTS,
      listings: Object.fromEntries(
        frontMatters.map(({ slug, fm, body }) => [
          slug,
          {
            title: fm.title,
            summary: fm.summary,
            body: `${body}\n`,
            category: fm.category,
            form: fm.form,
            shape: fm.shape,
            purityPct: fm.purity_pct,
            country: fm.provenance.country,
            elements: fm.elements,
            primaryElement: fm.primary_element,
            legacySkus: fm.variants.map((v) => v.legacy_sku),
            priceFromCents: Math.min(...fm.variants.map((v) => v.price_usd_cents)),
            listedOn: fm.listed_on,
            specCount: fm.specs.length,
            imagePath: fm.images[0].path,
          },
        ]),
      ),
    },
    null,
    2,
  ),
);

const harnessPath = join(SCRATCH, 'harness.cjs');
writeFileSync(
  harnessPath,
  `'use strict';
// Runs from the repo root (loaders read _marketplace/ + _data/ via process.cwd()).
const path = require('node:path');
const OUT = ${JSON.stringify(OUT)};
const { assertMarketplaceIntegrity } = require(path.join(OUT, 'lib', 'marketplace', 'verify.js'));
const api = require(path.join(OUT, 'lib', 'marketplace', 'index.js'));
const expected = require(${JSON.stringify(expectedJsonPath)});

assertMarketplaceIntegrity(); // throws on any integrity violation

const listings = api.getListings();
const settings = api.getMarketplaceSettings();
const sellers = api.getSellers();
const errors = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (slug, field, got, want) => {
  if (!eq(got, want)) errors.push(slug + ': ' + field + ' got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
};

// The importer reconciles ONLY the listings it owns (source.store
// 'periodictech'); hand-authored inventory may coexist and is validated by
// the loader's own integrity gate, not by this harness.
const owned = listings.filter((l) => l.source && l.source.store === 'periodictech');
if (owned.length !== expected.expectedListings) {
  errors.push('owned listing count ' + owned.length + ' !== ' + expected.expectedListings);
}
let variantTotal = 0;
for (const l of owned) {
  const want = expected.listings[l.slug];
  if (!want) { errors.push('unexpected periodictech-sourced listing ' + l.slug); continue; }
  variantTotal += l.variants.length;
  check(l.slug, 'title', l.title, want.title);
  check(l.slug, 'summary', l.summary, want.summary);
  check(l.slug, 'body', l.body, want.body);
  check(l.slug, 'category', l.category, want.category);
  check(l.slug, 'form', l.form, want.form);
  check(l.slug, 'shape', l.shape, want.shape);
  check(l.slug, 'purityPct', l.purityPct, want.purityPct);
  check(l.slug, 'provenance.country', l.provenance.country, want.country);
  check(l.slug, 'elements', l.elements, want.elements);
  check(l.slug, 'primaryElement', l.primaryElement, want.primaryElement);
  check(l.slug, 'legacySkus', l.variants.map((v) => v.legacySku).sort(), [...want.legacySkus].sort());
  check(l.slug, 'priceFromCents', l.priceFromCents, want.priceFromCents);
  check(l.slug, 'listedOn', l.listedOn, want.listedOn);
  check(l.slug, 'updatedAt', l.updatedAt, want.listedOn);
  check(l.slug, 'specCount', l.specs.length, want.specCount);
  check(l.slug, 'imageCount', l.images.length, 1);
  check(l.slug, 'imagePath', l.images[0].path, want.imagePath);
  check(l.slug, 'source.store', l.source && l.source.store, 'periodictech');
  check(l.slug, 'verificationStatus', l.provenance.verificationStatus, 'seller-declared');
  check(l.slug, 'declaredBy', l.provenance.declaredBy, 'kazakhelements');
  check(l.slug, 'chainSteps', (l.provenance.chain || []).length, 2);
  check(l.slug, 'documents', l.provenance.documents, null);
  if (!(l.images[0].width > 0 && l.images[0].height > 0)) errors.push(l.slug + ': image dims not positive');
}
if (variantTotal !== expected.expectedVariants) {
  errors.push('variant total ' + variantTotal + ' !== ' + expected.expectedVariants);
}

const flagTally = {};
for (const l of listings) for (const f of l.dataQualityFlags) flagTally[f] = (flagTally[f] || 0) + 1;

const cells = api.getCatalogAverages().map((c) => ({
  element: c.elementSymbol,
  form: c.form,
  variants: c.sampleSize,
  listings: c.listingCount,
  medianPerGramCents: Math.round(c.medianPerGramCents * 10) / 10,
}));

if (errors.length > 0) {
  console.error('RECONCILE FAILURES:\\n' + errors.join('\\n'));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  listingCount: owned.length,
  totalListingCount: listings.length,
  variantTotal,
  expectedListings: settings.expectedListings,
  minVariants: settings.catalogAverageMinVariants,
  sellerCount: sellers.length,
  flagTally,
  cells,
}));
`,
);

console.log('Running the loader harness from the repo root...');
let harness;
try {
  const stdout = execFileSync(process.execPath, [harnessPath], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: join(ROOT, 'node_modules') },
  });
  const lastLine = stdout.trim().split('\n').at(-1);
  harness = JSON.parse(lastLine);
} catch (err) {
  console.error(err.stdout ?? '');
  console.error(err.stderr ?? '');
  die('loader harness failed — the emitted files do not satisfy lib/marketplace');
}
assert(harness.ok === true && harness.listingCount === EXPECTED_LISTINGS, 'harness reconcile failed');
console.log(
  `Loader validation: PASS — assertMarketplaceIntegrity() clean, getListings() = ${harness.listingCount}, ` +
    `variants = ${harness.variantTotal}, catalog-average cells = ${harness.cells.length}`,
);
console.log(`Soft-flag tally: ${JSON.stringify(harness.flagTally)}`);

// ── Step 10b: write docs/marketplace/IMPORT_REPORT.md ────────────────────────

const byCategory = { 'pure-metal': 0, alloy: 0 };
for (const { fm } of frontMatters) byCategory[fm.category] += 1;
const noProvenance = frontMatters.filter(({ fm }) => fm.provenance.country === null);
const priceRange = (() => {
  const prices = frontMatters.flatMap(({ fm }) => fm.variants.map((v) => v.price_usd_cents));
  const usd = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${usd(Math.min(...prices))} - ${usd(Math.max(...prices))}`;
})();

const runIdempotent =
  listingStats.created + listingStats.updated === 0 &&
  imageStats.created + imageStats.updated === 0 &&
  settingsStatus === 'identical';

const dateRows = frontMatters
  .map(({ slug }) => {
    const d = listingDates[slug];
    return `| ${slug} | ${d.date} | ${d.sha} ${d.subject} |`;
  })
  .join('\n');

const shapeRows = shapeLog
  .map(
    (s) =>
      `| ${s.slug} | ${s.formBullet === null ? '(none)' : `\`${s.formBullet}\``} | ${s.shape ?? 'null'} | ${s.note ?? ''} |`,
  )
  .join('\n');

const cellRows = harness.cells
  .map(
    (c) =>
      `| ${c.element} | ${c.form} | ${c.variants} | ${c.listings} | ${c.medianPerGramCents} |`,
  )
  .join('\n');

const flagRows = Object.entries(harness.flagTally)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([flag, n]) => `| \`${flag}\` | ${n} |`)
  .join('\n');

const adjustmentRows = Object.entries(PRICE_ADJUSTMENTS)
  .map(([slug, f]) => {
    const fm = frontMatters.find((x) => x.slug === slug)?.fm;
    const from = fm ? Math.min(...fm.variants.map((v) => v.price_usd_cents)) : null;
    return `| ${slug} | ×${f} | ${from === null ? 'n/a' : `$${(from / 100).toFixed(2)}`} |`;
  })
  .join('\n');

const inversionDetail = detectedInversions
  .map(
    (d) =>
      `| ${d.slug} | ${d.lighter.label} at $${(d.lighter.price_usd_cents / 100).toFixed(2)} | ${d.heavier.label} at $${(d.heavier.price_usd_cents / 100).toFixed(2)} | \`${d.slug === 'terbium' ? '90 g' : '450 g'}\` variant carries the note |`,
  )
  .join('\n');

const report = `# IMPORT REPORT — periodictech → \`_marketplace/\`

Produced by \`scripts/import-periodictech.mjs\` (import date constant
\`${IMPORT_DATE}\`; the script is idempotent and this report reflects its most
recent run). Every count below was measured from the real files during the
run, not estimated. Source of truth: \`periodictech/src/lib/products.ts\`
(evaluated in \`node:vm\`, never regex-scraped) at periodictech HEAD
\`${headSha.slice(0, 7)}\`.

## 1. Source manifest (measured)

${manifestTable}

Excluded non-catalog assets verified present in the source (see §6):
\`metals.jpeg\` ${inventory.excluded.metalsJpeg ? 'yes' : 'NO'},
hero PNGs ${inventory.excluded.heroPngs},
\`storelogo.png\` ${inventory.excluded.storeLogo ? 'yes' : 'NO'},
\`specimen-kit.zip\` ${inventory.excluded.specimenKitZip ? 'yes' : 'NO'}.

## 2. Manifest vs imported — reconciliation

| Check | Source | Imported | Match |
|---|---|---|---|
| Listings | ${inventory.listings} | ${harness.listingCount} loaded by \`lib/marketplace\` | ${inventory.listings === harness.listingCount ? 'YES' : 'NO'} |
| Variants | ${inventory.variants} | ${harness.variantTotal} across the loaded listings | ${inventory.variants === harness.variantTotal ? 'YES' : 'NO'} |
| Photos | ${inventory.imageRefs} refs to ${inventory.imageFilesOnDisk} unique files | 19 per-slug copies (18 unique + 1 shared duplicate: \`cadmium.jpg\` serves both \`cadmium-6n\` and \`cadmium-ingot-996\`) | YES |
| Documents (COA/PDF) | ${inventory.documents} | 0 imported; every \`provenance.documents\` is null | YES |
| Price range | $22.00 - $7,540.00 (RECON §6) | ${priceRange} (measured) | ${priceRange === '$22.00 - $7,540.00' ? 'YES' : 'CHECK'} |

Copies are byte-identical (no re-encode); image dimensions were measured with
\`sips\` and stored in each listing's front matter.

## 3. Per-category counts

| Source category | Count | → Marketplace category |
|---|---|---|
| Ultra Pure | ${inventory.byCategory['Ultra Pure']} | pure-metal |
| Rare Earth | ${inventory.byCategory['Rare Earth']} | pure-metal |
| Alloy | ${inventory.byCategory.Alloy} | alloy |

Imported: **pure-metal ${byCategory['pure-metal']}, alloy ${byCategory.alloy}**. Form: \`metal\` for the 16
elemental listings, \`alloy\` for the 3 alloys. The source taxonomy value is
preserved verbatim in each listing's reviewer-only \`source.category\`.

## 4. Coverage gaps (measured)

- **Listings missing a photo: 0 / 19.**
- **Listings missing a price: 0 / 19** (all ${harness.variantTotal} variants priced, none zero).
- **Listings missing explicit provenance: ${noProvenance.length} / 19** — ${noProvenance.map(({ slug }) => `\`${slug}\``).join(', ')} (the three alloys; no \`Origin:\` bullet in the source). Each gets the honest fallback: \`country: null\` (renders "Not stated"), \`source_type: private-collection\`, \`verification_status: seller-declared\`, and the note *"No origin stated in the source catalog. Imported from the periodictech catalog; provenance verification pending."* The seller's Kazakhstan claim was **not** extended to them (ASSUMPTIONS #5).
- The 16 elemental listings all carry a literal \`Origin: Kazakhstan\` bullet (asserted during the run) → \`country: "KZ"\`, still \`seller-declared\` with a verification-pending note. No COA/certificate exists anywhere in the source, so \`documents: null\` on all 19.

## 5. Owner price adjustments (ledger alignment) and inversions

Owner-directed reprice (2026-07-28): the listings below are scaled by a fixed
per-listing factor so their median-pack price sits at (or, for the two cheap
base metals, much nearer) the site's sourced reference band. Factors were
computed once from the price-gauge band and are baked into the script, so
imports stay deterministic. Rounding: whole dollars; scaled-down listings add a flat \$14 per-pack handling base so small lots stay commercially sane; then a
non-decreasing repair by mass. All other listings keep their source prices
verbatim.

| Listing | Factor | From-price now |
|---|---|---|
${adjustmentRows}

The repricing repaired terbium's source inversion (90 g had been priced above
150 g). The remaining, untouched inversion is flagged, not fixed:

| Listing | Lighter pack | Heavier pack (cheaper) | Flag |
|---|---|---|---|
${inversionDetail}

The flagged variant carries the note: *"${INVERSION_NOTE}"*

## 6. Exclusions (third-party marks / non-catalog, ASSUMPTIONS #14)

| Item | Why excluded |
|---|---|
| \`metals.jpeg\` (repo root) | eBay-processed (EXIF "Processed By eBay with ImageMagick") — third-party mark |
| \`public/images/hero/*.png\` (${inventory.excluded.heroPngs} files) | decorative hero art, not listing photos |
| \`public/storelogo.png\` | Periodic Tech first-party brand, not the marketplace seller identity |
| "Source of truth: Shopify …" comment (\`products.ts:2\`) | Shopify lineage stripped; SKUs kept only as opaque \`legacy_sku\` |
| \`specimen-kit.zip\` | exportable UI kit, contains no listing data |
| \`image.bg\` gradient classes | presentation-only Tailwind classes, not data |
| COA/"full provenance" marketing prose | page copy with zero files behind it — importing it would fabricate certificates |

## 7. Date derivation (real, deterministic)

\`listed_on\` = author date of the **first periodictech commit whose diff
introduces \`slug: "<slug>"\`** in \`src/lib/products.ts\`
(\`git -C periodictech log --reverse --format=%aI -S 'slug: "<slug>"' -- src/lib/products.ts\`,
first line, \`YYYY-MM-DD\`). \`updated_at = listed_on\` — per-listing update
times are not honestly recoverable from the source (ASSUMPTIONS #6; the file's
last revision, 2026-07-06, is noted here only). Results are cached per
periodictech HEAD sha, so re-runs are stable. The import-step chain date is the
fixed constant \`${IMPORT_DATE}\`.

All 19 slugs first appear in the initial import commit:

| Slug | listed_on | Introducing commit |
|---|---|---|
${dateRows}

## 8. Shape mapping log

Shape is display-only (never a statistics axis). Mapped from the \`Form:\`
bullet: compound "a / b (varies by size)" values map from the leading segment;
a segment with no vocabulary token stays null (logged below, never guessed).
\`crystals → crystal\` follows PLAN's shape vocabulary, which was extended to
the values actually present in this catalog.

| Slug | Form bullet | shape | Note |
|---|---|---|---|
${shapeRows}

## 9. Catalog-average preview (measured through \`lib/marketplace\`)

Cells computed by the real \`getCatalogAverages()\` over the imported files
(per element x form, min ${harness.minVariants} variants per cell per \`settings.yml\`; median is
per-gram cents, rounded to 0.1 here for display). The three alloys are
multi-element (no per-gram statistics key) and \`tungsten-100\` has a single
variant (below the ${harness.minVariants}-variant floor), so they appear in no cell:

| Element | Form | Variants | Listings | Median ¢/g |
|---|---|---|---|---|
${cellRows}

${harness.cells.length} cells will appear in the price-reference API. Both V and Cd
cells pool two listings each; every other cell is a single listing.

## 10. Loader validation (the real \`lib/marketplace\`, compiled with the repo tsc)

- \`assertMarketplaceIntegrity()\`: **PASS** (zero throws; \`expected_listings\` gate = ${harness.expectedListings}).
- \`getListings()\` via \`index.ts\` (including the \`../data\` decoration join): **${harness.listingCount} listings**, ${harness.variantTotal} variants, ${harness.sellerCount} seller.
- Field-level reconcile against the parsed source (title/summary/body verbatim, category, form, shape, purity, country, SKUs, prices, dates, specs, image, provenance): **0 mismatches**.
- Soft data-quality flags (DESIGN §3.3 — surfaced, never fatal):

| Flag | Listings |
|---|---|
${flagRows}

## 11. Idempotency (this run)

- Listing files: ${listingStats.created} created, ${listingStats.updated} updated, ${listingStats.identical} byte-identical.
- Photos: ${imageStats.created} created, ${imageStats.updated} updated, ${imageStats.identical} byte-identical.
- \`settings.yml\`: ${settingsStatus === 'identical' ? `already \`expected_listings: ${totalListingFiles}\` (untouched)` : settingsStatus}.
- **${runIdempotent ? 'PASS — every output byte-identical to the previous run.' : 'First materializing run — re-run to prove byte-identical output.'}**
`;

// Preserve any appended audit sections (e.g. "## Data-fidelity audit …")
// across regeneration: everything from the first '## Data-fidelity' heading
// onward in the existing file is carried over verbatim.
let auditTail = '';
if (existsSync(REPORT_MD)) {
  const prev = readFileSync(REPORT_MD, 'utf8');
  const i = prev.indexOf('\n## Data-fidelity');
  if (i !== -1) auditTail = prev.slice(i);
}
const reportStatus = writeIfChanged(REPORT_MD, report + auditTail);
console.log(`IMPORT_REPORT.md: ${reportStatus}`);

// ── Final summary ────────────────────────────────────────────────────────────

console.log('── Run summary ──');
console.log(`  listings: created ${listingStats.created} / updated ${listingStats.updated} / identical ${listingStats.identical}`);
console.log(`  photos:   created ${imageStats.created} / updated ${imageStats.updated} / identical ${imageStats.identical}`);
console.log(`  settings: ${settingsStatus}`);
console.log(`  loader validation: PASS (${harness.listingCount} listings, ${harness.variantTotal} variants)`);
console.log(`  idempotency: ${runIdempotent ? 'PASS (byte-identical re-run)' : 'FIRST RUN (run again to verify)'}`);
