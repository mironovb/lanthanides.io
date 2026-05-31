/**
 * /offers — Offer Feed (PLACEHOLDER, Prompt 14). The screened-offer feed (the
 * seeded `ScreenedOffer` table) lands with the commercial layer in a later
 * prompt (ARCHITECTURE §4.1). This labelled placeholder keeps the "Tools" IA
 * complete. `noindex` so the thin page isn't crawled.
 */
import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Offer Feed',
  description:
    'A feed of screened buy/sell offers for rare-earth and strategic metals, each annotated with element and export-control status. Coming in this build.',
  alternates: { canonical: '/offers/' },
  robots: { index: false, follow: true },
};

export default function OffersPage() {
  return (
    <ComingSoon
      crumb="Offer Feed"
      eyebrow="Tools"
      title="Offer Feed"
      lead="A feed of screened buy and sell offers for rare-earth and strategic metals — each annotated with the element, the export-control status that governs it, and how its price compares to the references."
      bullets={[
        'Show buy/sell offers annotated with element and current control status.',
        'Reuse the price and regulatory data layer to score and contextualise each.',
        'Make screening transparent — what passed, what didn’t, and why.',
      ]}
      note="The feed renders the screened result; the intake and scoring pipeline behind it arrives in a later prompt."
      related={[
        { label: 'Browse elements', href: '/elements/', primary: true },
        { label: 'Export-control status', href: '/regulatory/' },
        { label: 'Open data', href: '/data/' },
      ]}
    />
  );
}
