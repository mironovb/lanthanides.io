/**
 * Data-layer invariants over the REAL `_marketplace/` files, through the real
 * accessors in `@/lib/marketplace` (PLAN P6). Nothing is mocked: if a listing
 * file, an image, or a statistic drifts, these fail.
 *
 * Runs from the repo root (lib/marketplace resolves `_marketplace/` via
 * `process.cwd()`); the fs checks below use an explicit root derived from this
 * file's location so an accidental cwd change fails loudly instead of
 * silently checking the wrong tree.
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  getCatalogAverageForListing,
  getCatalogAverages,
  getListings,
  getMarketplaceSettings,
  isCatalogAverageEligible,
  VERIFICATION_STATUSES,
  type Listing,
} from '@/lib/marketplace';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The loaders memoise per process, so these are cheap to call repeatedly.
const listings = getListings();
const settings = getMarketplaceSettings();

describe('listing collection', () => {
  it('cwd is the repo root (precondition for the fs-based loaders)', () => {
    expect(process.cwd()).toBe(ROOT);
  });

  it('has exactly 23 listings, equal to settings.yml expected_listings', () => {
    expect(settings.expectedListings).toBe(23);
    expect(listings).toHaveLength(23);
    expect(listings).toHaveLength(settings.expectedListings);
  });

  it('every listing has at least one image whose file exists under public/', () => {
    for (const l of listings) {
      expect(l.images.length, `${l.slug} images`).toBeGreaterThanOrEqual(1);
      for (const img of l.images) {
        // fs check, not trust: the committed web path must resolve on disk.
        const onDisk = join(ROOT, 'public', img.path);
        expect(existsSync(onDisk), `${l.slug}: missing image file public${img.path}`).toBe(true);
      }
    }
  });

  it('every listing has exactly one primary image', () => {
    for (const l of listings) {
      const primaries = l.images.filter((img) => img.isPrimary);
      expect(primaries, `${l.slug} primary images`).toHaveLength(1);
      expect(l.primaryImage.path).toBe(primaries[0].path);
    }
  });

  it('every listing carries a provenance record with a known verification_status', () => {
    for (const l of listings) {
      expect(l.provenance, `${l.slug} provenance`).toBeTruthy();
      expect(
        VERIFICATION_STATUSES,
        `${l.slug} verification_status "${l.provenance.verificationStatus}"`,
      ).toContain(l.provenance.verificationStatus);
    }
  });

  it('every listing has >= 1 variant, each priced in positive integer cents', () => {
    for (const l of listings) {
      expect(l.variants.length, `${l.slug} variants`).toBeGreaterThanOrEqual(1);
      for (const v of l.variants) {
        expect(Number.isInteger(v.priceUsdCents), `${l.slug} ${v.legacySku} cents integer`).toBe(
          true,
        );
        expect(v.priceUsdCents, `${l.slug} ${v.legacySku} cents > 0`).toBeGreaterThan(0);
      }
    }
  });

  it('is ordered newest-first (updated_at desc, listed_on desc, slug asc)', () => {
    for (let i = 1; i < listings.length; i += 1) {
      const a = listings[i - 1];
      const b = listings[i];
      const order =
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.listedOn.localeCompare(a.listedOn) ||
        a.slug.localeCompare(b.slug);
      expect(order, `${a.slug} must sort before ${b.slug}`).toBeLessThanOrEqual(0);
    }
  });
});

describe('the 23 = 19 imported (16 elemental + 3 alloys) + 4 demo split', () => {
  const real = listings.filter((l) => l.source?.store === 'periodictech');
  const demo = listings.filter((l) => l.source?.store === 'demo');
  const alloys = real.filter((l) => l.category === 'alloy');
  const elemental = real.filter((l) => l.category !== 'alloy');

  it('has exactly 19 periodictech-imported and 4 demo listings, nothing else', () => {
    expect(real).toHaveLength(19);
    expect(demo).toHaveLength(4);
    expect(real.length + demo.length).toBe(listings.length);
  });

  it('has exactly 3 alloy imports, each form "alloy" with country null (origin never stated)', () => {
    expect(alloys).toHaveLength(3);
    for (const l of alloys) {
      expect(l.form, `${l.slug} form`).toBe('alloy');
      // The seller's KZ claim is never extended to listings that never made it.
      expect(l.provenance.country, `${l.slug} country`).toBeNull();
    }
  });

  it('has exactly 16 elemental imports, each form "metal" with country "KZ"', () => {
    expect(elemental).toHaveLength(16);
    for (const l of elemental) {
      expect(l.form, `${l.slug} form`).toBe('metal');
      expect(l.provenance.country, `${l.slug} country`).toBe('KZ');
    }
  });

  it('demo listings are marked internally and can never enter the statistics', () => {
    for (const l of demo) {
      expect(l.status, `${l.slug} status`).toBe('placeholder');
      expect(l.excludeFromCatalogAverage, `${l.slug} stats exclusion`).toBe(true);
      for (const v of l.variants) {
        expect(v.legacySku.startsWith('DEMO-'), `${l.slug} ${v.legacySku} DEMO- prefix`).toBe(true);
      }
    }
    // Specimen documents exist ONLY on demo listings — never on real inventory.
    for (const l of real) {
      expect(l.provenance.documents, `${l.slug} must carry no documents`).toBeNull();
    }
  });
});

describe('catalog averages (the form law)', () => {
  /** Independent recompute of the expected cell set, straight from listings. */
  function recomputeCells(): Map<string, { listings: Listing[]; values: number[] }> {
    const groups = new Map<string, { listings: Listing[]; values: number[] }>();
    for (const l of listings) {
      if (!isCatalogAverageEligible(l) || l.primaryElement === null || l.form === null) continue;
      const key = `${l.primaryElement}|${l.form}`;
      const group = groups.get(key) ?? { listings: [], values: [] };
      group.listings.push(l);
      group.values.push(...l.variants.map((v) => v.pricePerGramCents));
      groups.set(key, group);
    }
    return groups;
  }

  function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  it('never pools across (element, form): every cell matches an independent same-key recompute', () => {
    const cells = getCatalogAverages();
    const expected = recomputeCells();

    // No duplicate cell keys in the published set.
    const seen = new Set<string>();
    for (const cell of cells) {
      const key = `${cell.elementSymbol}|${cell.form}`;
      expect(seen.has(key), `duplicate cell ${key}`).toBe(false);
      seen.add(key);
    }

    // The published cells are EXACTLY the same-key groups that clear the
    // min-variants floor — nothing pooled in, nothing invented.
    const expectedPublishable = [...expected.entries()].filter(
      ([, g]) => g.values.length >= settings.catalogAverageMinVariants,
    );
    expect(seen).toStrictEqual(new Set(expectedPublishable.map(([key]) => key)));

    for (const cell of cells) {
      const key = `${cell.elementSymbol}|${cell.form}`;
      const group = expected.get(key)!;
      // Every contributing listing shares BOTH keys — recomputed, not trusted.
      for (const l of group.listings) {
        expect(l.primaryElement).toBe(cell.elementSymbol);
        expect(l.form).toBe(cell.form);
      }
      expect(cell.listingCount, `${key} listingCount`).toBe(group.listings.length);
      expect(cell.sampleSize, `${key} sampleSize`).toBe(group.values.length);
      expect(cell.medianPerGramCents, `${key} median`).toBeCloseTo(median(group.values), 9);
      expect(cell.minPerGramCents, `${key} min`).toBeCloseTo(Math.min(...group.values), 9);
      expect(cell.maxPerGramCents, `${key} max`).toBeCloseTo(Math.max(...group.values), 9);
    }
  });

  it('the leave-one-out comparison is insufficient for every listing today (the honesty gate)', () => {
    // With at most 2 listings per (element x form) cell and min_sample 5, no
    // listing may render a comparison hint. If data growth ever flips one of
    // these to true, this test SHOULD fail so the gate is re-examined.
    for (const l of listings) {
      const hint = getCatalogAverageForListing(l);
      expect(hint.sufficientForComparison, `${l.slug} sufficientForComparison`).toBe(false);
    }
  });
});
