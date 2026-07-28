/**
 * Navigation model (PLAN ruling constraint 2, as amended by the owner's
 * production-posture pass): the marketplace entry is the SECOND header item,
 * labelled exactly "Marketplace" with no badge, and second in the footer row.
 * Asserted against the single source of truth the header and footer render
 * from.
 */
import { describe, expect, it } from 'vitest';

import { FOOTER_LINKS, NAV_LINKS } from '@/components/layout/nav';

describe('components/layout/nav', () => {
  it('NAV_LINKS[1] is exactly the marketplace item, no badge', () => {
    // toStrictEqual: no extra keys (external/raw would change how SiteNav renders it).
    expect(NAV_LINKS[1]).toStrictEqual({
      href: '/marketplace/',
      label: 'Marketplace',
    });
  });

  it('FOOTER_LINKS carries /marketplace/ second', () => {
    expect(FOOTER_LINKS.findIndex((l) => l.href === '/marketplace/')).toBe(1);
  });
});
