/**
 * PageHeader. The standard interior-page masthead: breadcrumb trail, an
 * optional mono eyebrow, the serif H1, an optional lead paragraph, and an
 * optional right-aligned actions slot (e.g. a feed link). Replaces the
 * hand-rolled `<nav aria-label="Breadcrumb"> + <h1> + intro` block that every
 * page (Prompts 6 to 8) copied with slight drift, so headings, spacing rhythm, and
 * the lead measure are identical site-wide (Prompt 12).
 *
 * Server component. The visual breadcrumb is presentational; machine-readable
 * BreadcrumbList JSON-LD is emitted separately by each page.
 */
import { Breadcrumbs, type Crumb } from '@/components/ui';

export function PageHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  actions,
  children,
}: {
  /** Breadcrumb trail; the last item is the current page. */
  crumbs?: Crumb[];
  /** Mono uppercase kicker above the title. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Lead paragraph (rendered at the `md` lead size, constrained to the prose measure). */
  lead?: React.ReactNode;
  /** Right-aligned controls (feed link, count). Sits beside the title block on wide screens. */
  actions?: React.ReactNode;
  /** Extra content rendered below the lead, still inside the header rule. */
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border-strong pb-6">
      {crumbs && crumbs.length > 0 ? (
        <Breadcrumbs items={crumbs} className="mb-5" />
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-prose">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="font-serif text-3xl font-semibold leading-tight text-fg">
            {title}
          </h1>
          {lead ? (
            <p className="mt-3 text-md leading-relaxed text-fg-muted">{lead}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </header>
  );
}
