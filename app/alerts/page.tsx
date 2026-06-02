/**
 * /alerts: the notification signup surface (Prompt 22). Get told when a new
 * Chinese export-control announcement lands or a tracked price moves. Two
 * channels, each honest about status:
 *
 *   • Telegram: LIVE. The regulatory monitor already dispatches alerts; this
 *     places the prompt-16 TelegramBadge subscribe CTA (real bot link via
 *     NEXT_PUBLIC_TELEGRAM_BOT_URL, else routes here with a maintainer note).
 *   • Email: WAITLIST. A capture form POSTs to /api/subscribe, persisting a
 *     `Subscription` (channel:'email', status:'waitlist'). Nothing is sent; the
 *     confirmation says so (CLAUDE.md hard rule #1).
 *
 * SSG: the page reads no per-request data (the subscriber list is private and is
 * never shown), and the Telegram CTA reads a build-inlined NEXT_PUBLIC_ env var,
 * so it static-renders like the home page. The dynamic write lives in the form
 * island + the /api/subscribe route. `noindex` is dropped now it's a real page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, Chip, Panel, SectionHeading } from '@/components/ui';
import { TelegramSubscribe, EmailWaitlistForm } from '@/components/alerts';

const DESCRIPTION =
  'Get notified the moment a new Chinese export-control announcement lands or a tracked rare-earth price moves, by Telegram (live now) or email (join the waitlist). Scoped to the events you care about; your address is never published.';

export const metadata: Metadata = buildMetadata({
  title: 'Alerts: Export-Control & Price Notifications by Telegram or Email',
  description: DESCRIPTION,
  keywords:
    'rare earth alerts, MOFCOM announcement alerts, export control notifications, rare earth price alerts, telegram rare earth bot, strategic metals alerts',
  path: '/alerts/',
});

export default function AlertsPage() {
  return (
    <Container as="main" className="py-10">
      <WebApplicationJsonLd
        name="Alerts · lanthanides.io"
        description={DESCRIPTION}
        path="/alerts/"
      />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', path: '/' }, { name: 'Alerts', path: '/alerts/' }]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Alerts' }]}
        eyebrow="Alerts"
        title="Get alerts when something moves"
        lead="Know the moment a new Chinese export-control announcement lands or a tracked reference price moves, scoped to the elements and events you pick. Telegram is live today; email is a waitlist."
      >
        <StoryLink>
          Alerts cover export-control announcements now (live via Telegram) and{' '}
          <Link href="/movements/">price movements</Link> next. They watch the same
          feeds as the <Link href="/regulatory/">Regulatory Tracker</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── How this works today ─────────────────────────────────────────── */}
      <Callout tone="note" title="What this is" className="mt-8">
        <p className="leading-relaxed">
          <span className="font-semibold text-fg">Telegram alerts run today</span>,
          fired by the regulatory monitor on each new announcement.{' '}
          <span className="font-semibold text-fg">Email is a waitlist</span>: we
          store your address and chosen topics, and no email is sent yet.
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
          We store only what a channel needs to deliver: your email and chosen
          topics, nothing else. No tracking, no third parties, no resale. A
          subscription is never published into the open dataset (that stays the
          reviewed git-PR flow). To be removed from the waitlist, email{' '}
          <a href="mailto:hello@lanthanides.io">hello@lanthanides.io</a>.
        </p>
      </Callout>
    </Container>
  );
}
