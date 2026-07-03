'use client';

/**
 * ContributionForm: the on-site intake for one community price observation.
 * Validates locally with the same validateContribution the API runs, POSTs to
 * /api/contributions, and refreshes the server-rendered queue on success. The
 * GitHub issue template appears only as the fallback in the failure state, so
 * nobody is stranded if the inbox is down; the happy path never mentions it.
 *
 * Accessibility mirrors PriceGaugeForm: labelled controls, aria-invalid +
 * aria-describedby, role="alert" errors, identical SSR/client markup.
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Callout, Panel } from '@/components/ui';
import { capitalize } from '@/lib/format';
import {
  EMPTY_INPUT,
  TIERS,
  UNITS,
  validateContribution,
  type ContributionField,
  type ContributionInput,
} from './contributions';

const FIELD =
  'w-full rounded-sm border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';
const HINT = 'mt-1 text-2xs leading-relaxed text-fg-dim';

function fieldClass(hasError: boolean): string {
  return `${FIELD} ${hasError ? 'border-down' : 'border-border-field focus-visible:border-accent'}`;
}

const GITHUB_TEMPLATE =
  'https://github.com/mironovb/lanthanides.io/issues/new?template=price-update.yml';

export interface ContributionFormProps {
  elements: Array<{ symbol: string; name: string }>;
  /** Forms already present in the dataset, as datalist suggestions. */
  knownForms: string[];
}

type Errors = Partial<Record<ContributionField, string>>;

