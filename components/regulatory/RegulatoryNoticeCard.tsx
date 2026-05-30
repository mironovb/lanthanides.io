/**
 * One active-control-regime card — a port of `.reg-notice-card` in
 * legacy/pages/regulatory.html. Shows the notice id, issuing authority, the
 * classified status (export licence / presumptive denial / suspended / country
 * prohibition) with its risk-coloured dot, the affected-element chips (each a
 * link to the element page), the effective date and target, and the suspension
 * expiry when present. Presentational only — no I/O, no state.
 */
import Link from 'next/link';
import type { RegulatoryNotice } from '@/lib/types';
import { classifyNotice, fmtLongDate, NOTICE_STYLE } from './regulatory';

const ELEM_CHIP =
  'rounded-sm border border-border bg-raised px-1.5 py-px font-mono text-2xs font-semibold text-fg-muted transition-colors hover:border-accent hover:text-accent-strong';

export function RegulatoryNoticeCard({ notice }: { notice: RegulatoryNotice }) {
  const kind = classifyNotice(notice);
  const style = NOTICE_STYLE[kind];

  return (
    <div
      className={`flex flex-col border border-l-[3px] border-border ${style.border} bg-surface p-4`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-bold text-fg">
          {notice.notice_id}
        </span>
        <span className="text-2xs font-medium uppercase tracking-wide text-fg-dim">
          {notice.issuing_authority}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}
        >
          {style.label}
        </span>
      </div>

      {notice.affected_elements.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {notice.affected_elements.map((sym) => (
            <Link key={sym} href={`/elements/${sym}/`} className={ELEM_CHIP}>
              {sym}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-dim">
        <span className="font-mono">
          Effective {fmtLongDate(notice.date_effective)}
        </span>
        {notice.target_country && (
          <span className="font-semibold">Target: {notice.target_country}</span>
        )}
      </div>

      {notice.suspension && (
        <div className="mt-2 border-t border-border pt-2 text-xs italic text-fg-muted">
          Suspended until {fmtLongDate(notice.suspension.suspension_expires)}
        </div>
      )}
    </div>
  );
}
