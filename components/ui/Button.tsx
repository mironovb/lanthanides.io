/**
 * Button & LinkButton: the action primitives. Same visual language; `Button`
 * is a native <button>, `LinkButton` is a Next <Link> styled identically (use
 * it for navigation, never a button with an onClick that routes).
 *
 * Variants are restrained: one `primary` (the teal accent), a bordered
 * `secondary`, a chromeless `ghost`, and `danger`. Sharp corners, fast hover,
 * and the global focus-visible outline (no custom ring) keep keyboard users
 * covered. `primary` uses near-black text (`text-base`) for AA contrast on teal.
 */
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border-accent bg-accent text-base hover:border-accent-strong hover:bg-accent-strong',
  secondary:
    'border-border-strong bg-surface text-fg hover:border-accent hover:text-accent-strong',
  ghost:
    'border-transparent bg-transparent text-fg-muted hover:bg-overlay hover:text-fg',
  danger: 'border-down/40 bg-down/10 text-down hover:bg-down/20',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
};

export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-sm border font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props} />
  );
}

export interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
