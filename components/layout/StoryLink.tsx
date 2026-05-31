/**
 * StoryLink — the one-line cross-link that ties each page to the adjacent step
 * in the product story (Prompt 14). Rendered just under a page's lead (as
 * <PageHeader> children, inside the masthead rule), it tells the reader where
 * this surface leads next — e.g. Elements → "export-control status in the
 * Regulatory Tracker". One consistent treatment site-wide: a leading accent
 * glyph, muted prose, and any nested link auto-styled as an accent link so
 * callers just write `<Link href=…>…</Link>`.
 *
 * Server component (presentational).
 */
export function StoryLink({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 flex items-baseline gap-2 text-sm leading-relaxed text-fg-muted [&_a:hover]:text-accent-strong [&_a]:font-medium [&_a]:text-accent">
      <span aria-hidden="true" className="text-accent-strong">
        ↦
      </span>
      <span>{children}</span>
    </p>
  );
}
