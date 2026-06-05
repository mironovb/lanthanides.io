/**
 * TelegramSubscribe: the Telegram column of the alerts page. The endpoint can
 * still be configured through `NEXT_PUBLIC_TELEGRAM_BOT_URL`, but automated
 * dispatch is paused because the scheduled regulatory-monitor GitHub Action was
 * removed. Server component.
 */
import { Callout, Card } from '@/components/ui';
import { TelegramBadge, getTelegramBotUrl } from '@/components/trust';

const PERKS = [
  'The public Telegram endpoint can still be configured when dispatch is restored.',
  'The regulatory tracker remains the canonical place to verify MOFCOM / GAC announcements.',
  'Automated polling is paused; no six-hourly GitHub Action currently sends alerts.',
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
          opens Telegram directly. Automated alert dispatch is paused until a
          maintainer restores a monitor outside the removed GitHub Action.
        </Callout>
      ) : null}
    </div>
  );
}
