/**
 * Home pillar cards — the below-the-fold product story (Prompt 13): the three
 * layers of the product, in order. "Data & Provenance" and "Regulatory
 * Intelligence" (the crown jewel) link out to live surfaces; "Tools &
 * Marketplace" is the forthcoming commercial layer, presented as direction with
 * an "In development" chip and no links, so the page previews the roadmap
 * without overpromising a stubbed feature or shipping a dead link.
 *
 * Counts are passed in from lib/data (app/page.tsx) — never hard-coded.
 *
 * Server component.
 */
import Link from 'next/link';
import { Card, Chip, SectionHeading } from '@/components/ui';

export interface PillarCounts {
  records: number;
  elements: number;
  announcements: number;
  notices: number;
  controlled: number;
}

interface PillarLink {
  label: string;
  href: string;
}

interface Pillar {
  kicker: string;
  title: string;
  body: React.ReactNode;
  links?: PillarLink[];
  /** Forthcoming layer: shows a chip + note instead of links. */
  pending?: string;
  /** Emphasize the crown jewel with a stronger edge + accent kicker. */
  feature?: boolean;
}

function buildPillars(c: PillarCounts): Pillar[] {
  return [
    {
      kicker: '01 · Data & Provenance',
      title: 'Every price, fully sourced',
      body: (
        <>
          {c.records} sourced price records across {c.elements} elements, in a
          two-reference model: a <span className="text-fg">retail reference</span>{' '}
          for small-quantity buyers and a{' '}
          <span className="text-fg">bulk benchmark</span> for commodity volumes.
          Each record carries seller, date, quantity, form, purity, and
          verification status. Nothing is interpolated or model-generated —
          coverage is verified-first and grows with every reviewed contribution.
        </>
      ),
      links: [
        { label: 'Element directory', href: '/elements/' },
        { label: 'Methodology', href: '/methodology/' },
        { label: 'Sources & trust tiers', href: '/sources/' },
      ],
    },
    {
      kicker: '02 · Regulatory Intelligence',
      title: 'Know what can cross a border',
      feature: true,
      body: (
        <>
          A primary-sourced log of the Chinese export-control announcements
          governing these materials — MOFCOM/GAC announcement numbers, the
          Chinese reference, legal basis, effective dates, affected elements and
          forms, and current suspension status. {c.announcements} announcements
          since 2023, {c.notices} detailed control regimes, {c.controlled}{' '}
          elements controlled. Almost no English-language source assembles this
          with citations.
        </>
      ),
      links: [
        { label: 'Regulatory tracker', href: '/regulatory/' },
        { label: 'Market movements', href: '/movements/' },
        { label: 'News & analysis', href: '/news/' },
      ],
    },
    {
      kicker: '03 · Tools & Marketplace',
      title: 'From reference to transaction',
      body: (
        <>
          The commercial layer, taking shape: the{' '}
          <span className="text-fg">Price Gauge</span> is live — estimate a fair
          price range for any element from the sourced records above, with a
          confidence grade and full basis. Export-control-screened seller offers,
          listings, and live announcement alerts follow. The open reference stays
          free and open regardless.
        </>
      ),
      links: [{ label: 'Try the Price Gauge', href: '/tools/price-gauge/' }],
      pending:
        'Listings, screened offers & alerts launch as the dataset deepens — no email wall, no paywall on the open data.',
    },
  ];
}

export function PillarCards({ counts }: { counts: PillarCounts }) {
  const pillars = buildPillars(counts);

  return (
    <section className="mt-16">
      <SectionHeading
        title="One ledger, three layers"
        description="An open reference at the base, the export-control intelligence that makes it decision-grade in the middle, and a thin commercial layer on top."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {pillars.map((p) => (
          <Card
            key={p.kicker}
            as="article"
            padding="lg"
            className={`flex flex-col ${
              p.feature ? 'border-l-2 border-l-accent border-border-strong' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`eyebrow ${p.feature ? 'text-accent-strong' : ''}`}>
                {p.kicker}
              </p>
              {p.pending ? <Chip>In development</Chip> : null}
            </div>

            <h3 className="mt-3 font-serif text-xl font-semibold text-fg">
              {p.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
              {p.body}
            </p>

            {p.links ? (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-sm">
                {p.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="font-medium text-accent transition-colors hover:text-accent-strong"
                  >
                    {l.label} →
                  </Link>
                ))}
              </div>
            ) : null}

            {p.pending ? (
              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-fg-dim">
                {p.pending}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
