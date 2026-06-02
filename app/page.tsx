/**
 * Home (/) — the investment-grade landing page (Prompt 13). Replaces the
 * migration placeholder with a focused above-the-fold value proposition (what
 * this is, who it's for, why it matters now), live proof stats, primary CTAs
 * into the real product surfaces, and a below-the-fold three-pillar product
 * story. Leads with the crown-jewel regulatory intelligence (AUDIT §6) and
 * drops the apologetic "sparse data" framing (AUDIT §4.5) in favour of
 * verified-first coverage presented as a strength.
 *
 * Every number comes from the live data layer — nothing is fabricated, and the
 * 238 records are labelled "sourced" (each carries provenance), not "verified"
 * (only a minority hold a verified status), per CLAUDE.md hard rule #1.
 */
import type { Metadata } from 'next';
import {
  getControlledElementCount,
  getElements,
  getPolicyEvents,
  getPriceRecords,
  getRegulatoryNotices,
  getSourceBreakdown,
  getSources,
} from '@/lib/data';
import { buildMetadata } from '@/lib/seo';
import { FaqJsonLd } from '@/components/seo';
import { Container } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import {
  MethodologyCallout,
  SourceBreakdownPanel,
  TelegramBadge,
} from '@/components/trust';
import { Hero } from '@/components/home/Hero';
import { ProofStats } from '@/components/home/ProofStats';
import { PillarCards } from '@/components/home/PillarCards';
import { HomeMovements } from '@/components/movements/HomeMovements';

const TITLE =
  'lanthanides.io — Sourced Prices & Export-Control Intelligence for Rare Earths';

const DESCRIPTION =
  'Source-transparent pricing and Chinese export-control intelligence for 31 rare-earth and strategic-metal elements — every price tied to a seller, date, and quantity; every regulatory announcement cited to its source. Open data, CC BY 4.0.';

export const metadata: Metadata = buildMetadata({
  // absoluteTitle bypasses the "%s · lanthanides.io" template so the home title
  // isn't double-branded. WebSite + Organization JSON-LD is site-wide (root
  // layout); the home page carries the FAQPage entity.
  absoluteTitle: TITLE,
  description: DESCRIPTION,
  keywords:
    'rare earth prices, rare earth export controls, MOFCOM announcements, strategic metals pricing, critical minerals data, gallium germanium controls, rare earth supply chain, open data rare earth',
  path: '/',
});

export default function HomePage() {
  const totalElements = getElements().length;
  const records = getPriceRecords().length;
  const controlled = getControlledElementCount();
  const sources = getSources().length;
  const announcements = getPolicyEvents().length;
  const notices = getRegulatoryNotices().length;
  const breakdown = getSourceBreakdown();

  const stats = [
    {
      label: 'Elements tracked',
      value: totalElements,
      hint: 'Rare earths + strategic metals',
    },
    {
      label: 'Sourced price records',
      value: records,
      hint: 'Each fully provenanced',
    },
    { label: 'Curated sources', value: sources, hint: 'Trust-tiered, reviewed' },
    {
      label: 'China-controlled',
      value: controlled,
      hint: `of ${totalElements} elements`,
    },
    {
      label: 'Regulatory announcements',
      value: announcements,
      hint: 'Tracked since 2023',
    },
  ];

  return (
    <Container as="main" className="pb-20">
      <FaqJsonLd records={records} elements={totalElements} />

      <Hero
        totalElements={totalElements}
        controlled={controlled}
        announcements={announcements}
      />

      <ProofStats stats={stats} />

      {/* ── Trust signals: provenance mix · how we verify · live alert bot ─ */}
      <section className="mt-16">
        <SectionHeading
          title="Why you can trust these numbers"
          description="Provenance on every price, a method you can read, and a live monitor watching the controls that move the market."
        />
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          <SourceBreakdownPanel breakdown={breakdown} />
          <div className="space-y-4">
            <MethodologyCallout />
            <TelegramBadge variant="panel" />
          </div>
        </div>
      </section>

      <PillarCards
        counts={{
          records,
          elements: totalElements,
          announcements,
          notices,
          controlled,
        }}
      />

      <HomeMovements />
    </Container>
  );
}
