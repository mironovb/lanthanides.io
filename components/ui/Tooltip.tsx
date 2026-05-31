'use client';

/**
 * Tooltip — a small hover/focus popover for definitions and caveats (e.g.
 * explaining "normalized USD/kg" or a confidence score). Accessible: the
 * trigger is focusable and `aria-describedby` the tooltip; it opens on hover
 * AND keyboard focus, and Escape dismisses it. Content must be supplementary —
 * never hide essential information here.
 */
import { useId, useState } from 'react';
import { cn } from './cn';

export function Tooltip({
  children,
  label,
  side = 'top',
  className,
}: {
  /** The trigger (made focusable so keyboard users can reach the tip). */
  children: React.ReactNode;
  label: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="cursor-help underline decoration-dotted decoration-fg-dim underline-offset-2"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          'absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 border border-border-strong bg-overlay px-2 py-1 text-2xs leading-snug text-fg shadow-none',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}
