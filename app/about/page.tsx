/**
 * /about: a plain description of what lanthanides.io is (SSG).
 *
 * What the site is, why it exists, the principles
 * from the data layer, how to contribute, and a real contact address.
 *
 * `/vision` still resolves here via the 301 in next.config.mjs.
 *
 * Every number is read live from the data layer; nothing is hard-coded.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getElements } from '@/lib/data';
import { Container, PageHeader } from '@/components/layout';
import { SectionHeading } from '@/components/ui';

const GITHUB = 'https://github.com/mironovb/lanthanides.io';

// hello@lanthanides.io is the project contact used site-wide (footer,
// CONTRIBUTING). TODO(owner): confirm the alias is live before launch.
const CONTACT_EMAIL = 'hello@lanthanides.io';

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description:
    'Independent, open-access pricing and intelligence for rare earth and strategic metals. No subscriptions, no paywalls. Real prices with source provenance.',
  keywords:
    'rare earth intelligence, strategic materials pricing, independent rare earth data, open-access critical minerals, rare earth market analysis, China rare earth export controls',
  path: '/about/',
});

const INLINE_LINK =
  'text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong';

export default function AboutPage() {
  const elementCount = getElements().length;

  const principles: Array<[string, React.ReactNode]> = [
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
    [
      'Open access',
      <>
        No subscriptions, no paywalls. Content is licensed under{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="license noopener"
          className={INLINE_LINK}
        >
          CC BY 4.0
        </a>
        . Code is{' '}
        <a
          href="https://opensource.org/licenses/MIT"
          target="_blank"
          rel="noopener"
          className={INLINE_LINK}
        >
          MIT
        </a>
        .
      </>,
    ],
  ];

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        eyebrow="The project"
        title="About"
        lead="Independent, open-access pricing and intelligence for rare earth and strategic metals. Real prices with source provenance, no subscriptions, no paywalls."
      />

      {/* ── What this is ─────────────────────────────────────────────────── */}
      <section className="mt-12 max-w-prose">
        <SectionHeading title="What this is" />
        <div className="space-y-3 text-base leading-relaxed text-fg-muted">
          <p>
            <strong className="font-semibold text-fg">lanthanides.io</strong>{' '}
            is an open price reference for rare earth elements and strategic
            metals, built and maintained by an independent researcher. Every
            price is tied to a specific seller, date, quantity, and
            verification status.
          </p>
          <p>
            The site covers{' '}
            <span className="font-mono tabular-nums text-fg">{elementCount}</span>{' '}
            elements across four categories: light rare earths, heavy rare
            earths, strategic metals, and semiconductor metals. Prices come
            from retail distributors, industrial wholesalers, and commodity
            benchmarks, normalised to USD per kilogram. Tools such as the{' '}
            <Link href="/tools/price-gauge/" className={INLINE_LINK}>
              price gauge
            </Link>{' '}
            are computed directly from those records.
          </p>
        </div>
      </section>

      {/* ── Why it exists ────────────────────────────────────────────────── */}
      <section className="mt-10 max-w-prose">
        <SectionHeading title="Why it exists" />
        <div className="space-y-3 text-base leading-relaxed text-fg-muted">
          <p>
            Rare earth pricing is fragmented and paywalled. Commodity
            benchmarks sit behind expensive subscriptions, retail prices vary
            by orders of magnitude with form, purity, and quantity, and
            Chinese regulatory developments are poorly tracked in
            English-language sources.
          </p>
          <p>
            Procurement analysts, researchers, and supply chain professionals
            need a single reference point that is open about where its numbers
            come from and what it does not know.
          </p>
        </div>
      </section>

      {/* ── Principles ───────────────────────────────────────────────────── */}
      <section className="mt-10 max-w-prose">
        <SectionHeading title="Principles" />
        <dl className="space-y-3">
          {principles.map(([term, def]) => (
            <div key={term} className="border-l-2 border-accent pl-4">
              <dt className="font-semibold text-fg">{term}</dt>
              <dd className="mt-0.5 text-base leading-relaxed text-fg-muted">
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Community contributions ──────────────────────────────────────── */}
      <section className="mt-10 max-w-prose">
        <SectionHeading title="Community contributions" />
        <div className="space-y-3 text-base leading-relaxed text-fg-muted">
          <p>
            Reference prices are assembled from source-cited observations, and
            anyone who has seen a current price can add one. The quickest way
            is the{' '}
            <Link href="/contribute/" className={INLINE_LINK}>
              Add a price
            </Link>{' '}
            form in the header: under a minute, no account. A maintainer
            checks every submission before it enters the open dataset.
          </p>
          <p>
            For a data error, use the{' '}
            <a
              href={`${GITHUB}/issues/new?template=data-correction.yml`}
              target="_blank"
              rel="noopener"
              className={INLINE_LINK}
            >
              correction template
            </a>{' '}
            or email the address below. All contributions must be factual,
            sourced, and verifiable; the details live in the{' '}
            <a
              href={`${GITHUB}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener"
              className={INLINE_LINK}
            >
              contribution guide
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section className="mt-10 max-w-prose">
        <SectionHeading title="Contact" />
        <p className="text-base leading-relaxed text-fg-muted">
          For data corrections, source submissions, or questions:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-3 text-base leading-relaxed text-fg-muted">
          How prices are collected and verified, and the current source
          registry, are documented in{' '}
          <Link href="/methodology/" className={INLINE_LINK}>
            Methodology
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
