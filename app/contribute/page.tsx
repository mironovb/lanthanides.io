/**
 * /contribute: add a price. Kept as simple as the review model allows: one
 * form, one public queue, one short standards list. No accounts, no GitHub
 * required; the "Add a price" button in the site header lands here from every
 * page.
 *
 * The form (ContributionForm) writes a pending row to the contributions inbox,
 * the single Neon table behind /api/contributions, and the queue renders
 * beside it so the loop is visible end to end. Nothing publishes without a
 * maintainer check: accepted observations are merged into the versioned
 * _data/ files and then appear on the element pages (that merge is a
 * maintainer step; contributors never need to touch git).
 *
 * force-dynamic: the page reads the inbox at request time and the build never
 * touches the database (CLAUDE.md data strategy); a DB outage degrades the
 * queue panel to a note, never the page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getElements, getPriceRecords } from '@/lib/data';
import { listRecentContributions } from '@/lib/contributions';
import { Container, PageHeader } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { ContributionForm } from '@/components/contribute/ContributionForm';
import { RecentContributions } from '@/components/contribute/RecentContributions';

export const dynamic = 'force-dynamic';

const TITLE = 'Add a Price';
const DESCRIPTION =
  'Seen a current price for a rare-earth or strategic metal? Add it here in under a minute: no account, no GitHub. A maintainer checks every submission before it enters the open dataset.';

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'contribute rare earth prices, submit metal price, add price observation, open data contribution, rare earth price submission, lanthanides.io contribute',
  path: '/contribute/',
});

const CONTACT_EMAIL = 'hello@lanthanides.io';

export default async function ContributePage() {
  const elementOptions = getElements().map((e) => ({
    symbol: e.symbol,
    name: e.name,
  }));
  const knownForms = [
    ...new Set(getPriceRecords().map((r) => r.form.toLowerCase())),
  ].sort();
  // Resilient read: null renders the queue's calm "unavailable" note.
  const queue = await listRecentContributions();

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Add a Price', path: '/contribute/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Add a Price' }]}
        eyebrow="Contribute"
        title="Add a price"
        lead="Seen a current price for one of these materials? Add it below; it takes under a minute and needs no account. Every reference price on this site is assembled from observations like yours: a maintainer checks each submission, and accepted ones enter the open dataset and appear on the element pages."
      />

      {/* ── Form + the live review queue ─────────────────────────────────── */}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <ContributionForm elements={elementOptions} knownForms={knownForms} />
        <div>
          <SectionHeading
            as="h3"
            title="Review queue"
            description="Newest submissions, awaiting a maintainer's check. Queued is not yet published."
          />
          <RecentContributions queue={queue} />
        </div>
      </div>

      {/* ── What makes a submission usable ───────────────────────────────── */}
      <section className="mt-12 max-w-prose">
        <SectionHeading
          title="What makes a submission usable"
          description="Four things a reviewer needs. Everything else is optional."
        />
        <ul className="space-y-2 text-sm leading-relaxed text-fg-muted">
          <li className="border-l-2 border-border-strong pl-3">
            <span className="font-medium text-fg">A real source.</span> A seller
            or publisher name and, where possible, a URL: something a reviewer
            can open and check. Anonymous listings are excluded.
          </li>
          <li className="border-l-2 border-border-strong pl-3">
            <span className="font-medium text-fg">Form, purity, quantity.</span>{' '}
            A price is only comparable with its form (metal/oxide/...), purity,
            and the quantity it applies to.
          </li>
          <li className="border-l-2 border-border-strong pl-3">
            <span className="font-medium text-fg">An observation date.</span>{' '}
            The date you saw the price.
          </li>
          <li className="border-l-2 border-l-accent pl-3">
            <span className="font-medium text-fg">No guessing.</span> A missing
            field is left blank, not filled in to complete the record.
          </li>
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-fg-muted">
          How accepted values are normalised and verified is documented in the{' '}
          <Link
            href="/methodology/"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            methodology
          </Link>
          . For corrections to existing data, or anything that does not fit the
          form, email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </Container>
  );
}
