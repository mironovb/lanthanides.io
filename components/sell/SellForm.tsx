'use client';

/**
 * SellForm: the seller listing island (Prompt 20). A controlled form that
 * collects a structured listing (element, form, purity, quantity, asking price +
 * currency, seller name, optional contact + notes), validates it the same way the
 * server does (`validateListing`), and on submit POSTs to `/api/listings`. The
 * server persists the row (`status: 'pending'`) with a frozen price-gauge snapshot
 * and returns the full gauge result, which we render inline as the "instant gauge":
 * the seller's asking price positioned against the sourced low/mid/high band.
 *
 * The write path is a JSON POST (a mutation; it can't be a no-JS idempotent GET
 * like the read-only Price Gauge tool), so a <noscript> notice points JS-disabled
 * visitors to the always-available Price Gauge. Everything else on /sell (the
 * vision framing and the live listings table) is server-rendered and works without
 * JS.
 *
 * Accessibility: every control has a <label>; errors wire `aria-invalid` +
 * `aria-describedby` and announce via `role="alert"`; the submit button reflects
 * the in-flight state and is disabled while submitting.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Callout, LinkButton, Panel } from '@/components/ui';
import { capitalize } from '@/lib/format';
import type { ElementOption } from '@/components/tools/gauge';
import {
  CURRENCIES,
  EMPTY_LISTING_VALUES,
  type CreateListingResponse,
  type ListingField,
  type ListingValues,
  validateListing,
} from './sell';
import { ListingGaugeResult } from './ListingGaugeResult';

const FIELD =
  'w-full rounded-sm border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';
const HINT = 'mt-1 text-2xs leading-relaxed text-fg-dim';

function fieldClass(hasError: boolean): string {
  // `border-field` is the ≥3:1 control boundary (WCAG 1.4.11); error state swaps
  // to the semantic red, focus to the accent.
  return `${FIELD} ${hasError ? 'border-down' : 'border-border-field focus-visible:border-accent'}`;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function SellForm({
  options,
  forms,
}: {
  options: ElementOption[];
  /** Every form present in the dataset (lower-case), the fallback list. */
  forms: string[];
}) {
  const router = useRouter();
  const symbols = useMemo(() => options.map((o) => o.symbol), [options]);

  const [values, setValues] = useState<ListingValues>(EMPTY_LISTING_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ListingField, string>>
  >({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateListingResponse | null>(null);

  const current = options.find((o) => o.symbol === values.symbol) ?? null;
  const formChoices = current && current.forms.length > 0 ? current.forms : forms;
  const submitting = status === 'submitting';

  function set<K extends ListingField>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSymbol(next: string) {
    setValues((v) => {
      const allowed = options.find((o) => o.symbol === next)?.forms ?? [];
      const form = v.form && !allowed.includes(v.form) ? '' : v.form;
      return { ...v, symbol: next, form };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateListing(values, { symbols, forms });
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
      // would otherwise 308 /api/listings → /api/listings/ on every submit).
      const res = await fetch('/api/listings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || (data as { ok?: boolean }).ok !== true) {
        const err = data as { error?: string; fieldErrors?: typeof fieldErrors };
        if (err?.fieldErrors) setFieldErrors(err.fieldErrors);
        setFormError(
          err?.error ?? 'Your listing could not be saved. Please try again.',
        );
        setStatus('error');
        return;
      }
      setResponse(data as CreateListingResponse);
      setStatus('success');
      setFieldErrors({});
      // Re-render the server component below so the new row shows in the table.
      router.refresh();
    } catch {
      setFormError(
        'Network error. Your listing was not saved. Please try again.',
      );
      setStatus('error');
    }
  }

  function reset() {
    setValues(EMPTY_LISTING_VALUES);
    setFieldErrors({});
    setResponse(null);
    setFormError(null);
    setStatus('idle');
  }

  const elementName = current?.name ?? response?.listing.elementSymbol ?? '';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <div>
        <noscript>
          <Callout tone="warning" title="JavaScript required to submit">
            Submitting a listing needs JavaScript. The read-only{' '}
            <a href="/tools/price-gauge/">Price Gauge</a> works without it.
          </Callout>
        </noscript>

        <Panel title="List your material" eyebrow="Submission">
          <form onSubmit={onSubmit} aria-label="Seller listing" className="space-y-4" noValidate>
            {/* Element ---------------------------------------------------- */}
            <div>
              <label htmlFor="sl-symbol" className={LABEL}>
                Element <span className="text-down">*</span>
              </label>
              <select
                id="sl-symbol"
                name="symbol"
                value={values.symbol}
                onChange={(e) => onSymbol(e.target.value)}
                disabled={submitting}
                aria-invalid={!!fieldErrors.symbol}
                aria-describedby={fieldErrors.symbol ? 'sl-symbol-error' : undefined}
                className={fieldClass(!!fieldErrors.symbol)}
              >
                <option value="">Select an element…</option>
                {options.map((o) => (
                  <option key={o.symbol} value={o.symbol}>
                    {o.symbol} · {o.name}
                  </option>
                ))}
              </select>
              <FieldError id="sl-symbol-error" msg={fieldErrors.symbol} />
            </div>

            {/* Form + Purity (paired) ------------------------------------- */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sl-form" className={LABEL}>
                  Form <span className="text-down">*</span>
                </label>
                <select
                  id="sl-form"
                  name="form"
                  value={values.form}
                  onChange={(e) => set('form', e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!fieldErrors.form}
                  aria-describedby={fieldErrors.form ? 'sl-form-error' : undefined}
                  className={fieldClass(!!fieldErrors.form)}
                >
                  <option value="">Select…</option>
                  {formChoices.map((f) => (
                    <option key={f} value={f}>
                      {capitalize(f)}
                    </option>
                  ))}
                </select>
                <FieldError id="sl-form-error" msg={fieldErrors.form} />
              </div>
              <div>
                <label htmlFor="sl-purity" className={LABEL}>
                  Purity <span className="text-down">*</span>
                </label>
                <input
                  id="sl-purity"
                  name="purity"
                  type="text"
                  inputMode="decimal"
                  value={values.purity}
                  onChange={(e) => set('purity', e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. 99.9%"
                  autoComplete="off"
                  aria-invalid={!!fieldErrors.purity}
                  aria-describedby={fieldErrors.purity ? 'sl-purity-error' : undefined}
                  className={fieldClass(!!fieldErrors.purity)}
                />
                <FieldError id="sl-purity-error" msg={fieldErrors.purity} />
              </div>
            </div>
            {current ? (
              <p className={HINT}>
                {current.forms.length > 0
                  ? `${current.name} is quoted in: ${current.forms.map(capitalize).join(', ')}.`
                  : `No sourced prices on file yet for ${current.name}. You can still list, but there’ll be no range to gauge against.`}
              </p>
            ) : null}

            {/* Quantity ---------------------------------------------------- */}
            <div>
              <label htmlFor="sl-quantity" className={LABEL}>
                Quantity (kg) <span className="text-down">*</span>
              </label>
              <input
                id="sl-quantity"
                name="quantityKg"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={values.quantityKg}
                onChange={(e) => set('quantityKg', e.target.value)}
                disabled={submitting}
                placeholder="e.g. 50"
                aria-invalid={!!fieldErrors.quantityKg}
                aria-describedby={
                  fieldErrors.quantityKg ? 'sl-quantity-error' : 'sl-quantity-hint'
                }
                className={fieldClass(!!fieldErrors.quantityKg)}
              />
              {fieldErrors.quantityKg ? (
                <FieldError id="sl-quantity-error" msg={fieldErrors.quantityKg} />
              ) : (
                <p id="sl-quantity-hint" className={HINT}>
                  Sets the gauge tier: under 25 kg → retail, 25 kg and up → bulk.
                </p>
              )}
            </div>

            {/* Asking price + currency ------------------------------------ */}
            <div>
              <label htmlFor="sl-price" className={LABEL}>
                Asking price per kg <span className="text-down">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="sl-price"
                  name="askingPricePerKg"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={values.askingPricePerKg}
                  onChange={(e) => set('askingPricePerKg', e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. 720"
                  aria-invalid={!!fieldErrors.askingPricePerKg}
                  aria-describedby={
                    fieldErrors.askingPricePerKg
                      ? 'sl-price-error'
                      : 'sl-price-hint'
                  }
                  className={`${fieldClass(!!fieldErrors.askingPricePerKg)} flex-1`}
                />
                <label htmlFor="sl-currency" className="sr-only">
                  Currency
                </label>
                <select
                  id="sl-currency"
                  name="currency"
                  value={values.currency}
                  onChange={(e) => set('currency', e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!fieldErrors.currency}
                  className={`${fieldClass(!!fieldErrors.currency)} w-24 shrink-0`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.askingPricePerKg || fieldErrors.currency ? (
                <FieldError
                  id="sl-price-error"
                  msg={fieldErrors.askingPricePerKg ?? fieldErrors.currency}
                />
              ) : (
                <p id="sl-price-hint" className={HINT}>
                  The gauge compares USD prices directly; other currencies are
                  stored but not cross-converted (no live FX rate).
                </p>
              )}
            </div>

            {/* Seller name ------------------------------------------------- */}
            <div>
              <label htmlFor="sl-seller" className={LABEL}>
                Seller name <span className="text-down">*</span>
              </label>
              <input
                id="sl-seller"
                name="sellerName"
                type="text"
                value={values.sellerName}
                onChange={(e) => set('sellerName', e.target.value)}
                disabled={submitting}
                placeholder="Company or trader name"
                autoComplete="organization"
                aria-invalid={!!fieldErrors.sellerName}
                aria-describedby={fieldErrors.sellerName ? 'sl-seller-error' : undefined}
                className={fieldClass(!!fieldErrors.sellerName)}
              />
              <FieldError id="sl-seller-error" msg={fieldErrors.sellerName} />
            </div>

            {/* Contact (optional, private) -------------------------------- */}
            <div>
              <label htmlFor="sl-contact" className={LABEL}>
                Contact <span className="font-normal normal-case text-fg-dim">(optional, private)</span>
              </label>
              <input
                id="sl-contact"
                name="sellerContact"
                type="text"
                value={values.sellerContact}
                onChange={(e) => set('sellerContact', e.target.value)}
                disabled={submitting}
                placeholder="Email or phone, never shown publicly"
                autoComplete="email"
                aria-invalid={!!fieldErrors.sellerContact}
                aria-describedby={
                  fieldErrors.sellerContact ? 'sl-contact-error' : 'sl-contact-hint'
                }
                className={fieldClass(!!fieldErrors.sellerContact)}
              />
              {fieldErrors.sellerContact ? (
                <FieldError id="sl-contact-error" msg={fieldErrors.sellerContact} />
              ) : (
                <p id="sl-contact-hint" className={HINT}>
                  Kept private for the reviewer. It’s never published or shown in
                  the listings table.
                </p>
              )}
            </div>

            {/* Notes (optional) ------------------------------------------- */}
            <div>
              <label htmlFor="sl-notes" className={LABEL}>
                Notes <span className="font-normal normal-case text-fg-dim">(optional)</span>
              </label>
              <textarea
                id="sl-notes"
                name="notes"
                value={values.notes}
                onChange={(e) => set('notes', e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Origin, packaging, incoterm, certificates…"
                aria-invalid={!!fieldErrors.notes}
                aria-describedby={fieldErrors.notes ? 'sl-notes-error' : undefined}
                className={fieldClass(!!fieldErrors.notes)}
              />
              <FieldError id="sl-notes-error" msg={fieldErrors.notes} />
            </div>

            {/* Actions ----------------------------------------------------- */}
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit & gauge my price'}
              </Button>
              {status === 'success' ? (
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs font-medium text-fg-dim transition-colors duration-fast hover:text-fg"
                >
                  List another
                </button>
              ) : null}
            </div>

            {formError && status === 'error' ? (
              <p role="alert" className="text-xs text-down">
                {formError}
              </p>
            ) : null}
          </form>
        </Panel>
      </div>

      {/* ── Result column ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {status === 'success' && response ? (
          <>
            <Callout tone="success" title="Listing captured, pending review">
              Saved as a <span className="font-mono">pending</span> submission. A
              maintainer reviews every listing before it’s published. We never
              auto-publish into the open dataset. No account or email is needed,
              and nothing has been sent to you.
            </Callout>
            <ListingGaugeResult response={response} elementName={elementName} />
          </>
        ) : (
          <SellIntro />
        )}
      </div>
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-down">
      {msg}
    </p>
  );
}

/** Pre-submit empty state: sets expectations for what the gauge returns. */
function SellIntro() {
  return (
    <Panel title="What you’ll get back" eyebrow="Instant gauge">
      <p className="text-sm leading-relaxed text-fg-muted">
        Submit a listing and you’ll immediately see your asking price checked
        against the sourced dataset:
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-fg-muted">
        <li>
          <span className="font-semibold text-fg">A fair-price range.</span> The
          weighted P25 / P50 / P75 of the matching sourced records, in USD/kg,
          the same engine behind the{' '}
          <Link href="/tools/price-gauge/" className="text-accent hover:text-accent-strong">
            Price Gauge
          </Link>
          .
        </li>
        <li>
          <span className="font-semibold text-fg">Your price, positioned.</span>{' '}
          Whether your asking price sits below, within, or above that band, with
          the gap to the median.
        </li>
        <li>
          <span className="font-semibold text-fg">The full basis.</span> Records
          matched, distinct sellers, date span, and method, each traceable to the
          element’s provenance table. If too few records match, it says so rather
          than inventing a number.
        </li>
      </ul>
      <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-fg-dim">
        Your submission is stored as pending and reviewed by a maintainer before
        publishing. Listings never auto-publish into the open dataset.
      </p>
      <div className="mt-4">
        <LinkButton href="/tools/price-gauge/" variant="secondary" size="sm">
          Just exploring? Try the Price Gauge →
        </LinkButton>
      </div>
    </Panel>
  );
}
