'use client';

/**
 * PriceGaugeForm: the gauge's input island. It is a plain `method="get"` form
 * that submits back to /tools/price-gauge/, so it works with NO JavaScript
 * (the server reads the query, runs the engine, and re-renders the result). The
 * only thing JS adds is progressive enhancement: narrowing the Form select to
 * the forms the chosen element is actually quoted in, and a live record-count
 * hint, exactly the "constrain to forms present where possible" requirement.
 *
 * Accessibility: every control has an associated <label>; validation messages
 * are wired with `aria-invalid` + `aria-describedby` and announced via
 * `role="alert"`; the field/error markup is identical between SSR and client so
 * keyboard and screen-reader users get the same experience without JS.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Button, Panel } from '@/components/ui';
import { capitalize } from '@/lib/format';
import {
  type ElementOption,
  type GaugeField,
  type GaugeValues,
  TIER_OPTIONS,
  UNITS,
  type UnitValue,
} from './gauge';

const FIELD =
  'w-full rounded-sm border bg-base px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';
const HINT = 'mt-1 text-2xs leading-relaxed text-fg-dim';

function fieldClass(hasError: boolean): string {
  // `border-field` is the ≥3:1 control boundary (WCAG 1.4.11); error state swaps
  // to the semantic red, focus to the accent.
  return `${FIELD} ${hasError ? 'border-down' : 'border-border-field focus-visible:border-accent'}`;
}

export function PriceGaugeForm({
  options,
  forms,
  values,
  fieldErrors,
}: {
  options: ElementOption[];
  /** Every form present in the dataset (lower-case), the no-JS fallback list. */
  forms: string[];
  values: GaugeValues;
  fieldErrors: Partial<Record<GaugeField, string>>;
}) {
  const [symbol, setSymbol] = useState(values.symbol);
  const [form, setForm] = useState(values.form);
  const [purity, setPurity] = useState(values.purity);
  const [quantity, setQuantity] = useState(values.quantity);
  const [unit, setUnit] = useState<UnitValue>(values.unit);
  const [tier, setTier] = useState(values.tier);

  const current = options.find((o) => o.symbol === symbol) ?? null;
  // With JS, constrain to the element's own forms; without a selection (or a
  // pre-JS render with no element) fall back to the full dataset form list.
  const formChoices = current ? current.forms : forms;

  function onSymbol(next: string) {
    setSymbol(next);
    const allowed = options.find((o) => o.symbol === next)?.forms ?? [];
    if (form && !allowed.includes(form)) setForm(''); // reset stale form choice
  }

  return (
    <Panel title="Gauge a price" eyebrow="Inputs">
      <form
        method="get"
        action="/tools/price-gauge/"
        aria-label="Price gauge inputs"
        className="space-y-4"
      >
        {/* Element ------------------------------------------------------- */}
        <div>
          <label htmlFor="pg-symbol" className={LABEL}>
            Element <span className="text-down">*</span>
          </label>
          <select
            id="pg-symbol"
            name="symbol"
            required
            value={symbol}
            onChange={(e) => onSymbol(e.target.value)}
            aria-invalid={!!fieldErrors.symbol}
            aria-describedby={
              fieldErrors.symbol ? 'pg-symbol-error' : 'pg-symbol-hint'
            }
            className={fieldClass(!!fieldErrors.symbol)}
          >
            <option value="">Select an element…</option>
            {options.map((o) => (
              <option key={o.symbol} value={o.symbol}>
                {o.symbol} · {o.name}
              </option>
            ))}
          </select>
          {fieldErrors.symbol ? (
            <p id="pg-symbol-error" role="alert" className="mt-1 text-xs text-down">
              {fieldErrors.symbol}
            </p>
          ) : (
            <p id="pg-symbol-hint" className={HINT}>
              {current
                ? current.total > 0
                  ? `${current.retail} retail · ${current.bulk} bulk record${current.bulk === 1 ? '' : 's'} on file for ${current.name}.`
                  : `No price records on file yet for ${current.name}.`
                : 'All 31 rare-earth and strategic-metal elements.'}
            </p>
          )}
        </div>

        {/* Form --------------------------------------------------------- */}
        <div>
          <label htmlFor="pg-form" className={LABEL}>
            Form
          </label>
          <select
            id="pg-form"
            name="form"
            value={form}
            onChange={(e) => setForm(e.target.value)}
            aria-invalid={!!fieldErrors.form}
            aria-describedby={fieldErrors.form ? 'pg-form-error' : 'pg-form-hint'}
            className={fieldClass(!!fieldErrors.form)}
          >
            <option value="">Any form</option>
            {formChoices.map((f) => (
              <option key={f} value={f}>
                {capitalize(f)}
              </option>
            ))}
          </select>
          {fieldErrors.form ? (
            <p id="pg-form-error" role="alert" className="mt-1 text-xs text-down">
              {fieldErrors.form}
            </p>
          ) : (
            <p id="pg-form-hint" className={HINT}>
              {current && current.forms.length > 0
                ? `Quoted in: ${current.forms.map(capitalize).join(', ')}.`
                : 'Leave on “Any form” to estimate across every form in the tier.'}
            </p>
          )}
        </div>

        {/* Purity ------------------------------------------------------- */}
        <div>
          <label htmlFor="pg-purity" className={LABEL}>
            Purity
          </label>
          <input
            id="pg-purity"
            name="purity"
            type="text"
            inputMode="decimal"
            value={purity}
            onChange={(e) => setPurity(e.target.value)}
            placeholder="e.g. 99.9%"
            autoComplete="off"
            aria-describedby="pg-purity-hint"
            className={fieldClass(false)}
          />
          <p id="pg-purity-hint" className={HINT}>
            Optional. Soft-weights the estimate toward like-purity records; it
            never adds a fabricated purity premium.
          </p>
        </div>

        {/* Quantity + unit --------------------------------------------- */}
        <div>
          <label htmlFor="pg-quantity" className={LABEL}>
            Quantity
          </label>
          <div className="flex gap-2">
            <input
              id="pg-quantity"
              name="quantity"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5"
              aria-invalid={!!fieldErrors.quantity}
              aria-describedby={
                fieldErrors.quantity ? 'pg-quantity-error' : 'pg-quantity-hint'
              }
              className={`${fieldClass(!!fieldErrors.quantity)} flex-1`}
            />
            <label htmlFor="pg-unit" className="sr-only">
              Quantity unit
            </label>
            <select
              id="pg-unit"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitValue)}
              className={`${fieldClass(false)} w-28 shrink-0`}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.quantity ? (
            <p
              id="pg-quantity-error"
              role="alert"
              className="mt-1 text-xs text-down"
            >
              {fieldErrors.quantity}
            </p>
          ) : (
            <p id="pg-quantity-hint" className={HINT}>
              Sets the tier: under 25 kg → retail, 25 kg and up → bulk. Leave
              blank to default to retail.
            </p>
          )}
        </div>

        {/* Tier override ------------------------------------------------ */}
        <div>
          <label htmlFor="pg-tier" className={LABEL}>
            Tier override
          </label>
          <select
            id="pg-tier"
            name="tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as GaugeValues['tier'])}
            aria-invalid={!!fieldErrors.tier}
            aria-describedby={fieldErrors.tier ? 'pg-tier-error' : 'pg-tier-hint'}
            className={fieldClass(!!fieldErrors.tier)}
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {fieldErrors.tier ? (
            <p id="pg-tier-error" role="alert" className="mt-1 text-xs text-down">
              {fieldErrors.tier}
            </p>
          ) : (
            <p id="pg-tier-hint" className={HINT}>
              Force a band regardless of quantity. Retail and bulk are separate
              markets and are never averaged together.
            </p>
          )}
        </div>

        {/* Actions ------------------------------------------------------ */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary">
            Estimate price
          </Button>
          <Link
            href="/tools/price-gauge/"
            className="text-xs font-medium text-fg-dim transition-colors duration-fast hover:text-fg"
          >
            Reset
          </Link>
        </div>
      </form>
    </Panel>
  );
}
