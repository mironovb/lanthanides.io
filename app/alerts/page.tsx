/**
 * /alerts — the notification signup surface (Prompt 22). The alerts layer of the
 * thin commercial app: get told the moment a new Chinese export-control
 * announcement lands or a tracked price moves. Two channels, each honest about
 * status:
 *
 *   • Telegram — LIVE. The regulatory monitor already dispatches alerts; this
 *     places the prompt-16 TelegramBadge subscribe CTA (real bot link via
 *     NEXT_PUBLIC_TELEGRAM_BOT_URL, else routes here with a maintainer note).
 *   • Email — WAITLIST. A capture form POSTs to /api/subscribe, persisting a
 *     `Subscription` (channel:'email', status:'waitlist'). Nothing is sent — the
 *     confirmation says so (CLAUDE.md hard rule #1).
 *
 * SSG: the page reads no per-request data (the subscriber list is private and is
 * never shown), and the Telegram CTA reads a build-inlined NEXT_PUBLIC_ env var —
 * so it static-renders like the home page. The dynamic write lives in the form
 * island + the /api/subscribe route. `noindex` is dropped now it's a real page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, Chip, Panel, SectionHeading } from '@/components/ui';
import { TelegramSubscribe, EmailWaitlistForm } from '@/components/alerts';

const SITE = 'https://www.lanthanides.io';

const DESCRIPTION =
  'Get notified the moment a new Chinese export-control announcement lands or a tracked rare-earth price moves — by Telegram (live now) or email (join the waitlist). Scoped to the events you care about; your address is never published.';

export const metadata: Metadata = {
  title: 'Alerts — Export-Control & Price Notifications by Telegram or Email',
  description: DESCRIPTION,
  keywords:
    'rare earth alerts, MOFCOM announcement alerts, export control notifications, rare earth price alerts, telegram rare earth bot, strategic metals alerts',
  alternates: { canonical: '/alerts/' },
  openGraph: {
    title: 'Alerts — lanthanides.io',
    description: DESCRIPTION,
    url: '/alerts/',
    type: 'website',
    images: [
      {
        url: '/assets/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'lanthanides.io — Strategic Materials Ledger',
      },
    ],
  },
};

export default function AlertsPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Alerts — lanthanides.io',
      url: `${SITE}/alerts/`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      description: DESCRIPTION,
      provider: { '@type': 'Organization', name: 'lanthanides.io', url: `${SITE}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Alerts', item: `${SITE}/alerts/` },
      ],
    },
  ];

  return (
    <Container as="main" className="py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Alerts' }]}
        eyebrow="Alerts"
        title="Get alerts when something moves"
        lead="Be told the moment a new Chinese export-control announcement lands or a tracked reference price crosses a movement threshold — scoped to the elements and events you care about. Telegram is live today; email is opening as a waitlist."
      >
        <StoryLink>
          Alerts are the notification layer of{' '}
          <Link href="/about/">the vision</Link>: export-control announcements now
          (live via Telegram), significant{' '}
          <Link href="/movements/">price movements</Link> next. They watch the same
          feeds as the <Link href="/regulatory/">Regulatory Tracker</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── How this works today (honest framing) ────────────────────────── */}
      <Callout tone="note" title="What this is, plainly" className="mt-8">
        <p className="leading-relaxed">
          <span className="font-semibold text-fg">Telegram alerts run today</span> —
          an automated monitor polls Chinese-government sources roughly every six
          hours and fires on each significant new announcement.{' '}
          <span className="font-semibold text-fg">Email is a waitlist:</span> we
          store your address and topics so we can tell you when delivery opens — no
          email is sent yet, and we won’t pretend otherwise.
        </p>
      </Callout>

      {/* ── The two channels ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Choose how you’re notified"
          description="Two channels, scoped to the events you pick. Telegram is live now; email is opening as a waitlist."
        />
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">
          {/* Telegram (LIVE) */}
          <TelegramSubscribe />

          {/* Email (COMING SOON) */}
          <Panel
            title="Email waitlist"
            eyebrow="Coming soon"
            actions={<Chip>In development</Chip>}
          >
            <EmailWaitlistForm />
          </Panel>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <Callout tone="note" title="Your privacy" className="mt-12">
        <p className="leading-relaxed">
          We store only what a channel needs to deliver — your email and chosen
          topics, nothing else. No tracking, no third parties, no resale. A
          subscription is never published into the open dataset (that stays the
          reviewed git-PR flow). To be removed from the waitlist, email{' '}
          <a href="mailto:hello@lanthanides.io">hello@lanthanides.io</a>.
        </p>
      </Callout>
    </Container>
  );
}
