/**
 * /about: the About / Vision page (SSG), in two clearly separated parts:
 *   Part 01 "What this is today": the true description, the principles, and the
 *     live coverage stats, kept as the factual spine.
 *   Part 02 "Where it's going": the two-sided marketplace and alerts vision,
 *     with a candid Now/In progress/Planned roadmap that labels every stub and
 *     links each pillar to its live entry point.
 *
 * `/vision` resolves here via a 301 in next.config.mjs.
 *
 * HONESTY (CLAUDE.md hard rule #1): the sourced price records are labelled
 * "sourced", NOT "verified". Only those that carry a `verified` status are
 * called verified (counts computed live below, never hard-coded). The roadmap
 * states, stub by stub, what is running today versus what is not; no traction,
 * revenue, or partnership is implied anywhere on the page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';
import {
  getControlledElementCount,
  getElements,
  getPolicyEvents,
  getPriceRecords,
  getRegulatoryNotices,
  getSources,
} from '@/lib/data';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import {
  Callout,
  Card,
  Chip,
  LinkButton,
  SectionHeading,
  Stat,
  StatGrid,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const GITHUB = 'https://github.com/mironovb/lanthanides.io';

const TITLE = 'About & Vision';
const DESCRIPTION =
  'What lanthanides.io is today, an open and source-transparent reference for rare-earth and strategic-metal pricing and Chinese export-control intelligence, and where it is going next: a two-sided marketplace and alerts layer built on that dataset. Open data, CC BY 4.0.';

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'rare earth intelligence, strategic materials pricing, rare earth marketplace, rare earth price gauge, MOFCOM export-control alerts, rare earth vision, critical minerals platform, independent rare earth data, open-access critical minerals, China rare earth export controls',
  path: '/about/',
});

const INLINE_LINK =
  'text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong';

/** The three Now/In-progress/Planned stages, rendered as a dotted Chip. */
type Stage = 'now' | 'progress' | 'planned';
const STAGE: Record<Stage, { label: string; dot: string }> = {
  now: { label: 'Now', dot: 'bg-up' },
  progress: { label: 'In progress', dot: 'bg-accent' },
  planned: { label: 'Planned', dot: 'bg-neutral' },
};

/** A big two-part divider above the "today" and "vision" halves of the page. */
function PartHeader({
  part,
  chip,
  title,
  lead,
}: {
  part: string;
  chip: React.ReactNode;
  title: string;
  lead: React.ReactNode;
}) {
  return (
    <header className="mt-16 border-t border-border-strong pt-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="eyebrow">Part {part}</p>
        {chip}
      </div>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-fg">{title}</h2>
      <p className="mt-2 max-w-prose text-md leading-relaxed text-fg-muted">
        {lead}
      </p>
    </header>
  );
}

