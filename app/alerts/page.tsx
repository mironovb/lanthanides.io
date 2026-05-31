/**
 * /alerts — Alerts (PLACEHOLDER, Prompt 14). The subscribe form (writes a
 * `Subscription` row; Telegram + email) lands with the alerts layer in a later
 * prompt (ARCHITECTURE §4.3). This labelled placeholder keeps the "Alerts" IA
 * complete. `noindex` so the thin page isn't crawled.
 *
 * Honest framing (CLAUDE.md hard rule #1): Telegram dispatch already runs inside
 * the regulatory monitor today; what lands here is the public subscribe form.
 */
import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Alerts',
  description:
    'Get notified the moment a new Chinese export-control announcement lands or a tracked price moves — by Telegram or email. Coming in this build.',
  alternates: { canonical: '/alerts/' },
  robots: { index: false, follow: true },
};

export default function AlertsPage() {
  return (
    <ComingSoon
      crumb="Alerts"
      eyebrow="Alerts"
      title="Alerts"
      lead="Be told the moment a new Chinese export-control announcement lands or a tracked price moves past a threshold — delivered by Telegram or email, scoped to the elements and events you care about."
      bullets={[
        'Subscribe by Telegram or email, scoped to chosen elements and event types.',
        'Fire on new export-control announcements and significant price movements.',
        'Stay private — a subscription is never published into the open dataset.',
      ]}
      note="Telegram dispatch already runs inside the regulatory monitor on a roughly 6-hourly cadence and fires on critical announcements; the public subscribe form (Telegram + email) is what’s landing here."
      related={[
        { label: 'Regulatory tracker', href: '/regulatory/', primary: true },
        { label: 'Market movements', href: '/movements/' },
        { label: 'News & analysis', href: '/news/' },
      ]}
    />
  );
}
