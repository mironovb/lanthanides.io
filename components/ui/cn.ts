/**
 * Minimal class-name joiner — filters out falsy values and joins the rest with
 * a space. Lets the base components express conditional classes inline without
 * pulling in `clsx`/`tailwind-merge` (no runtime dependency, no merge magic —
 * the design system never needs to override a Tailwind class with another of
 * the same property, so last-wins merging is unnecessary).
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
