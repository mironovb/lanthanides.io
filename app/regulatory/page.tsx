/**
 * /regulatory: the China export-control tracker (SSG).
 *
 * Shows the element filter strip, the active control regime cards (from
 * _data/regulatory/*.yml), the announcement timeline (from
 * _data/policy_events.yml), and the key legal references aside. The page is
 * server-rendered so it reads and crawls fully without JavaScript. A small
 * client island (RegulatoryView) adds instant element filtering on top.
 */
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/seo';
import {
  getPolicyEvents,
  getRegulatedAndSuspendedElements,
  getRegulatoryNotices,
} from '@/lib/data';
import Link from 'next/link';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout } from '@/components/ui';
import { RegulatoryView } from '@/components/regulatory/RegulatoryView';

const DESCRIPTION =
  'MOFCOM rare earth and strategic metal export-control timeline from 2023 to 2026: announcement numbers, effective dates, affected elements, and current status.';

export const metadata: Metadata = buildMetadata({
  title: 'China Rare Earth Export Controls Tracker 2026',
  description: DESCRIPTION,
  keywords:
    'China rare earth export controls, MOFCOM export licence, gallium germanium ban, rare earth export ban, dual-use export control tracker, strategic metals regulation',
  path: '/regulatory/',
});

export default function RegulatoryPage() {
  // Notices newest-first by effective date; timeline newest-first by date.
  const notices = [...getRegulatoryNotices()].sort((a, b) =>
    b.date_effective.localeCompare(a.date_effective),
  );
  const events = [...getPolicyEvents()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const filterElements = getRegulatedAndSuspendedElements().map((e) => e.symbol);

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Regulatory Tracker', path: '/regulatory/' },
        ]}
      />
      <DatasetJsonLd
        name="China Rare Earth & Strategic Metal Export-Control Tracker"
        description={DESCRIPTION}
        path="/regulatory/"
        keywords={[
          'rare earth export controls',
          'MOFCOM announcements',
          'export licence',
          'strategic metals',
          'dual-use export regulation',
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Regulatory Tracker' }]}
        eyebrow="Export Controls"
        title="China Rare Earth Export Controls Tracker"
        lead="Every published Chinese export-control announcement affecting rare earths, strategic metals, and semiconductor materials since 2023. Each entry lists the announcement number, effective date, affected elements, and current status. Filter by element to narrow the page to the controls that touch it."
      >
        <StoryLink>
          See how these controls move prices in{' '}
          <Link href="/movements/">Market Movements</Link>, or jump to any
          controlled element in the{' '}
          <Link href="/elements/">directory</Link>.
        </StoryLink>
      </PageHeader>

      <RegulatoryView
        notices={notices}
        events={events}
        filterElements={filterElements}
      />

      {/* ── Key legal references ──────────────────────────────────────── */}
      <Callout
        tone="note"
        glyph={null}
        title="Key Legal References"
        className="mt-12"
      >
        <dl>
          <dt className="font-semibold text-fg">
            End-user certificate requirement
          </dt>
          <dd className="mt-1 leading-relaxed text-fg-muted">
            Article 15 of the Export Control Law of the PRC requires exporters to
            submit an end-user certificate (最终用户证明) identifying the
            consignee, end user, and end use for all controlled items.
          </dd>

          <dt className="mt-3 font-semibold text-fg">Review period</dt>
          <dd className="mt-1 leading-relaxed text-fg-muted">
            MOFCOM has up to 45 working days from acceptance of a complete
            application to issue or deny an export licence, per the 2024 Dual-Use
            Items Export Control Regulations.
          </dd>

          <dt className="mt-3 font-semibold text-fg">Presumptive denial</dt>
          <dd className="mt-1 leading-relaxed text-fg-muted">
            Licence applications subject to presumptive denial are refused absent
            extraordinary circumstances. This standard currently applies to
            Ga/Ge/Sb exports to US military end-users under Article 1 of MOFCOM
            No. 46/2024.
          </dd>
        </dl>
      </Callout>
    </Container>
  );
}