export function ContributionForm({
  elements,
  knownForms,
}: ContributionFormProps) {
  // "?element=Dy" preselects the element, so the "+ Add a price" links on the
  // element pages land in a form already pointed at the right material.
  // useSearchParams keeps the page static; the caller wraps this island in
  // <Suspense> as Next requires for that combination.
  const searchParams = useSearchParams();
  const [input, setInput] = useState<ContributionInput>(() => {
    const q = searchParams?.get('element')?.trim().toLowerCase();
    const match = q
      ? elements.find((e) => e.symbol.toLowerCase() === q)
      : undefined;
    return match ? { ...EMPTY_INPUT, element: match.symbol } : EMPTY_INPUT;
  });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const set = (field: ContributionField) => (value: string) =>
    setInput((prev) => ({ ...prev, [field]: value }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitted(null);

    const symbols = elements.map((el) => el.symbol);
    const local = validateContribution(input, symbols);
    setErrors(local.errors);
    if (!local.value) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/contributions/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, website: honeypot }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        errors?: Errors;
        message?: string;
      } | null;

      if (res.ok && data?.ok) {
        const el = elements.find((x) => x.symbol === local.value?.element);
        setSubmitted(el ? `${el.name} (${el.symbol})` : input.element);
        setInput(EMPTY_INPUT);
        setErrors({});
      } else if (data?.errors) {
        setErrors(data.errors);
        setFormError(data.message ?? 'Fix the highlighted fields.');
      } else {
        setFormError(
          data?.message ??
            'The inbox did not accept the submission. Try again, or use the GitHub template.',
        );
      }
    } catch {
      setFormError(
        'Could not reach the inbox. Check your connection, or use the GitHub template.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Submit a price observation" eyebrow="Contribute">
      {submitted ? (
        <Callout tone="info" title="In the review queue" className="mb-4">
          Your {submitted} observation is queued for maintainer review. Nothing
          publishes automatically: accepted observations are merged into the
          open dataset as a reviewed change.
        </Callout>
      ) : null}
      {formError ? (
        <Callout tone="warning" title="Not submitted" className="mb-4">
          {formError}{' '}
          <a
            href={GITHUB_TEMPLATE}
            target="_blank"
            rel="noopener"
            className="font-medium underline decoration-dotted underline-offset-2"
          >
            GitHub template →
          </a>
        </Callout>
      ) : null}

      <form onSubmit={onSubmit} aria-label="Price contribution" className="space-y-4">
        {/* Honeypot: hidden from humans, dropped server-side when filled. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="pc-website">Website</label>
          <input
            id="pc-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Element ------------------------------------------------------- */}
        <div>
          <label htmlFor="pc-element" className={LABEL}>
            Element <span className="text-down">*</span>
          </label>
          <select
            id="pc-element"
            required
            value={input.element}
            onChange={(e) => set('element')(e.target.value)}
            aria-invalid={!!errors.element}
            aria-describedby={errors.element ? 'pc-element-error' : undefined}
            className={fieldClass(!!errors.element)}
          >
            <option value="">Select an element…</option>
            {elements.map((el) => (
              <option key={el.symbol} value={el.symbol}>
                {el.symbol} · {el.name}
              </option>
            ))}
          </select>
          {errors.element ? (
            <p id="pc-element-error" role="alert" className="mt-1 text-xs text-down">
              {errors.element}
            </p>
          ) : null}
        </div>

        {/* Form + purity -------------------------------------------------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc-form" className={LABEL}>
              Form <span className="text-down">*</span>
            </label>
            <input
              id="pc-form"
              type="text"
              required
              list="pc-form-options"
              value={input.form}
              onChange={(e) => set('form')(e.target.value)}
              placeholder="e.g. oxide"
              autoComplete="off"
              aria-invalid={!!errors.form}
              aria-describedby={errors.form ? 'pc-form-error' : undefined}
              className={fieldClass(!!errors.form)}
            />
            <datalist id="pc-form-options">
              {knownForms.map((f) => (
                <option key={f} value={f}>
                  {capitalize(f)}
                </option>
              ))}
            </datalist>
            {errors.form ? (
              <p id="pc-form-error" role="alert" className="mt-1 text-xs text-down">
                {errors.form}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="pc-purity" className={LABEL}>
              Purity
            </label>
            <input
              id="pc-purity"
              type="text"
              value={input.purity}
              onChange={(e) => set('purity')(e.target.value)}
              placeholder="e.g. 99.9%"
              autoComplete="off"
              aria-invalid={!!errors.purity}
              aria-describedby={errors.purity ? 'pc-purity-error' : undefined}
              className={fieldClass(!!errors.purity)}
            />
            {errors.purity ? (
              <p id="pc-purity-error" role="alert" className="mt-1 text-xs text-down">
                {errors.purity}
              </p>
            ) : null}
          </div>
        </div>

        {/* Price + currency + unit ---------------------------------------- */}
        <div>
          <label htmlFor="pc-price" className={LABEL}>
            Observed price <span className="text-down">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="pc-price"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              required
              value={input.price}
              onChange={(e) => set('price')(e.target.value)}
              placeholder="e.g. 60"
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? 'pc-price-error' : 'pc-price-hint'}
              className={`${fieldClass(!!errors.price)} flex-1`}
            />
            <label htmlFor="pc-currency" className="sr-only">
              Currency
            </label>
            <input
              id="pc-currency"
              type="text"
              maxLength={3}
              value={input.currency}
              onChange={(e) => set('currency')(e.target.value.toUpperCase())}
              aria-invalid={!!errors.currency}
              aria-label="Currency code"
              className={`${fieldClass(!!errors.currency)} w-20 shrink-0 text-center font-mono uppercase`}
            />
            <label htmlFor="pc-unit" className="sr-only">
              Price unit
            </label>
            <select
              id="pc-unit"
              value={input.unit}
              onChange={(e) => set('unit')(e.target.value)}
              className={`${fieldClass(!!errors.unit)} w-24 shrink-0`}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  per {u}
                </option>
              ))}
            </select>
          </div>
          {errors.price || errors.currency || errors.unit ? (
            <p id="pc-price-error" role="alert" className="mt-1 text-xs text-down">
              {errors.price ?? errors.currency ?? errors.unit}
            </p>
          ) : (
            <p id="pc-price-hint" className={HINT}>
              As quoted, in the seller&rsquo;s currency. Non-USD prices are
              converted at review, never guessed.
            </p>
          )}
        </div>

        {/* Quantity + tier ------------------------------------------------ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc-quantity" className={LABEL}>
              Quantity / MOQ (kg)
            </label>
            <input
              id="pc-quantity"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={input.quantityKg}
              onChange={(e) => set('quantityKg')(e.target.value)}
              placeholder="e.g. 0.1"
              aria-invalid={!!errors.quantityKg}
              aria-describedby={
                errors.quantityKg ? 'pc-quantity-error' : undefined
              }
              className={fieldClass(!!errors.quantityKg)}
            />
            {errors.quantityKg ? (
              <p id="pc-quantity-error" role="alert" className="mt-1 text-xs text-down">
                {errors.quantityKg}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="pc-tier" className={LABEL}>
              Market tier <span className="text-down">*</span>
            </label>
            <select
              id="pc-tier"
              value={input.tier}
              onChange={(e) => set('tier')(e.target.value)}
              aria-invalid={!!errors.tier}
              className={fieldClass(!!errors.tier)}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source --------------------------------------------------------- */}
        <div>
          <label htmlFor="pc-source" className={LABEL}>
            Source (seller or publisher) <span className="text-down">*</span>
          </label>
          <input
            id="pc-source"
            type="text"
            required
            value={input.sourceName}
            onChange={(e) => set('sourceName')(e.target.value)}
            placeholder="e.g. Stanford Advanced Materials"
            autoComplete="off"
            aria-invalid={!!errors.sourceName}
            aria-describedby={
              errors.sourceName ? 'pc-source-error' : 'pc-source-hint'
            }
            className={fieldClass(!!errors.sourceName)}
          />
          {errors.sourceName ? (
            <p id="pc-source-error" role="alert" className="mt-1 text-xs text-down">
              {errors.sourceName}
            </p>
          ) : (
            <p id="pc-source-hint" className={HINT}>
              Something a reviewer can open and check. Anonymous listings are
              excluded.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="pc-url" className={LABEL}>
            Source URL
          </label>
          <input
            id="pc-url"
            type="url"
            value={input.sourceUrl}
            onChange={(e) => set('sourceUrl')(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
            aria-invalid={!!errors.sourceUrl}
            aria-describedby={errors.sourceUrl ? 'pc-url-error' : undefined}
            className={fieldClass(!!errors.sourceUrl)}
          />
          {errors.sourceUrl ? (
            <p id="pc-url-error" role="alert" className="mt-1 text-xs text-down">
              {errors.sourceUrl}
            </p>
          ) : null}
        </div>

        {/* Observed date + attribution ------------------------------------ */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc-date" className={LABEL}>
              Date observed <span className="text-down">*</span>
            </label>
            <input
              id="pc-date"
              type="date"
              required
              value={input.observedDate}
              onChange={(e) => set('observedDate')(e.target.value)}
              aria-invalid={!!errors.observedDate}
              aria-describedby={
                errors.observedDate ? 'pc-date-error' : 'pc-date-hint'
              }
              className={fieldClass(!!errors.observedDate)}
            />
            {errors.observedDate ? (
              <p id="pc-date-error" role="alert" className="mt-1 text-xs text-down">
                {errors.observedDate}
              </p>
            ) : (
              <p id="pc-date-hint" className={HINT}>
                The date you saw the price.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="pc-by" className={LABEL}>
              Your name or handle
            </label>
            <input
              id="pc-by"
              type="text"
              value={input.submittedBy}
              onChange={(e) => set('submittedBy')(e.target.value)}
              placeholder="Optional, for attribution"
              autoComplete="off"
              aria-invalid={!!errors.submittedBy}
              aria-describedby={errors.submittedBy ? 'pc-by-error' : undefined}
              className={fieldClass(!!errors.submittedBy)}
            />
            {errors.submittedBy ? (
              <p id="pc-by-error" role="alert" className="mt-1 text-xs text-down">
                {errors.submittedBy}
              </p>
            ) : null}
          </div>
        </div>

        {/* Notes ----------------------------------------------------------- */}
        <div>
          <label htmlFor="pc-notes" className={LABEL}>
            Notes
          </label>
          <textarea
            id="pc-notes"
            rows={2}
            value={input.notes}
            onChange={(e) => set('notes')(e.target.value)}
            placeholder="Optional context for the reviewer (shipping terms, MOQ details, ...)"
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? 'pc-notes-error' : undefined}
            className={fieldClass(!!errors.notes)}
          />
          {errors.notes ? (
            <p id="pc-notes-error" role="alert" className="mt-1 text-xs text-down">
              {errors.notes}
            </p>
          ) : null}
        </div>

        {/* Actions ---------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        </div>
        <p className="text-2xs leading-relaxed text-fg-dim">
          No account needed. Submissions are public review-queue entries: do not
          include private contact details, and a missing field is better than a
          guessed one.
        </p>
      </form>
    </Panel>
  );
}
