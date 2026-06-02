/**
 * 404 page. The Next default renders no <main> landmark; this gives the route a
 * proper main + a single h1 (one-main / one-h1 per page, docs/QA.md), and routes
 * the visitor back to the live surfaces. Plain voice, matching the static site.
 */
import type { Metadata } from 'next';
import { Container } from '@/components/layout';
import { LinkButton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Container as="main" className="flex flex-col items-center py-24 text-center">
      <p className="eyebrow text-accent">Error 404</p>
      <h1 className="mt-3 font-serif text-3xl font-bold tracking-tightish text-fg">
        Page not found
      </h1>
      <p className="mt-3 max-w-prose text-md leading-relaxed text-fg-muted">
        That page does not exist or has moved. The links below cover the data,
        the regulatory tracker, and the rest of the site.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <LinkButton href="/" variant="primary">
          Home
        </LinkButton>
        <LinkButton href="/elements/">Elements &amp; prices</LinkButton>
        <LinkButton href="/regulatory/">Regulatory tracker</LinkButton>
      </div>
    </Container>
  );
}
