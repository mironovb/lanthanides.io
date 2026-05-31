/**
 * ComingSoon — the shared placeholder for routes that are part of the IA but not
 * yet built (the Tools/Sell/Offers/Alerts commercial layer and the market
 * dashboard, which land in later prompts). The nav links here rather than to a
 * 404, so the information architecture reads complete today; each later prompt
 * replaces this page body with the real surface.
 *
 * Honest by construction: it states plainly that the feature is in development
 * (no fabricated launch date — CLAUDE.md hard rule #1) and routes the reader to
 * the live surfaces they can use right now.
 *
 * Server component.
 */
import { Container } from './Container';
import { PageHeader } from './PageHeader';
import { Callout, Chip, LinkButton } from '@/components/ui';

export interface ComingSoonProps {
  /** Breadcrumb label for the current page (kept short for the trail). */
  crumb: string;
  eyebrow: string;
  title: string;
  lead: string;
  /** What this surface will do once it ships. */
  bullets: React.ReactNode[];
  /** Live surfaces to use in the meantime. */
  related: { label: string; href: string; primary?: boolean }[];
  /** Honest, date-free note on where this sits in the build. */
  note?: React.ReactNode;
}

export function ComingSoon({
  crumb,
  eyebrow,
  title,
  lead,
  bullets,
  related,
  note,
}: ComingSoonProps) {
  return (
    <Container as="main" className="py-10">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: crumb }]}
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        actions={<Chip>In development</Chip>}
      />

      <Callout tone="info" title="Coming in this build" className="mt-10">
        <p className="leading-relaxed">When it ships, this surface will:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        {note ? (
          <p className="mt-3 leading-relaxed text-fg-dim">{note}</p>
        ) : null}
      </Callout>

      <section className="mt-10">
        <p className="eyebrow">Use now</p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          The open reference is live today and stays free and open. Start here:
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {related.map((r) => (
            <LinkButton
              key={r.href}
              href={r.href}
              variant={r.primary ? 'primary' : 'secondary'}
            >
              {r.label}
            </LinkButton>
          ))}
        </div>
      </section>
    </Container>
  );
}
