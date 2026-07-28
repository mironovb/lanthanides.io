'use client';

/**
 * InquiryForm: the listing-detail purchase inquiry, collapsed behind the
 * primary "Inquire about this item" control.
 *
 * Progressive enhancement, both directions:
 * - The disclosure is a native <details>/<summary>, so it opens without JS.
 * - The form is a real <form method="post" action="/api/marketplace/inquiries">
 *   with hidden listing/seller inputs; without JS the endpoint accepts the
 *   form-encoded body and 303-redirects back to the listing.
 * - With JS, submit is intercepted and POSTed as JSON
 *   ({listing_slug, seller_handle, size_label, name, email, country, message});
 *   the button disables while pending, a 400 {ok:false, errors:{field:msg}}
 *   renders per-field errors, a network failure shows an inline error with
 *   retry, and success swaps the form for a quiet confirmation restating the
 *   reference (title + chosen size).
 */
import { useId, useState } from 'react';
import { Button, Panel, buttonClasses } from '@/components/ui';

const FIELD =
  'h-11 w-full rounded-sm border bg-surface px-2.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast focus-visible:border-accent';
const AREA =
  'min-h-[6.5rem] w-full rounded-sm border bg-surface px-2.5 py-2 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast focus-visible:border-accent';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';

/** The fields the endpoint may return errors for that have a visible control here. */
const VISIBLE_FIELDS = ['size_label', 'name', 'email', 'country', 'message'] as const;

type Status = 'idle' | 'pending' | 'sent' | 'error';

export function InquiryForm({
  listingSlug,
  sellerHandle,
  listingTitle,
  sizeLabels,
}: {
  listingSlug: string;
  sellerHandle: string;
  listingTitle: string;
  /** The listing's real variant labels, in table order. */
  sizeLabels: string[];
}) {
  const uid = useId();
  const [status, setStatus] = useState<Status>('idle');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sizeLabel, setSizeLabel] = useState(sizeLabels[0] ?? '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');

  const id = (field: string) => `inquiry-${uid}-${field}`;

  const extraErrors = Object.entries(fieldErrors).filter(
    ([key]) => !(VISIBLE_FIELDS as readonly string[]).includes(key),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('pending');
    setGeneralError(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/marketplace/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_slug: listingSlug,
          seller_handle: sellerHandle,
          size_label: sizeLabel,
          name,
          email,
          country,
          message,
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const body =
        data !== null && typeof data === 'object'
          ? (data as { ok?: boolean; errors?: Record<string, string> })
          : null;
      if (res.ok && body?.ok === true) {
        setStatus('sent');
        return;
      }
      if (
        res.status === 400 &&
        body?.ok === false &&
        body.errors !== undefined &&
        typeof body.errors === 'object'
      ) {
        setFieldErrors(body.errors);
        setStatus('idle');
        return;
      }
      setStatus('error');
      setGeneralError('The inquiry could not be sent. Check your connection and try again.');
    } catch {
      setStatus('error');
      setGeneralError('The inquiry could not be sent. Check your connection and try again.');
    }
  }

  function errorFor(field: string) {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return (
      <p id={id(`${field}-error`)} role="alert" className="mt-1 text-xs text-down">
        {msg}
      </p>
    );
  }

  const fieldClass = (field: string) =>
    `${FIELD} ${fieldErrors[field] ? 'border-down' : 'border-border-field'}`;
  const ariaProps = (field: string) =>
    fieldErrors[field]
      ? ({ 'aria-invalid': true, 'aria-describedby': id(`${field}-error`) } as const)
      : {};

  return (
    <details>
      <summary
        className={buttonClasses(
          'primary',
          'lg',
          'cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden',
        )}
      >
        Inquire about this item
      </summary>

      <Panel title="Send an inquiry" titleAs="h3" className="mt-3 max-w-2xl">
        {status === 'sent' ? (
          <div>
            <p className="text-sm font-semibold text-fg">Inquiry sent.</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              The seller replies by email, usually within one business day.
            </p>
            <p className="mt-3 font-mono text-xs text-fg-dim">
              Reference: {listingTitle} · {sizeLabel}
            </p>
          </div>
        ) : (
          <form
            method="post"
            action="/api/marketplace/inquiries"
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <input type="hidden" name="listing_slug" value={listingSlug} />
            <input type="hidden" name="seller_handle" value={sellerHandle} />

            <div className="max-w-xs">
              <label htmlFor={id('size')} className={LABEL}>
                Pack size
              </label>
              <select
                id={id('size')}
                name="size_label"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                className={fieldClass('size_label')}
                {...ariaProps('size_label')}
              >
                {sizeLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              {errorFor('size_label')}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={id('name')} className={LABEL}>
                  Name
                </label>
                <input
                  id={id('name')}
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass('name')}
                  {...ariaProps('name')}
                />
                {errorFor('name')}
              </div>
              <div>
                <label htmlFor={id('email')} className={LABEL}>
                  Email
                </label>
                <input
                  id={id('email')}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass('email')}
                  {...ariaProps('email')}
                />
                {errorFor('email')}
              </div>
            </div>

            <div className="max-w-xs">
              <label htmlFor={id('country')} className={LABEL}>
                Destination country
              </label>
              <input
                id={id('country')}
                name="country"
                type="text"
                autoComplete="country-name"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={fieldClass('country')}
                {...ariaProps('country')}
              />
              {errorFor('country')}
            </div>

            <div>
              <label htmlFor={id('message')} className={LABEL}>
                Message <span className="normal-case text-fg-dim">(optional)</span>
              </label>
              <textarea
                id={id('message')}
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${AREA} ${fieldErrors.message ? 'border-down' : 'border-border-field'}`}
                {...ariaProps('message')}
              />
              {errorFor('message')}
            </div>

            {generalError ? (
              <p role="alert" className="text-sm text-down">
                {generalError}
              </p>
            ) : null}
            {extraErrors.length > 0 ? (
              <p role="alert" className="text-sm text-down">
                {extraErrors.map(([, msg]) => msg).join(' ')}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={status === 'pending'}
            >
              {status === 'pending' ? 'Sending…' : 'Send inquiry'}
            </Button>
          </form>
        )}
      </Panel>
    </details>
  );
}
