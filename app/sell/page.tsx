/**
 * /sell — Sell / List Material (PLACEHOLDER, Prompt 14). The seller listing form
 * (writes a `Listing` row) lands with the commercial layer in a later prompt
 * (ARCHITECTURE §4.2). This labelled placeholder keeps the "Tools" IA complete.
 * `noindex` so the thin page isn't crawled.
 */
import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Sell / List Material',
  description:
    'List rare-earth or strategic-metal material for sale — form, purity, quantity, and price. Coming in this build.',
  alternates: { canonical: '/sell/' },
  robots: { index: false, follow: true },
};

export default function SellPage() {
  return (
    <ComingSoon
      crumb="Sell / List"
      eyebrow="Tools"
      title="Sell / List Material"
      lead="List rare-earth or strategic-metal material for sale — form, purity, quantity, incoterm, and price — and have it checked against current export-control status before it reaches buyers."
      bullets={[
        'Capture a structured listing: element, form, purity, quantity, and price.',
        'Flag the element’s current Chinese export-control status on submission.',
        'Stay separate from the open dataset — listings never auto-publish into it.',
      ]}
      note="The open reference data stays a reviewed, git-tracked flow; a listing is captured and stored, never silently merged into the published dataset."
      related={[
        { label: 'Browse elements', href: '/elements/', primary: true },
        { label: 'Export-control status', href: '/regulatory/' },
        { label: 'Methodology', href: '/methodology/' },
      ]}
    />
  );
}
