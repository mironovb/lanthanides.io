/**
 * TelegramSubscribe: the live Telegram column of the alerts page (Prompt 22). It
 * places the prompt-16 `TelegramBadge` CTA (the real subscribe button to the
 * MOFCOM export-control alert bot, driven by `NEXT_PUBLIC_TELEGRAM_BOT_URL`) and
 * surrounds it with the page-specific detail the task asks for: what a subscriber
 * actually gets, and, when the public bot handle isn't configured yet, a
 * maintainer note instructing the owner to set the env var.
 *
 * Why this is honestly "Live": the regulatory monitor already polls Chinese-
 * government sources roughly every six hours and dispatches a Telegram alert on
 * each significant new announcement (AUDIT §1.9/§5). The only thing the owner must
 * supply is the public bot link; until then the CTA routes to this page rather
 * than shipping a guessed/dead link (hard rule #1). Server component.
 */
import { Callout, Card } from '@/components/ui';
import { TelegramBadge, getTelegramBotUrl } from '@/components/trust';

const PERKS = [
  'A push the moment a new MOFCOM / GAC export-control announcement is detected.',
  'Each alert carries the announcement number, the affected elements, and a link straight to the regulatory tracker.',
  'Polled from Chinese-government sources on a roughly six-hourly cadence, with no digest delay on critical changes.',
];

export function TelegramSubscribe() {
  const configured = getTelegramBotUrl() !== null;

  return (
    <div className="space-y-4">
      {/* The prompt-16 live CTA (real bot link when configured, else routes here). */}
      <TelegramBadge variant="panel" />

      <Card padding="md">
        <p className="eyebrow">What you get</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg-muted">
          {PERKS.map((perk) => (
            <li key={perk} className="flex gap-2">
              <span aria-hidden="true" className="text-accent-strong">
                ›
              </span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </Card>

      {!configured ? (
        <Callout tone="note" title="Maintainer setup">
          The button above currently routes back to this page because the public
          bot handle isn’t set. Point{' '}
          <span className="font-mono text-fg">NEXT_PUBLIC_TELEGRAM_BOT_URL</span>{' '}
          at the real <span className="font-mono text-fg">https://t.me/&lt;handle&gt;</span>{' '}
          (see <span className="font-mono text-fg">.env.example</span>) and the CTA
          opens Telegram directly. The monitor’s alerting itself is already running.
        </Callout>
      ) : null}
    </div>
  );
}
