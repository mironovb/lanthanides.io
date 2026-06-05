/**
 * TelegramBadge: marks the MOFCOM export-control alert bot endpoint. Automated
 * dispatch is currently paused because the scheduled GitHub Actions monitor was
 * removed while the site runs from Vercel. This component therefore avoids any
 * "live monitor" claim.
 *
 * The public bot *handle*, however, is not hardcoded. The CTA reads
 * `NEXT_PUBLIC_TELEGRAM_BOT_URL` (a build-inlined public var): when it points at
 * a real https://t.me/… link the CTA opens it directly; until the owner sets it,
 * the CTA routes to /alerts/ instead of shipping a guessed/fake link
 * (CLAUDE.md hard rule #1 + Prompt-16 task #4). See `.env.example`.
 *
 * Two shapes: `inline` (a compact status pill) and `panel` (a CTA block). Server
 * component.
 */
import Link from 'next/link';
import { buttonClasses, cn } from '@/components/ui';

/**
 * The placeholder shipped in `.env.example`. Treated as "unset" so a copied-but-
 * unedited env never produces a dead Telegram link.
 * TODO(owner): set NEXT_PUBLIC_TELEGRAM_BOT_URL to the real https://t.me/<handle>.
 */
const PLACEHOLDER_BOT_URL = 'https://t.me/your_bot_handle';

/** The configured public bot URL, or null when unset / still the placeholder / malformed. */
export function getTelegramBotUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim();
  if (!raw || raw === PLACEHOLDER_BOT_URL) return null;
  // Only accept a genuine Telegram deep link; anything else falls back to /alerts.
  if (!/^https:\/\/(t\.me|telegram\.me)\/[\w+./-]+$/i.test(raw)) return null;
  return raw;
}

function PausedDot() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 rounded-full bg-risk-medium"
    />
  );
}

export function TelegramBadge({
  variant = 'inline',
  className,
}: {
  variant?: 'inline' | 'panel';
  className?: string;
}) {
  const botUrl = getTelegramBotUrl();

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border border-border bg-raised px-2 py-1 text-2xs',
          className,
        )}
      >
        <PausedDot />
        <span className="font-mono uppercase tracking-caps text-risk-medium">
          Paused
        </span>
        <span className="text-fg-muted">Telegram MOFCOM alert endpoint</span>
        {botUrl ? (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:text-accent-strong"
          >
            Open ↗
          </a>
        ) : (
          <Link
            href="/alerts/"
            className="font-medium text-accent hover:text-accent-strong"
          >
            Set up →
          </Link>
        )}
      </span>
    );
  }

  return (
    <section
      className={cn(
        'border border-border border-l-2 border-l-accent bg-surface p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <PausedDot />
        <p className="eyebrow text-risk-medium">Paused</p>
        <p className="font-mono text-2xs uppercase tracking-caps text-fg-dim">
          Telegram
        </p>
      </div>
      <h3 className="mt-2 font-serif text-base font-semibold text-fg">
        MOFCOM export-control alert endpoint
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
        The Telegram endpoint can be configured, but automated dispatch is paused
        while the scheduled regulatory-monitor GitHub Action is removed.
      </p>
      <div className="mt-3">
        {botUrl ? (
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('primary', 'sm')}
          >
            Open in Telegram ↗
          </a>
        ) : (
          <Link href="/alerts/" className={buttonClasses('secondary', 'sm')}>
            Set up alerts →
          </Link>
        )}
      </div>
      {!botUrl ? (
        <p className="mt-2 text-2xs leading-relaxed text-fg-dim">
          The public bot handle is not set. Use the regulatory tracker directly
          for now.
        </p>
      ) : null}
    </section>
  );
}
