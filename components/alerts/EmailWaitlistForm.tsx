'use client';

/**
 * EmailWaitlistForm — the email-capture island (Prompt 22). A controlled form that
 * collects an email + the alert topics to follow, validates it the same way the
 * server does (`validateSubscription`), and on submit POSTs to `/api/subscribe`.
 * The server persists a `Subscription` row (`channel:'email'`, `status:'waitlist'`)
 * and we render an explicit "you're on the waitlist — email alerts are in
 * development" confirmation.
 *
 * Honest by construction (CLAUDE.md hard rule #1): we NEVER claim an email was
 * sent — the success copy says alerts are in development and nothing has been
 * dispatched. No subscriber list is shown (privacy), so there is no router refresh.
 *
 * The write path is a JSON POST (a mutation — not a no-JS idempotent GET), so a
 * <noscript> notice points JS-disabled visitors to the always-available Telegram
 * option, which is a plain link.
 *
 * Accessibility: the email field and the topics fieldset have labels/legend;
 * errors wire `aria-invalid` + `aria-describedby` and announce via `role="alert"`;
 * the submit button reflects the in-flight state and disables while submitting.
 */
import { useState } from 'react';
import { Button, Callout } from '@/components/ui';
import {
  EMPTY_SUBSCRIPTION_VALUES,
  TOPICS,
  validateSubscription,
  type CreateSubscriptionResponse,
  type SubscriptionField,
  type SubscriptionValues,
  type Topic,
} from './alerts';

const FIELD =
  'w-full rounded-sm border bg-base px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';
const HINT = 'mt-1 text-2xs leading-relaxed text-fg-dim';