export default function AboutPage() {
  const elements = getElements();
  const elementCount = elements.length;
  const records = getPriceRecords();
  const recordCount = records.length;
  // Truthful split: of the sourced records, only these carry `verified`.
  const verifiedCount = records.filter(
    (r) => r.verification_status === 'verified',
  ).length;
  const sourceCount = getSources().length;
  const announcementCount = getPolicyEvents().length;
  const noticeCount = getRegulatoryNotices().length;
  const controlled = getControlledElementCount();

  const coverage: Array<{ value: number; label: string; hint: string }> = [
    { value: elementCount, label: 'Elements tracked', hint: 'Four categories' },
    {
      value: recordCount,
      label: 'Sourced price records',
      hint: `${verifiedCount} independently verified`,
    },
    { value: sourceCount, label: 'Curated sources', hint: 'Trust-tiered, reviewed' },
    {
      value: announcementCount,
      label: 'Regulatory announcements',
      hint: 'Cited to primary source',
    },
  ];

  // Stage reflects what runs TODAY, not a delivery date. The two stubs the
  // page must own up to, the offer-screening backend and email alerts, are
  // spelled out in the `status` column below.
  const roadmap: Array<{
    capability: string;
    stage: Stage;
    status: string;
    href: string;
    cta: string;
  }> = [
    {
      capability: 'MOFCOM regulatory tracker',
      stage: 'now',
      status: 'Live. Every announcement cited to its primary source.',
      href: '/regulatory/',
      cta: 'Open tracker',
    },
    {
      capability: 'Provenance-first price dataset',
      stage: 'now',
      status: `Live. ${recordCount} sourced records, downloadable under CC BY 4.0.`,
      href: '/elements/',
      cta: 'Browse elements',
    },
    {
      capability: 'Telegram regulatory alerts',
      stage: 'now',
      status: 'Firing on critical announcements via the six-hourly monitor.',
      href: '/alerts/',
      cta: 'Alerts',
    },
    {
      capability: 'Price gauge (supply side)',
      stage: 'progress',
      status:
        'Selection logic built over the live records; the interactive tool is in development.',
      href: '/tools/price-gauge/',
      cta: 'Price gauge',
    },
    {
      capability: 'Seller listings (supply side)',
      stage: 'planned',
      status: 'Data model defined; the listing capture flow is not built yet.',
      href: '/sell/',
      cta: 'Sell / list',
    },
    {
      capability: 'Offer-screening feed (demand side)',
      stage: 'progress',
      status:
        'Live, seeded from the dataset and ranked by value; the live screening backend (ingest, score, dedup) is a stub.',
      href: '/offers/',
      cta: 'Offer feed',
    },
    {
      capability: 'Email & per-element alerts',
      stage: 'planned',
      status:
        'Not built. Telegram is the live channel; email, double opt-in, and routing are next.',
      href: '/alerts/',
      cta: 'Alerts',
    },
  ];

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'About & Vision', path: '/about/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About & Vision' }]}
        eyebrow="About / Vision"
        title="About & Vision"
        lead="What lanthanides.io is today, an open and source-transparent reference for rare-earth pricing and Chinese export controls, and where it is going: a two-sided marketplace and an alerts layer built on top of that dataset."
      >
        <StoryLink>
          See the work itself: the{' '}
          <Link href="/regulatory/">Regulatory Tracker</Link> and the{' '}
          <Link href="/elements/">element directory</Link>.
        </StoryLink>
      </PageHeader>

      {/* PART 01: WHAT THIS IS TODAY */}
      <PartHeader
        part="01"
        chip={<Chip dot="bg-up">Live today</Chip>}
        title="What this is today"
        lead="Everything in this section is built, running, and free to use right now."
      />

      <section className="mt-8 max-w-prose space-y-3 text-base leading-relaxed text-fg-muted">
        <p>
          <strong className="font-semibold text-fg">lanthanides.io</strong> is an
          independent, open-access pricing and intelligence platform for rare
          earth elements and strategic metals, built and maintained by an
          independent researcher. Two things share one surface: an open-data
          reference, and the export-control intelligence that makes it
          decision-grade.
        </p>
        <p>
          It covers{' '}
          <span className="font-mono tabular-nums text-fg">{elementCount}</span>{' '}
          elements across four categories: light and heavy rare earths,
          strategic metals, and semiconductor metals. The{' '}
          <span className="font-mono tabular-nums text-fg">{recordCount}</span>{' '}
          price records are <span className="text-fg">sourced</span>, not
          asserted: each names a seller, date, quantity, form, purity, and
          verification status (
          <span className="font-mono tabular-nums text-fg">{verifiedCount}</span>{' '}
          are independently verified; the rest are single-source offers and
          benchmarks, every one carrying its provenance).
        </p>
        <p>
          Alongside the prices sits the{' '}
          <Link href="/regulatory/" className={INLINE_LINK}>
            export-control tracker
          </Link>, a continuously maintained, English-language record of the
          Chinese MOFCOM/GAC announcements that govern these materials:{' '}
          <span className="font-mono tabular-nums text-fg">
            {announcementCount}
          </span>{' '}
          announcements and{' '}
          <span className="font-mono tabular-nums text-fg">{noticeCount}</span>{' '}
          detailed control regimes, each cited to the original notice, now
          reaching{' '}
          <span className="font-mono tabular-nums text-fg">{controlled}</span> of
          the {elementCount} elements tracked here. A Telegram bot fires on
          critical announcements, driven by an automated monitor that polls
          Chinese-government sources every six hours. All of it is open under{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="license noopener"
            className={INLINE_LINK}
          >
            CC BY 4.0
          </a>, versioned in git, forkable, and auditable.
        </p>
      </section>

      <section className="mt-10 max-w-prose">
        <SectionHeading as="h3" title="Why it exists" />
        <div className="space-y-3 text-base leading-relaxed text-fg-muted">
          <p>
            Rare earth pricing is fragmented, paywalled, and disconnected across
            market tiers. Commodity benchmarks from major reporting agencies sit
            behind expensive subscriptions. Retail prices vary by orders of
            magnitude depending on form, purity, and quantity. Chinese regulatory
            developments, which fundamentally determine supply availability for
            heavy rare earths, are poorly tracked in English-language sources.
          </p>
          <p>
            This project exists because procurement analysts, researchers, and
            supply chain professionals need a single reference point that is
            transparent about what it shows, where it comes from, and what it
            doesn&rsquo;t know.
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-prose">
        <SectionHeading as="h3" title="Principles" />
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
              <dd className="mt-0.5 text-base leading-relaxed text-fg-muted">
                {def}
              </dd>
            </div>
          ))}
          <div className="border-l-2 border-l-accent pl-4">
            <dt className="font-semibold text-fg">Open access</dt>
            <dd className="mt-0.5 text-base leading-relaxed text-fg-muted">
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
              . The full dataset is downloadable from{' '}
              <Link href="/data/" className={INLINE_LINK}>
                Open Data
              </Link>
              .
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <SectionHeading as="h3" title="Coverage today" />
        <StatGrid cols={4}>
          {coverage.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} hint={s.hint} />
          ))}
        </StatGrid>
      </section>

      <section className="mt-10 max-w-prose">
        <SectionHeading as="h3" title="Built in the open" />
        <p className="text-base leading-relaxed text-fg-muted">
          lanthanides.io is open to contributions from researchers, analysts,
          procurement professionals, and anyone with sourced pricing data or
          market intelligence. Every contribution must be factual, sourced, and
          verifiable; price changes land as a reviewable git diff, never an
          opaque edit. You can submit a price observation, report a data error,
          or share market intelligence via the{' '}
          <a href={GITHUB} target="_blank" rel="noopener" className={INLINE_LINK}>
            GitHub contributor flow
          </a>
          , and read the full{' '}
          <a
            href={`${GITHUB}/blob/main/CONTRIBUTING.md`}
            target="_blank"
            rel="noopener"
            className={INLINE_LINK}
          >
            contribution guide
          </a>{' '}
          for data formats and source requirements.
        </p>
      </section>

      {/* PART 02: WHERE IT'S GOING (VISION) */}
      <PartHeader
        part="02"
        chip={<Chip dot="bg-accent">Roadmap</Chip>}
        title="Where it’s going"
        lead="The dataset is the foundation the commercial features build on, not a replacement for it. Three products extend the open reference into a working market. Each already has a data model and a live entry point, and each is candid about what is real today versus what is still a stub."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* ── Demand side ─────────────────────────────────────────────── */}
        <Card as="article" padding="lg" className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Demand side</p>
            <Chip dot={STAGE.progress.dot}>{STAGE.progress.label}</Chip>
          </div>
          <h3 className="mt-3 font-serif text-lg font-semibold text-fg">
            Find the offer without trawling the internet
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
            Rare-earth supply is scattered across fragmented Chinese platforms,
            eBay listings, and specialty distributors, with no standard pricing.
            The demand-side engine screens those sources and surfaces high-yield
            offers, verified, priced against our references, and ranked, so a
            buyer sees the best available material without trawling a dozen
            marketplaces. Today the feed is live, seeded from the verified
            dataset and ranked by value; the live screening and ingestion backend
            is not built yet.
          </p>
          <div className="mt-4 border-t border-border pt-3">
            <Link
              href="/offers/"
              className="text-sm font-medium text-accent hover:text-accent-strong"
            >
              See the offer feed →
            </Link>
          </div>
        </Card>

        {/* ── Supply side ─────────────────────────────────────────────── */}
        <Card as="article" padding="lg" className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Supply side</p>
            <Chip dot={STAGE.progress.dot}>{STAGE.progress.label}</Chip>
          </div>
          <h3 className="mt-3 font-serif text-lg font-semibold text-fg">
            List material, and know what it&rsquo;s worth
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
            Sellers entering a market with no standardized pricing don&rsquo;t
            know what their material is worth. The supply side lets a seller list
            product and get a real-time price gauge: what this form and purity
            is actually worth, drawn straight from our dataset&rsquo;s retail and
            bulk references, lowering the friction of entering the market. The
            selection logic that powers the gauge is already built and runs over
            the live records; the interactive tool and listing flow are in
            development.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-sm">
            <Link
              href="/tools/price-gauge/"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Price gauge →
            </Link>
            <Link
              href="/sell/"
              className="font-medium text-accent hover:text-accent-strong"
            >
              List material →
            </Link>
          </div>
        </Card>

        {/* ── Alerts layer ────────────────────────────────────────────── */}
        <Card as="article" padding="lg" className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Alerts layer</p>
            <Chip dot={STAGE.now.dot}>Telegram live</Chip>
          </div>
          <h3 className="mt-3 font-serif text-lg font-semibold text-fg">
            Get told the moment a border closes
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
            A single MOFCOM announcement can reprice or halt a supply line
            overnight. The alerts layer pushes regulatory notifications the moment
            they&rsquo;re detected. Telegram fires today through the six-hourly
            monitor. Next, it expands toward email delivery and full
            price-movement and per-element regulatory routing.
          </p>
          <div className="mt-4 border-t border-border pt-3">
            <Link
              href="/alerts/"
              className="text-sm font-medium text-accent hover:text-accent-strong"
            >
              Set up alerts →
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Staged roadmap ──────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading
          as="h3"
          title="Staged roadmap"
          description="What is running today versus what is still a stub, mapped to a stage, not a delivery date. Each row links to its live entry point so the vision is clickable."
        />
        <Table>
          <THead>
            <TR hover={false}>
              <TH>Capability</TH>
              <TH>Stage</TH>
              <TH>Where it stands today</TH>
              <TH align="right">Entry point</TH>
            </TR>
          </THead>
          <TBody>
            {roadmap.map((r) => (
              <TR key={`${r.capability}-${r.cta}`}>
                <TD className="font-medium text-fg">{r.capability}</TD>
                <TD>
                  <Chip dot={STAGE[r.stage].dot}>{STAGE[r.stage].label}</Chip>
                </TD>
                <TD>{r.status}</TD>
                <TD align="right">
                  <Link
                    href={r.href}
                    className="whitespace-nowrap font-medium text-accent hover:text-accent-strong"
                  >
                    {r.cta} →
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-fg-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${STAGE.now.dot}`} aria-hidden="true" />
            Now: live and in use
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${STAGE.progress.dot}`} aria-hidden="true" />
            In progress: engine built, surface in development
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${STAGE.planned.dot}`} aria-hidden="true" />
            Planned: modelled, not yet built
          </span>
        </p>
      </section>

      {/* ── Why now, and why this ───────────────────────────────────────── */}
      <section className="mt-12 max-w-prose">
        <SectionHeading as="h3" title="Why now, and why this" />
        <div className="space-y-3 text-base leading-relaxed text-fg-muted">
          <p>
            Rare earths and a handful of strategic metals sit on the fault line
            of US-China decoupling, indispensable to magnets,
            semiconductors, and defense systems, with highly concentrated supply.
            Since gallium and germanium in July 2023, MOFCOM has issued{' '}
            <span className="font-mono tabular-nums text-fg">
              {announcementCount}
            </span>{' '}
            successive export-control announcements now reaching{' '}
            <span className="font-mono tabular-nums text-fg">{controlled}</span>{' '}
            of the {elementCount} elements tracked here. Pricing for these
            materials is fragmented and paywalled; the regulatory picture is
            barely tracked in English at all.
          </p>
          <p>
            The defensible asset is the dataset and the tracker, not a feature.
            The export-control tracker is the only continuously maintained,
            source-cited English-language record of these announcements we are
            aware of; the price dataset is provenance-first, every figure
            inspectable in git rather than asserted behind a paywall. A
            marketplace built on a credible, auditable reference is hard to copy
            without first rebuilding the reference, and the reference is already
            live.
          </p>
        </div>
        <Callout
          tone="note"
          title="What this page does not claim"
          className="mt-5"
        >
          No traction, revenue, or partnerships are implied. The commercial layer
          is early and labelled stub-by-stub above; the open reference is what is
          live, free, and worth trusting today.
        </Callout>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/regulatory/" variant="primary">
            Open the regulatory tracker →
          </LinkButton>
          <LinkButton href="/data/">Get the open data</LinkButton>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section className="mt-12 max-w-prose">
        <SectionHeading as="h3" title="Contact" />
        {/* TODO(owner): set the real project contact address. hello@lanthanides.io
            is a neutral placeholder on the project's own domain (replaces the old
            .edu address per AUDIT §4.1). Confirm the alias is live before launch. */}
        <p className="text-base leading-relaxed text-fg-muted">
          For data corrections, source submissions, partnership or investment
          questions:{' '}
          <a
            href="mailto:hello@lanthanides.io"
            className="font-semibold text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            hello@lanthanides.io
          </a>
        </p>
        <p className="mt-3 text-base leading-relaxed text-fg-muted">
          To understand how data is processed, see{' '}
          <Link href="/methodology/" className={INLINE_LINK}>
            Methodology
          </Link>
          , or browse the current registry on{' '}
          <Link href="/sources/" className={INLINE_LINK}>
            Sources
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
