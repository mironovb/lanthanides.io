/**
 * /alerts: the notification signup surface (Prompt 22). Get told when a new
 * Chinese export-control announcement lands or a tracked price moves. Two
 * channels, each honest about status:
 *
 *   • Telegram: PAUSED. The endpoint can be configured, but automated dispatch is
 *     paused after removing the scheduled regulatory-monitor GitHub Action.
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
  'Alert channels for Chinese export-control announcements and tracked rare-earth price moves. Telegram automation is paused; email is a waitlist. Your address is never published.';

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
        lead="Alert channels for Chinese export-control announcements and tracked reference-price moves. Telegram automation is paused today; email is a waitlist."
      >
        <StoryLink>
          For live regulatory context, use the{' '}
          <Link href="/regulatory/">Regulatory Tracker</Link>. Price-movement
          alerts remain tied to the <Link href="/movements/">market movements</Link>{' '}
          feed.
        </StoryLink>
      </PageHeader>

      {/* ── How this works today ─────────────────────────────────────────── */}
      <Callout tone="note" title="What this is" className="mt-8">
        <p className="leading-relaxed">
          <span className="font-semibold text-fg">Telegram automation is paused</span>{' '}
          after removing the scheduled regulatory-monitor GitHub Action.{' '}
          <span className="font-semibold text-fg">Email is a waitlist</span>: we
          store your address and chosen topics, and no email is sent yet.
        </p>
      </Callout>

      {/* ── The two channels ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeading
          title="Choose how you’re notified"
          description="Two channels, both honest about current status. Telegram dispatch is paused; email is opening as a waitlist."
        />
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">
          {/* Telegram (PAUSED) */}
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
