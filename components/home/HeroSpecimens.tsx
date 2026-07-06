'use client';

/**
 * The hero's specimen composition: three photographic metal-specimen cutouts
 * (scandium, tellurium, thulium) from the specimen kit, each linking to its
 * element page and revealing a monospace element chip on hover/focus.
 *
 * A client component so next/image and next/link can be injected into the
 * kit's framework-agnostic <SpecimenShowcase> (component functions cannot
 * cross the server-to-client prop boundary; the kit's own Next.js example is
 * a client file for the same reason). next/image serves the ~400-700KB PNG
 * sources resized as AVIF/WebP at hero sizes.
 *
 * Styling: components/home/specimen-showcase.css, imported by app/page.tsx.
 */
import Image from 'next/image';
import Link from 'next/link';
import SpecimenShowcase, {
  type SpecimenItem,
} from '@/components/home/SpecimenShowcase';

// All three are real catalog elements (case-sensitive detail URLs, trailing
// slash per the URL contract). width/height are the PNGs' intrinsic pixel
// dimensions (verified); they prevent layout shift.
const SPECIMENS: SpecimenItem[] = [
  {
    src: '/assets/images/hero/scandium.png',
    alt: 'Crystalline scandium metal specimen',
    width: 717,
    height: 549,
    symbol: 'Sc',
    name: 'Scandium',
    href: '/elements/Sc/',
  },
  {
    src: '/assets/images/hero/tellurium.png',
    alt: 'Tellurium crystal specimen',
    width: 531,
    height: 463,
    symbol: 'Te',
    name: 'Tellurium',
    href: '/elements/Te/',
  },
  {
    src: '/assets/images/hero/thulium.png',
    alt: 'Thulium metal specimen',
    width: 719,
    height: 577,
    symbol: 'Tm',
    name: 'Thulium',
    href: '/elements/Tm/',
  },
];

export function HeroSpecimens({ className = '' }: { className?: string }) {
  return (
    <SpecimenShowcase
      items={SPECIMENS}
      className={className}
      ImageComponent={Image}
      LinkComponent={Link}
      // The largest slot is 48% of its column: roughly half the viewport on
      // mobile, ~260px inside the hero's right column on desktop.
      imageProps={{ priority: true, sizes: '(max-width: 1023px) 48vw, 280px' }}
    />
  );
}
