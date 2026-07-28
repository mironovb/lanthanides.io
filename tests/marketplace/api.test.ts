/**
 * API integration tests (PLAN P4/P6): the four marketplace route handlers
 * called directly as functions over the REAL seeded `_marketplace/` data — no
 * server, no mocks, so these prove exactly what a deployed request would get.
 *
 * The handlers are plain functions returning `Response`; params-style routes
 * receive `{ params }` exactly as Next would pass them.
 */
import { describe, expect, it } from 'vitest';

import { GET as slugGET } from '@/app/api/marketplace/listings/[slug]/route';
import { GET as listingsGET } from '@/app/api/marketplace/listings/route';
import { GET as priceReferenceGET } from '@/app/api/marketplace/price-reference/route';
import { GET as sellerGET } from '@/app/api/marketplace/sellers/[handle]/route';

const BASE = 'http://localhost/api/marketplace/listings';

function listings(query = ''): Response {
  return listingsGET(new Request(query === '' ? BASE : `${BASE}?${query}`));
}

async function body(res: Response): Promise<any> {
  return res.json();
}

describe('GET /api/marketplace/listings', () => {
  it('bare request: 200, total 19, summaries carry slug/url/primary_image/provenance_summary', async () => {
    const res = listings();
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.pagination.total).toBe(19);
    const first = data.results[0];
    expect(typeof first.slug).toBe('string');
    expect(first.url).toBe(`/marketplace/${first.slug}/`);
    expect(typeof first.primary_image.path).toBe('string');
    expect(typeof first.primary_image.width).toBe('number');
    expect(typeof first.provenance_summary.verification_status).toBe('string');
  });

  it('?element=sc resolves case-insensitively to Sc and returns only Sc listings', async () => {
    const res = listings('element=sc&per_page=100');
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.query.element).toBe('Sc');
    expect(data.results.length).toBeGreaterThanOrEqual(1);
    for (const r of data.results) {
      expect(r.elements).toContain('Sc');
    }
    // Cross-check: exactly the Sc subset of the full feed, nothing dropped.
    const all = await body(listings('per_page=100'));
    const expected = all.results.filter((r: any) => r.elements.includes('Sc')).map((r: any) => r.slug);
    expect(data.results.map((r: any) => r.slug)).toStrictEqual(expected);
  });

  it('?element=Xx is a 404 (unknown element, not an empty filter)', async () => {
    const res = listings('element=Xx');
    expect(res.status).toBe(404);
    const data = await body(res);
    expect(data.error).toMatch(/Unknown element "Xx"/);
  });

  it('?category=nope is a 400 with the allowed vocabulary', async () => {
    const res = listings('category=nope');
    expect(res.status).toBe(400);
    const data = await body(res);
    expect(data.error).toMatch(/Unknown category "nope"/);
    expect(data.allowed).toStrictEqual([
      'pure-metal',
      'oxide',
      'mineral-ore',
      'alloy',
      'high-tech',
      'equipment',
    ]);
  });

  it('?min_price=100&max_price=10 is a 400 (inverted bounds)', async () => {
    const res = listings('min_price=100&max_price=10');
    expect(res.status).toBe(400);
    const data = await body(res);
    expect(data.error).toMatch(/max_price .* is below min_price/);
  });

  it('?q=scandium matches the scandium listing', async () => {
    const res = listings('q=scandium&per_page=100');
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.results.map((r: any) => r.slug)).toContain('scandium-1900');
  });

  it('?sort=price-asc returns results ascending by price_from_cents', async () => {
    const res = listings('sort=price-asc&per_page=100');
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.results).toHaveLength(19);
    const prices = data.results.map((r: any) => r.price_from_cents);
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('?per_page=5&page=2 paginates correctly against the full feed', async () => {
    const all = await body(listings('per_page=100'));
    expect(all.results).toHaveLength(19);

    const res = listings('per_page=5&page=2');
    expect(res.status).toBe(200);
    const data = await body(res);
    expect(data.pagination).toStrictEqual({
      page: 2,
      per_page: 5,
      total: 19,
      total_pages: 4, // ceil(19 / 5)
    });
    expect(data.results.map((r: any) => r.slug)).toStrictEqual(
      all.results.slice(5, 10).map((r: any) => r.slug),
    );
  });
});

describe('GET /api/marketplace/listings/[slug]', () => {
  it('scandium-1900: full detail with 10 variants, pending verification, gated catalog average', async () => {
    const res = slugGET(new Request(`${BASE}/scandium-1900`), {
      params: { slug: 'scandium-1900' },
    });
    expect(res.status).toBe(200);
    const data = await body(res);

    expect(typeof data.body_md).toBe('string');
    expect(data.body_md.length).toBeGreaterThan(0);
    expect(data.variants).toHaveLength(10);
    expect(data.provenance.verification_status).toBe('seller-declared');

    // The honesty gate: today the leave-one-out comparison must either be
    // absent entirely (cell below the variants floor) or explicitly
    // insufficient — never a renderable comparison.
    if (data.catalog_average !== null) {
      expect(data.catalog_average.sufficient).toBe(false);
    }
  });
});

describe('GET /api/marketplace/sellers/[handle]', () => {
  it('kazakhelements: derived stats count 19; declared claims stay structurally separate', async () => {
    const res = sellerGET(new Request('http://localhost/api/marketplace/sellers/kazakhelements'), {
      params: { handle: 'kazakhelements' },
    });
    expect(res.status).toBe(200);
    const data = await body(res);

    expect(data.handle).toBe('kazakhelements');
    expect(data.stats.listing_count).toBe(19);

    // Declared claims are seller-declared strings, never mixed into the
    // derived stats object (DESIGN §5.3 separation).
    expect(Array.isArray(data.declared_claims)).toBe(true);
    for (const claim of data.declared_claims) {
      expect(claim.basis).toBe('seller-declared');
    }
    expect(Object.keys(data.stats).sort()).toStrictEqual([
      'categories',
      'earliest_listed_on',
      'element_count',
      'latest_updated_at',
      'listing_count',
    ]);
  });
});

describe('GET /api/marketplace/price-reference', () => {
  it('declares its seller_catalog basis, carries the disclaimer, and gates thin/duplicate cells', async () => {
    const res = priceReferenceGET();
    expect(res.status).toBe(200);
    const data = await body(res);

    expect(data.basis).toBe('seller_catalog');
    expect(typeof data.disclaimer).toBe('string');
    expect(data.disclaimer.length).toBeGreaterThan(0);

    expect(Array.isArray(data.cells)).toBe(true);
    expect(data.cells.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const cell of data.cells) {
      expect(cell.sample_size, `${cell.element_symbol} ${cell.form}`).toBeGreaterThanOrEqual(3);
      const key = `${cell.element_symbol}|${cell.form}`;
      expect(seen.has(key), `duplicate cell ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
