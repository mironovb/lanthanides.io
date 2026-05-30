/**
 * /regulatory — the China export-control tracker (SSG, Prompt 7). The crown-
 * jewel surface: the most prominent, fast, and filterable view on the site.
 *
 * Ports legacy/pages/regulatory.html — the element-filter strip, the
 * active-control-regime cards (from _data/regulatory/*.yml), the announcement
 * timeline (from _data/policy_events.yml), and the key-legal-references aside.
 * Server-rendered for full crawlability; an island client component
 * (<RegulatoryView>) adds instant element filtering as progressive enhancement.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getPolicyEvents,
  getRegulatedAndSuspendedElements,
  getRegulatoryNotices,
} from '@/lib/data';
import { RegulatoryView } from '@/components/regulatory/RegulatoryView';

const SITE = 'https://www.lanthanides.io';
const DESCRIPTION =
  'MOFCOM rare earth and strategic metal export-control timeline 2023–2026: announcement numbers, effective dates, affected elements, and current status.';

export const metadata: Metadata = {
  title: 'China Rare Earth Export Controls Tracker 2026',
  description: DESCRIPTION,
  keywords:
    'China rare earth export controls, MOFCOM export licence, gallium germanium ban, rare earth export ban, dual-use export control tracker, strategic metals regulation',
  alternates: { canonical: '/regulatory/' },
  openGraph: {
    title: 'China Rare Earth Export Controls Tracker 2026',
    description: DESCRIPTION,
    url: '/regulatory/',
    type: 'website',
  },
};

export default function RegulatoryPage() {
  // Notices newest-first by effective date; timeline newest-first by date.
  const notices = [...getRegulatoryNotices()].sort((a, b) =>
    b.date_effective.localeCompare(a.date_effective),
  );
  const events = [...getPolicyEvents()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const filterElements = getRegulatedAndSuspendedElements().map((e) => e.symbol);

  // dateModified for the Dataset = the latest dated fact across both feeds.
  const lastModified = [
    ...notices.map((n) => n.date_effective),
    ...events.map((e) => e.date),
  ].sort((a, b) => b.localeCompare(a))[0];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Regulatory Tracker',
          item: `${SITE}/regulatory/`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'China Rare Earth & Strategic Metal Export-Control Tracker',
      description: DESCRIPTION,
      url: `${SITE}/regulatory/`,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'lanthanides.io' },
      ...(lastModified ? { dateModified: lastModified } : {}),
      keywords: [
        'rare earth export controls',
        'MOFCOM announcements',
        'export licence',
        'strategic metals',
        'dual-use export regulation',
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">Regulatory Tracker</span>
      </nav>

      <header className="border-b border-border-strong pb-6">
        <h1 className="font-serif text-3xl font-semibold text-fg">
          China Rare Earth Export Controls Tracker
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-fg-muted">
          Every published Chinese export-control announcement affecting rare
          earths, strategic metals, and semiconductor materials since 2023 —
          announcement numbers, effective dates, affected elements, and current
          status. Filter by element to isolate the regime and announcements that
          touch it.
        </p>
      </header>

      <RegulatoryView
        notices={notices}
        events={events}
        filterElements={filterElements}
      />

      {/* ── Key legal references ──────────────────────────────────────── */}
      <aside className="mt-10 border border-l-[3px] border-border border-l-accent bg-surface px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg">
          Key Legal References
        </h2>
        <dl className="mt-4">
          <dt className="text-sm font-semibold text-fg">
            End-user certificate requirement
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-fg-muted">
            Article 15 of the Export Control Law of the PRC requires exporters to
            submit an end-user certificate (最终用户证明) identifying the
            consignee, end user, and end use for all controlled items.
          </dd>

          <dt className="mt-3 text-sm font-semibold text-fg">Review period</dt>
          <dd className="mt-1 text-sm leading-relaxed text-fg-muted">
            MOFCOM has up to 45 working days from acceptance of a complete
            application to issue or deny an export licence, per the 2024 Dual-Use
            Items Export Control Regulations.
          </dd>

          <dt className="mt-3 text-sm font-semibold text-fg">
            Presumptive denial
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-fg-muted">
            Licence applications subject to presumptive denial are refused absent
            extraordinary circumstances. This standard currently applies to
            Ga/Ge/Sb exports to US military end-users under Article 1 of MOFCOM
            No. 46/2024.
          </dd>
        </dl>
      </aside>
    </main>
  );
}
