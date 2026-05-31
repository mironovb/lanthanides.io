/**
 * /tools/price-gauge — Price Gauge (PLACEHOLDER, Prompt 14). The interactive
 * gauge (a quote benchmarked against the sourced retail/bulk references) lands
 * with the commercial layer in a later prompt (ARCHITECTURE §4.2). This labelled
 * placeholder keeps the "Tools" IA complete and points to the live references it
 * will read. `noindex` so the thin page isn't crawled.
 */
import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Price Gauge',
  description:
    'Benchmark a rare-earth or strategic-metal quote against the sourced retail and bulk reference prices for that element. Coming in this build.',
  alternates: { canonical: '/tools/price-gauge/' },
  robots: { index: false, follow: true },
};

export default function PriceGaugePage() {
  return (
    <ComingSoon
      crumb="Price Gauge"
      eyebrow="Tools"
      title="Price Gauge"
      lead="Paste a quoted price and see where it sits against the sourced retail reference and bulk benchmark for that element — so you can tell a fair quote from an outlier."
      bullets={[
        'Compare a quote to the retail reference and bulk benchmark for the element.',
        'Show the implied premium or discount, with the underlying records cited.',
        'Read only the provenanced price records — no opaque index, no fabricated figure.',
      ]}
      note="The gauge runs over the same price records behind every element page and the Open Data exports."
      related={[
        { label: 'Browse elements', href: '/elements/', primary: true },
        { label: 'How prices are set', href: '/methodology/' },
        { label: 'Open data', href: '/data/' },
      ]}
    />
  );
}