function fieldClass(hasError: boolean): string {
  return `${FIELD} ${hasError ? 'border-down' : 'border-border-strong focus-visible:border-accent'}`;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function EmailWaitlistForm() {
  const [values, setValues] = useState<SubscriptionValues>({
    ...EMPTY_SUBSCRIPTION_VALUES,
    topics: [...EMPTY_SUBSCRIPTION_VALUES.topics],
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<SubscriptionField, string>>
  >({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateSubscriptionResponse | null>(
    null,
  );

  const submitting = status === 'submitting';

  function toggleTopic(id: Topic) {
    setValues((v) => ({
      ...v,
      topics: v.topics.includes(id)
        ? v.topics.filter((t) => t !== id)
        : [...v.topics, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateSubscription({ ...values, channel: 'email' });
    setFieldErrors(v.fieldErrors);
    if (!v.clean) {
      setStatus('error');
      setFormError('Please fix the highlighted fields and resubmit.');
      return;
    }

    setStatus('submitting');
    setFormError(null);
    try {
      // Trailing slash to land on the canonical path directly (trailingSlash:true
      // would otherwise 308 /api/subscribe → /api/subscribe/ on every submit).
      const res = await fetch('/api/subscribe/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, topics: values.topics }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || (data as { ok?: boolean }).ok !== true) {
        const err = data as { error?: string; fieldErrors?: typeof fieldErrors };
        if (err?.fieldErrors) setFieldErrors(err.fieldErrors);
        setFormError(
          err?.error ?? 'Your signup could not be saved. Please try again.',
        );
        setStatus('error');
        return;
      }
      setResponse(data as CreateSubscriptionResponse);
      setStatus('success');
      setFieldErrors({});
    } catch {
      setFormError(
        'Network error — your signup was not saved. Please try again.',
      );
      setStatus('error');
    }
  }

  function reset() {
    setValues({
      ...EMPTY_SUBSCRIPTION_VALUES,
      topics: [...EMPTY_SUBSCRIPTION_VALUES.topics],
    });
    setFieldErrors({});
    setResponse(null);
    setFormError(null);
    setStatus('idle');
  }

  if (status === 'success' && response) {
    const chosen = TOPICS.filter((t) => response.subscription.topics.includes(t.id));
    return (
      <div className="space-y-4">
        <Callout
          tone="success"
          title={
            response.alreadySubscribed
              ? 'You were already on the waitlist'
              : 'You’re on the waitlist'
          }
        >
          <p className="leading-relaxed">
            {response.alreadySubscribed
              ? 'This address is already on the email waitlist — we’ve saved your latest topic choices.'
              : 'Your address is saved to the email waitlist.'}{' '}
            <span className="font-semibold text-fg">
              Email alerts are still in development
            </span>{' '}
            — nothing has been sent to you, and no message will be until the
            delivery layer ships.
          </p>
          {chosen.length > 0 ? (
            <p className="mt-2 leading-relaxed">
              Topics on file:{' '}
              <span className="text-fg">
                {chosen.map((t) => t.label).join(' · ')}
              </span>
              .
            </p>
          ) : null}
        </Callout>
        <p className="text-xs leading-relaxed text-fg-dim">
          Want alerts <span className="text-fg-muted">today</span>? The Telegram
          bot is live now — subscribe with one tap from the panel beside this form.
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-fg-dim transition-colors duration-fast hover:text-fg"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <noscript>
        <Callout tone="warning" title="JavaScript required to join the waitlist">
          Joining the email waitlist needs JavaScript. The Telegram bot beside this
          form is a plain link and works without it.
        </Callout>
      </noscript>

      <p className="mb-4 text-sm leading-relaxed text-fg-muted">
        Leave your email to be told when alert delivery opens. We store only your
        address and the topics you pick — nothing is sent until it ships, and your
        address is never published.
      </p>

      <form onSubmit={onSubmit} aria-label="Email waitlist" className="space-y-4" noValidate>
        {/* Email -------------------------------------------------------- */}
        <div>
          <label htmlFor="al-email" className={LABEL}>
            Email <span className="text-down">*</span>
          </label>
          <input
            id="al-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            disabled={submitting}
            placeholder="you@company.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'al-email-error' : 'al-email-hint'}
            className={fieldClass(!!fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p id="al-email-error" role="alert" className="mt-1 text-xs text-down">
              {fieldErrors.email}
            </p>
          ) : (
            <p id="al-email-hint" className={HINT}>
              Used only to deliver the alerts you choose. No account, no password.
            </p>
          )}
        </div>

        {/* Topics ------------------------------------------------------- */}
        <fieldset
          aria-invalid={!!fieldErrors.topics}
          aria-describedby={fieldErrors.topics ? 'al-topics-error' : undefined}
        >
          <legend className={LABEL}>
            Alert me about <span className="text-down">*</span>
          </legend>
          <div className="space-y-2">
            {TOPICS.map((t) => {
              const checked = values.topics.includes(t.id);
              return (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-2.5 border border-border bg-base px-3 py-2 transition-colors duration-fast hover:border-border-strong"
                >
                  <input
                    type="checkbox"
                    name="topics"
                    value={t.id}
                    checked={checked}
                    onChange={() => toggleTopic(t.id)}
                    disabled={submitting}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">
                      {t.label}
                      {t.id === 'regulatory' ? (
                        <span className="ml-2 font-mono text-2xs uppercase tracking-caps text-up">
                          live on Telegram
                        </span>
                      ) : (
                        <span className="ml-2 font-mono text-2xs uppercase tracking-caps text-fg-dim">
                          next
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-snug text-fg-dim">
                      {t.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.topics ? (
            <p id="al-topics-error" role="alert" className="mt-1 text-xs text-down">
              {fieldErrors.topics}
            </p>
          ) : null}
        </fieldset>

        {/* Actions ------------------------------------------------------ */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Joining…' : 'Join the email waitlist'}
          </Button>
          <span className="text-2xs text-fg-dim">No email is sent — waitlist only.</span>
        </div>

        {formError && status === 'error' ? (
          <p role="alert" className="text-xs text-down">
            {formError}
          </p>
        ) : null}
      </form>
    </>
  );
}
