'use client';

/**
 * The about page's decorative sidebar: the specimen kit's lanthanum Bohr model
 * (57 protons, 82 neutrons — La-139), the site's namesake element. It idles
 * with a slow rotation, tilts toward the pointer, and morphs its shells toward
 * an edge-on star as the page scrolls.
 *
 * The atom is three.js/WebGL, so it is imported with next/dynamic({ ssr:
 * false }) from this client file, per the kit's integration notes. Mounting is
 * additionally gated on the lg breakpoint media query: below it the sidebar is
 * not shown, and skipping the render entirely means phones never download the
 * three.js chunk or create a WebGL context for something they cannot see.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const LanthanumBohrScroll = dynamic(
  () => import('@/components/about/LanthanumBohrScroll'),
  { ssr: false, loading: () => <div style={{ width: '100%', height: 440 }} /> },
);

export function AtomAside() {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  // Same query as the lg: breakpoint the about grid switches on, so the atom
  // exists exactly when its sidebar column does.
  if (!wide) return null;

  return (
    <div className="sticky top-24">
      <LanthanumBohrScroll height={440} />
      <p className="eyebrow mt-2 text-center">
        La · lanthanum · Z 57, the ledger&apos;s namesake
      </p>
    </div>
  );
}
