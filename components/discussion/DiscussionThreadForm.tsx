'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, Panel } from '@/components/ui';
import {
  DISCUSSION_CATEGORIES,
  EMPTY_THREAD_VALUES,
  type CreateThreadResponse,
  type ThreadField,
  type ThreadValues,
  validateThread,
} from './discussion';

const FIELD =
  'w-full rounded-sm border bg-base px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-dim transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50';
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

export function DiscussionThreadForm() {
  const router = useRouter();
  const [values, setValues] = useState<ThreadValues>(EMPTY_THREAD_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ThreadField, string>>
  >({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = status === 'submitting';

  function set<K extends ThreadField>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateThread(values);
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
      setStatus('success');
      setFieldErrors({});
      setValues(EMPTY_THREAD_VALUES);
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
          <Callout tone="success" title="Thread posted">
            Your thread is visible now. Dataset changes still require source
            review before entering the open files.
          </Callout>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className={HINT}>Posts publish immediately unless later hidden by a maintainer.</p>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
