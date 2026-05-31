/**
 * /about — what the project is, why it exists, and its principles (SSG, Prompt 8).
 *
 * Faithful port of legacy/pages/about.html, with the four coverage stats wired to
 * the live data layer (elements, price records, sources, policy events) instead
 * of Jekyll's `site.*` counts.
 *
 * TODO(Prompt 15): this page is reframed into the investor-facing About/Vision
 * page. EXTEND this content (positioning, traction, roadmap) rather than
 * duplicating it — the principles + coverage sections below stay as the factual
 * spine of that page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getElements,
  getPolicyEvents,
  getPriceRecords,
  getSources,
} from '@/lib/data';
import { Container, PageHeader } from '@/components/layout';
import { SectionHeading, Stat, StatGrid } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About lanthanides.io',
  description:
    'Independent, open-access strategic materials intelligence. No subscriptions, no paywalls. Real prices with source provenance.',
  keywords:
    'rare earth intelligence, strategic materials pricing, independent rare earth data, open-access critical minerals, rare earth market analysis, China rare earth export controls',
  alternates: { canonical: '/about/' },
};

export default function AboutPage() {
  const stats: Array<[number, string]> = [
    [getElements().length, 'Elements tracked'],
    [getPriceRecords().length, 'Price records'],
    [getSources().length, 'Data sources'],
    [getPolicyEvents().length, 'Policy events'],
  ];
  const elementCount = stats[0][0];

  return (
    <Container as="main" className="py-10">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        eyebrow="About"
        title="About lanthanides.io"
        lead="Independent, open-access strategic materials intelligence. No subscriptions, no paywalls. Real prices with source provenance."
      />

      <div className="mt-10 max-w-prose space-y-10 text-base leading-relaxed text-fg-muted">
        <section>
          <SectionHeading title="What This Is" />
          <p>
            <strong className="font-semibold text-fg">lanthanides.io</strong> is
            an independent, open-access pricing and intelligence platform for rare
            earth elements and strategic metals, built and maintained by an
            independent researcher. It tracks real-world prices with full source
            provenance — every price is tied to a specific seller, date, quantity,
            and verification status.
          </p>
          <p className="mt-3">
            The site covers {elementCount} elements across four categories: light
            rare earths, heavy rare earths, strategic metals, and semiconductor
            metals. Price data is sourced from retail distributors, industrial
            wholesalers, and commodity benchmarks, then normalised to USD per
            kilogram.
          </p>
        </section>

        <section>
          <SectionHeading title="Motivation" />
          <p>
            Rare earth pricing is fragmented, paywalled, and disconnected across
            market tiers. Commodity benchmarks from major reporting agencies sit
            behind expensive subscriptions. Retail prices vary by orders of
            magnitude depending on form, purity, and quantity. Chinese regulatory
            developments — which fundamentally determine supply availability for
            heavy rare earths — are poorly tracked in English-language sources.
          </p>
          <p className="mt-3">
            This project exists because procurement analysts, researchers, and
            supply chain professionals need a single reference point that is
            transparent about what it shows, where it comes from, and what it
            doesn&rsquo;t know.
          </p>
        </section>

        <section>
          <SectionHeading title="Principles" />
          <dl className="space-y-3">
            {[
              [
                'No fabricated data',
                'Every price in the database has a source. Empty fields mean "not yet collected," never "estimated."',
              ],
              [
                'Two-tier pricing',
                'Retail reference prices and bulk commodity benchmarks are tracked separately. They represent structurally different markets and are never averaged together.',
              ],
              [
                'Source provenance',
                'Each price record includes the seller, country, date, form, purity, quantity, confidence score, and verification status. The full data is visible on every element page.',
              ],
            ].map(([term, def]) => (
              <div key={term} className="border-l-2 border-border-strong pl-4">
                <dt className="font-semibold text-fg">{term}</dt>
                <dd className="mt-0.5">{def}</dd>
              </div>
            ))}
            <div className="border-l-2 border-l-accent pl-4">
              <dt className="font-semibold text-fg">Open access</dt>
              <dd className="mt-0.5">
                No subscriptions, no paywalls. Content is licensed under{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="license noopener"
                  className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
                >
                  CC BY 4.0
                </a>
                . Code is{' '}
                <a
                  href="https://opensource.org/licenses/MIT"
                  target="_blank"
                  rel="noopener"
                  className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
                >
                  MIT
                </a>
                . The full dataset is downloadable from{' '}
                <Link
                  href="/data/"
                  className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
                >
                  Open Data
                </Link>
                .
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <SectionHeading title="Data Coverage" />
          <StatGrid cols={4}>
            {stats.map(([value, label]) => (
              <Stat key={label} label={label} value={value} />
            ))}
          </StatGrid>
        </section>

        <section>
          <SectionHeading title="Community Contributions" />
          <p>
            lanthanides.io is open to contributions from researchers, analysts,
            procurement professionals, and anyone with sourced pricing data or
            market intelligence for rare earths and strategic metals. You can
            contribute by:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              Submitting a price observation via{' '}
              <a
                href="https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml"
                className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
              >
                GitHub issue
              </a>
            </li>
            <li>
              Reporting a data error via{' '}
              <a
                href="https://github.com/mironovb/lanthanides.io/issues/new?template=data-correction.yml"
                className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
              >
                correction template
              </a>
            </li>
            <li>
              Sharing market intelligence via{' '}
              <a
                href="https://github.com/mironovb/lanthanides.io/issues/new?template=market-note.yml"
                className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
              >
                market note template
              </a>
            </li>
            <li>Opening a pull request with data or code improvements</li>
          </ul>
          <p className="mt-3">
            All contributions must be factual, sourced, and verifiable. See the
            full{' '}
            <a
              href="https://github.com/mironovb/lanthanides.io/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener"
              className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
            >
              contribution guide
            </a>{' '}
            for data formats, source requirements, and local setup instructions.
          </p>
        </section>

        <section>
          <SectionHeading title="Contact" />
          <p>
            For data corrections, source submissions, or questions:{' '}
            <strong className="font-semibold text-fg">mironovb@berea.edu</strong>
          </p>
          <p className="mt-3">
            To understand how data is processed, see{' '}
            <Link
              href="/methodology/"
              className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
            >
              Methodology
            </Link>
            , or browse the current registry on{' '}
            <Link
              href="/sources/"
              className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
            >
              Sources
            </Link>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
