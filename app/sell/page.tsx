/**
 * /sell: Sell / List Material (Prompt 20). The supply-side entry point: a seller
 * submits a structured listing and gets an INSTANT, dataset-derived gauge (their
 * asking price positioned against the sourced low/mid/high range) while the row
 * persists to the `Listing` table as `status:'pending'` (write path:
 * POST /api/listings). The page also renders the live listings table so the loop
 * is visible end-to-end (submission → pending row → maintainer review).
 *
 * Honesty (CLAUDE.md): storage only, no email/payment/notification side
 * effects; the gauge never fabricates a price (hard rule #1); a listing is NEVER
 * auto-published into the open `_data/` dataset (that stays the reviewed git-PR
 * flow). Dynamic + Node runtime: it reads the live DB (via lib/db) and `fs` (via
 * lib/data), so it is request-rendered, not statically optimised.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import { getElements, getPriceRecords } from '@/lib/data';
import { prisma } from '@/lib/db';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, SectionHeading } from '@/components/ui';
import { buildElementOptions } from '@/components/tools/gauge';
import {
  SellForm,
  ListingsTable,
  toListingDTO,
  type ListingDTO,
} from '@/components/sell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DESCRIPTION =
  "List rare-earth or strategic-metal material for sale and get an instant, sourced price check, with your asking price positioned against the dataset's fair-value range before it reaches a buyer. Submissions are reviewed before publishing.";
export const metadata: Metadata = buildMetadata({
  title: 'Sell / List Material: Instant Sourced Price Check',
  description: DESCRIPTION,
  keywords:
    'sell rare earth, list rare earth material, sell strategic metals, rare earth seller listing, oxide metal asking price, rare earth marketplace, dysprosium neodymium sell',
  path: '/sell/',
});

/** Recent submissions for the listings view (all statuses; private contact dropped). */
async function recentListings(): Promise<ListingDTO[]> {
  try {
    const rows = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return rows.map(toListingDTO);
  } catch (err) {
    // The page must still render if the dynamic store is unreachable.
    console.error('[/sell] could not load listings:', err);
    return [];
  }
}

export default async function SellPage() {
  const elements = getElements();
  const records = getPriceRecords();
  const options = buildElementOptions(elements, records);
  const knownForms = [...new Set(records.map((r) => r.form.toLowerCase()))].sort();
  const listings = await recentListings();

  return (
    <Container as="main" className="py-10">
      <WebApplicationJsonLd
        name="Sell / List Material · lanthanides.io"
        description={DESCRIPTION}
        path="/sell/"
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Sell / List Material', path: '/sell/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Sell / List' }]}
        eyebrow="Tools"
        title="Sell / List Material"
        lead="List rare-earth or strategic-metal material and get an instant price check against the sourced dataset, with your asking price placed against the fair-value range. Every submission is reviewed by a maintainer before it is published."
      >
        <StoryLink>
          The gauge here runs the same engine as the{' '}
          <Link href="/tools/price-gauge/">Price Gauge</Link>, over the records
          behind every <Link href="/elements/">element page</Link>. The demand
          side is the{' '}
          <Link href="/offers/">screened Offer Feed</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── Form + instant gauge ─────────────────────────────────────────── */}
      <section className="mt-8">
        <SellForm options={options} forms={knownForms} />
      </section>

      {/* ── Listings table (the loop, made visible) ──────────────────────── */}
      <section className="mt-16">
        <SectionHeading
          title="Submitted listings"
          description="Every submission lands here immediately, marked pending. Publishing is a maintainer step, the same review that governs the open dataset."
        />
        <div className="mt-5 space-y-4">
          <Callout tone="note" title="Review before publish">
            Listings are captured as <span className="font-mono">pending</span>{' '}
            and reviewed by a maintainer before they’re marked{' '}
            <span className="font-mono">published</span>. A listing is never
            auto-published into the open dataset, and private contact details are
            never shown here. Read how contributions are reviewed on{' '}
            <Link
              href="/contribute/"
              className="text-accent hover:text-accent-strong"
            >
              Contribute
            </Link>
            .
          </Callout>
          <ListingsTable listings={listings} />
        </div>
      </section>
    </Container>
  );
}
