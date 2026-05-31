/**
 * /dashboard — Market Dashboard (PLACEHOLDER, Prompt 14). The single-screen
 * overview of the dataset lands in a later prompt (ARCHITECTURE §2, ISR). Until
 * then this labelled placeholder keeps the "Data" IA complete and routes to the
 * live surfaces that already carry the same data. `noindex` so the thin page
 * isn't crawled.
 */
import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Market Dashboard',
  description:
    'A single-screen overview of rare-earth and strategic-metal price coverage, recent movements, and export-control concentration. Coming in this build.',
  alternates: { canonical: '/dashboard/' },
  robots: { index: false, follow: true },
};

export default function DashboardPage() {
  return (
    <ComingSoon
      crumb="Market Dashboard"
      eyebrow="Data"
      title="Market Dashboard"
      lead="A single-screen overview of the ledger — coverage, the latest movements, and where Chinese export control concentrates — built on the same data layer that already powers the element pages and Open Data."
      bullets={[
        'Summarise data coverage and the newest sourced records at a glance.',
        'Surface the most significant recent price and regulatory movements.',
        'Show export-control concentration across the four material categories.',
      ]}
      note="Nothing here will be fabricated — every panel reads the same provenanced records you can browse on the element pages and download from Open Data."
      related={[
        { label: 'Browse elements', href: '/elements/', primary: true },
        { label: 'Open data', href: '/data/' },
        { label: 'Market movements', href: '/movements/' },
      ]}
    />
  );
}
