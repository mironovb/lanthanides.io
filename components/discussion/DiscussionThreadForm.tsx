'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, Panel } from '@/components/ui';
import {
  DISCUSSION_CATEGORIES,
  EMPTY_THREAD_VALUES,
  SOURCE_TIP_CATEGORY,
  type CreateThreadResponse,
  type ThreadField,
  type ThreadValues,
  validateThread,
} from './discussion';

/** A catalog element offered in the reference-link element picker. */
export interface ThreadFormElement {
  symbol: string;
  name: string;
}

/** A regulatory control notice offered in the reference-link notice picker. */
export interface ThreadFormNotice {
  id: string;
  label: string;
}

const FIELD =
  'w-full rounded-sm border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';
const HINT = 'mt-1 text-2xs leading-relaxed text-fg-dim';

function fieldClass(hasError: boolean): string {
  return `${FIELD} ${hasError ? 'border-down' : 'border-border-field focus-visible:border-accent'}`;
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-2xs leading-relaxed text-down">
      {msg}
    </p>
  );
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function DiscussionThreadForm({
  elements = [],
  notices = [],
  requireApproval = false,
}: {
  /** The live element catalog, used to populate + validate the element picker. */
  elements?: ThreadFormElement[];
  /** The live regulatory notices, used to populate + validate the notice picker. */
  notices?: ThreadFormNotice[];
  /**
   * Mirrors the server's pre-moderation mode (DISCUSSION_REQUIRE_APPROVAL) so the
   * copy matches reality. The created thread's returned status is still the
   * authority for whether it was held.
   */
  requireApproval?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ThreadValues>(EMPTY_THREAD_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ThreadField, string>>
  >({});
  const [status, setStatus] = useState<Status>('idle');
  const [held, setHeld] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = status === 'submitting';
  const isSourceTip = values.category === SOURCE_TIP_CATEGORY;
  const elementSymbols = elements.map((e) => e.symbol);
  const noticeIds = notices.map((n) => n.id);

  function set<K extends ThreadField>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateThread(values, { elementSymbols, noticeIds });
    setFieldErrors(v.fieldErrors);
    if (!v.clean) {
      setStatus('error');
      setFormError('Please fix the highlighted fields and resubmit.');
      return;
    }

    setStatus('submitting');
    setFormError(null);
    try {
      const res = await fetch('/api/discussion/threads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || (data as { ok?: boolean }).ok !== true) {
        const err = data as { error?: string; fieldErrors?: typeof fieldErrors };
        if (err?.fieldErrors) setFieldErrors(err.fieldErrors);
        setFormError(err?.error ?? 'Could not save the thread. Please try again.');
        setStatus('error');
        return;
      }

      const created = data as CreateThreadResponse;
      setFieldErrors({});
      setValues(EMPTY_THREAD_VALUES);
      if (created.thread.status === 'pending') {
        // Held for review: there is no public thread page to land on yet, so stay
        // here and show the "awaiting review" confirmation instead of navigating.
        setHeld(true);
        setStatus('success');
        return;
      }
      setHeld(false);
      setStatus('success');
      router.refresh();
      router.push(`/discussion/${created.thread.id}/`);
    } catch {
      setFormError('Network error. Your thread was not saved. Please try again.');
      setStatus('error');
    }
  }

  return (
    <Panel title="Start a thread" eyebrow="Submission">
      <form onSubmit={onSubmit} aria-label="Create discussion thread" className="space-y-4" noValidate>
        <div>
          <label htmlFor="dt-title" className={LABEL}>
            Title <span className="text-down">*</span>
          </label>
          <input
            id="dt-title"
            name="title"
            type="text"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            disabled={submitting}
            placeholder="Short, specific subject"
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'dt-title-error' : undefined}
            className={fieldClass(!!fieldErrors.title)}
          />
          <FieldError id="dt-title-error" msg={fieldErrors.title} />
        </div>

        <div>
          <label htmlFor="dt-category" className={LABEL}>
            Category <span className="text-down">*</span>
          </label>
          <select
            id="dt-category"
            name="category"
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
            disabled={submitting}
            aria-invalid={!!fieldErrors.category}
            aria-describedby={fieldErrors.category ? 'dt-category-error' : undefined}
            className={fieldClass(!!fieldErrors.category)}
          >
            {DISCUSSION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError id="dt-category-error" msg={fieldErrors.category} />
        </div>

        {/* Reference links: navigational context, valid on any category. */}
        <fieldset className="space-y-3 rounded-sm border border-border p-3">
          <legend className="px-1 text-2xs font-semibold uppercase tracking-caps text-fg-dim">
            Related references
          </legend>
          <p className={HINT}>
            Optional. Point readers at the element or control notice this thread is
            about. These are{' '}
            <span className="text-fg-muted">navigation links to reference pages</span>
            , not dataset edits. Posting here never changes the open dataset.
          </p>

          <div>
            <label htmlFor="dt-element" className={LABEL}>
              Related element
            </label>
            <select
              id="dt-element"
              name="elementSymbol"
              value={values.elementSymbol}
              onChange={(e) => set('elementSymbol', e.target.value)}
              disabled={submitting}
              aria-invalid={!!fieldErrors.elementSymbol}
              aria-describedby={
                fieldErrors.elementSymbol ? 'dt-element-error' : undefined
              }
              className={fieldClass(!!fieldErrors.elementSymbol)}
            >
              <option value="">Select element (optional)</option>
              {elements.map((el) => (
                <option key={el.symbol} value={el.symbol}>
                  {el.symbol} · {el.name}
                </option>
              ))}
            </select>
            <FieldError id="dt-element-error" msg={fieldErrors.elementSymbol} />
          </div>

          {notices.length > 0 ? (
            <div>
              <label htmlFor="dt-notice" className={LABEL}>
                Related control notice
              </label>
              <select
                id="dt-notice"
                name="noticeId"
                value={values.noticeId}
                onChange={(e) => set('noticeId', e.target.value)}
                disabled={submitting}
                aria-invalid={!!fieldErrors.noticeId}
                aria-describedby={
                  fieldErrors.noticeId ? 'dt-notice-error' : undefined
                }
                className={fieldClass(!!fieldErrors.noticeId)}
              >
                <option value="">Select control notice (optional)</option>
                {notices.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <FieldError id="dt-notice-error" msg={fieldErrors.noticeId} />
            </div>
          ) : null}
        </fieldset>

        {isSourceTip ? (
          <fieldset className="space-y-3 rounded-sm border border-border p-3">
            <legend className="px-1 text-2xs font-semibold uppercase tracking-caps text-fg-dim">
              Source tip details
            </legend>
            <p className={HINT}>
              Optional, but they make a tip reviewable. Source tips are{' '}
              <span className="text-fg-muted">leads, not accepted data</span>.
              Nothing here enters the open dataset without source review and a git
              pull request.
            </p>

            <div>
              <label htmlFor="dt-source-url" className={LABEL}>
                Source URL
              </label>
              <input
                id="dt-source-url"
                name="sourceUrl"
                type="url"
                inputMode="url"
                value={values.sourceUrl}
                onChange={(e) => set('sourceUrl', e.target.value)}
                disabled={submitting}
                placeholder="https://example.com/notice.pdf"
                aria-invalid={!!fieldErrors.sourceUrl}
                aria-describedby={
                  fieldErrors.sourceUrl ? 'dt-source-url-error' : 'dt-source-url-hint'
                }
                className={fieldClass(!!fieldErrors.sourceUrl)}
              />
              {fieldErrors.sourceUrl ? (
                <FieldError id="dt-source-url-error" msg={fieldErrors.sourceUrl} />
              ) : (
                <p id="dt-source-url-hint" className={HINT}>
                  Public link only; a reviewer must be able to open it.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="dt-source-date" className={LABEL}>
                Source date
              </label>
              <input
                id="dt-source-date"
                name="sourceDate"
                type="date"
                value={values.sourceDate}
                onChange={(e) => set('sourceDate', e.target.value)}
                disabled={submitting}
                aria-invalid={!!fieldErrors.sourceDate}
                aria-describedby={
                  fieldErrors.sourceDate ? 'dt-source-date-error' : 'dt-source-date-hint'
                }
                className={fieldClass(!!fieldErrors.sourceDate)}
              />
              {fieldErrors.sourceDate ? (
                <FieldError id="dt-source-date-error" msg={fieldErrors.sourceDate} />
              ) : (
                <p id="dt-source-date-hint" className={HINT}>
                  When the source was observed or published.
                </p>
              )}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dt-author" className={LABEL}>
              Name or handle <span className="text-down">*</span>
            </label>
            <input
              id="dt-author"
              name="authorName"
              type="text"
              value={values.authorName}
              onChange={(e) => set('authorName', e.target.value)}
              disabled={submitting}
              autoComplete="name"
              aria-invalid={!!fieldErrors.authorName}
              aria-describedby={
                fieldErrors.authorName ? 'dt-author-error' : undefined
              }
              className={fieldClass(!!fieldErrors.authorName)}
            />
            <FieldError id="dt-author-error" msg={fieldErrors.authorName} />
          </div>
          <div>
            <label htmlFor="dt-organization" className={LABEL}>
              Organization
            </label>
            <input
              id="dt-organization"
              name="organization"
              type="text"
              value={values.organization}
              onChange={(e) => set('organization', e.target.value)}
              disabled={submitting}
              autoComplete="organization"
              aria-invalid={!!fieldErrors.organization}
              aria-describedby={
                fieldErrors.organization ? 'dt-organization-error' : undefined
              }
              className={fieldClass(!!fieldErrors.organization)}
            />
            <FieldError id="dt-organization-error" msg={fieldErrors.organization} />
          </div>
        </div>

        <div>
          <label htmlFor="dt-body" className={LABEL}>
            Note <span className="text-down">*</span>
          </label>
          <textarea
            id="dt-body"
            name="body"
            rows={7}
            value={values.body}
            onChange={(e) => set('body', e.target.value)}
            disabled={submitting}
            placeholder="Include source context, date, form, quantity, or the specific regulatory question."
            aria-invalid={!!fieldErrors.body}
            aria-describedby={fieldErrors.body ? 'dt-body-error' : 'dt-body-hint'}
            className={fieldClass(!!fieldErrors.body)}
          />
          {fieldErrors.body ? (
            <FieldError id="dt-body-error" msg={fieldErrors.body} />
          ) : (
            <p id="dt-body-hint" className={HINT}>
              Public text only. Do not include private contact details.
            </p>
          )}
        </div>

        {formError ? (
          <Callout tone="warning" title="Submission problem">
            {formError}
          </Callout>
        ) : null}

        {status === 'success' ? (
          <Callout
            tone="success"
            title={held ? 'Thread submitted for review' : 'Thread posted'}
          >
            {held
              ? 'Your thread was received and is awaiting maintainer review. It appears on the board once a maintainer approves it. Nothing was published to the open dataset.'
              : 'Your thread is visible now. Dataset changes still require source review before entering the open files.'}
          </Callout>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className={HINT}>
            {requireApproval
              ? 'New threads are held for maintainer review before they appear.'
              : 'Posts publish immediately; a maintainer may hide or lock them afterward.'}
          </p>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
