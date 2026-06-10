'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout, Panel } from '@/components/ui';
import {
  EMPTY_REPLY_VALUES,
  type CreateReplyResponse,
  type ReplyField,
  type ReplyValues,
  validateReply,
} from './discussion';

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

export function DiscussionReplyForm({
  threadId,
  requireApproval = false,
}: {
  threadId: string;
  /**
   * Mirrors the server's pre-moderation mode so the copy matches reality. The
   * created reply's returned status is still the authority for whether it was
   * held.
   */
  requireApproval?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ReplyValues>(EMPTY_REPLY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ReplyField, string>>
  >({});
  const [status, setStatus] = useState<Status>('idle');
  const [held, setHeld] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = status === 'submitting';

  function set<K extends ReplyField>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateReply(values);
    setFieldErrors(v.fieldErrors);
    if (!v.clean) {
      setStatus('error');
      setFormError('Please fix the highlighted fields and resubmit.');
      return;
    }

    setStatus('submitting');
    setFormError(null);
    try {
      const res = await fetch(`/api/discussion/threads/${threadId}/replies/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || (data as { ok?: boolean }).ok !== true) {
        const err = data as { error?: string; fieldErrors?: typeof fieldErrors };
        if (err?.fieldErrors) setFieldErrors(err.fieldErrors);
        setFormError(err?.error ?? 'Could not save the reply. Please try again.');
        setStatus('error');
        return;
      }

      const created = data as CreateReplyResponse;
      const isHeld = created.reply.status === 'pending';
      setValues(EMPTY_REPLY_VALUES);
      setFieldErrors({});
      setHeld(isHeld);
      setStatus('success');
      // A held reply is not visible yet, so refreshing would not surface it.
      if (!isHeld) router.refresh();
    } catch {
      setFormError('Network error. Your reply was not saved. Please try again.');
      setStatus('error');
    }
  }

  return (
    <Panel title="Reply" eyebrow="Thread response">
      <form onSubmit={onSubmit} aria-label="Reply to discussion thread" className="space-y-4" noValidate>
        <div>
          <label htmlFor="dr-author" className={LABEL}>
            Name or handle <span className="text-down">*</span>
          </label>
          <input
            id="dr-author"
            name="authorName"
            type="text"
            value={values.authorName}
            onChange={(e) => set('authorName', e.target.value)}
            disabled={submitting}
            autoComplete="name"
            aria-invalid={!!fieldErrors.authorName}
            aria-describedby={fieldErrors.authorName ? 'dr-author-error' : undefined}
            className={fieldClass(!!fieldErrors.authorName)}
          />
          <FieldError id="dr-author-error" msg={fieldErrors.authorName} />
        </div>

        <div>
          <label htmlFor="dr-body" className={LABEL}>
            Reply <span className="text-down">*</span>
          </label>
          <textarea
            id="dr-body"
            name="body"
            rows={5}
            value={values.body}
            onChange={(e) => set('body', e.target.value)}
            disabled={submitting}
            aria-invalid={!!fieldErrors.body}
            aria-describedby={fieldErrors.body ? 'dr-body-error' : 'dr-body-hint'}
            className={fieldClass(!!fieldErrors.body)}
          />
          {fieldErrors.body ? (
            <FieldError id="dr-body-error" msg={fieldErrors.body} />
          ) : (
            <p id="dr-body-hint" className={HINT}>
              {requireApproval
                ? 'Public text only — replies are held for maintainer review before they appear.'
                : 'Public text only. Factual price claims still need source review.'}
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
            title={held ? 'Reply submitted for review' : 'Reply posted'}
          >
            {held
              ? 'Your reply was received and is awaiting maintainer review. It appears once a maintainer approves it.'
              : 'Your reply is visible now.'}
          </Callout>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post reply'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
