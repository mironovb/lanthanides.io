/**
 * Home hero — the above-the-fold value proposition (Prompt 13): what this is,
 * who it's for, and why it matters now, with the primary CTAs into the live
 * product surfaces and a "trust at a glance" band. Every figure is passed in
 * from the data layer (app/page.tsx); nothing here is hard-coded or fabricated.
 *
 * CTA routing: the three product "pillars" are previewed below the fold
 * (PillarCards). The hero CTAs deliberately route only to surfaces that exist
 * today — the Regulatory Tracker (the crown jewel), the element directory, and
 * the open dataset. The price-gauge / alerts / marketplace tools are still in
 * development (see components/layout/nav.ts: "the commercial stubs … land in a
 * later prompt") and are presented as forthcoming below, never as dead links.
 *
 * Server component.
 */
import Link from 'next/link';
import { LinkButton } from '@/components/ui';

const INLINE_LINK =
  'text-fg underline decoration-dotted underline-offset-2 transition-colors hover:text-accent-strong';

export interface HeroProps {
  totalElements: number;
  controlled: number;
  announcements: number;
}

const trustPoints = (totalElements: number): { title: string; body: React.ReactNode }[] => [
  {
    title: 'Provenance on every price',
    body: (
      <>
        Each record names a seller, date, quantity, form, and verification
        status — read the{' '}
        <Link href="/methodology/" className={INLINE_LINK}>
          methodology
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Open data, CC BY 4.0',
    body: (
      <>
        Versioned in git — fork it, diff it, audit it, or{' '}
        <Link href="/data/" className={INLINE_LINK}>
          download JSON &amp; CSV
        </Link>
        .
      </>
    ),
  },
  {
    title: 'Monitored every six hours',
    body: (
      <>
        An automated pipeline polls Chinese-government sources and fires Telegram
        alerts on significant announcements. Public alert subscriptions are in
        development.
      </>
    ),
  },
];

export function Hero({ totalElements, controlled, announcements }: HeroProps) {
  return (
    <section className="pt-12 sm:pt-16">
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        {/* ── Value proposition + CTAs ──────────────────────────────────── */}
        <div className="max-w-2xl">
          <p className="eyebrow">Strategic Materials Ledger</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.08] tracking-tightish text-fg sm:text-5xl">
            Sourced prices and export-control intelligence for rare earths and
            strategic metals.
          </h1>
          <p className="mt-5 text-md leading-relaxed text-fg-muted">
            An open reference covering {totalElements} rare-earth and
            strategic-metal elements — every price tied to a named seller, date,
            and quantity, alongside a primary-sourced record of the Chinese
            export-control announcements that govern them. Built for the
            procurement officers, researchers, and investors who need to know
            what a material costs and whether it can legally move.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/regulatory/" variant="primary">
              Open the regulatory tracker →
            </LinkButton>
            <LinkButton href="/elements/">
              Browse {totalElements} elements
            </LinkButton>
            <LinkButton href="/data/" variant="ghost">
              Get the open data
            </LinkButton>
          </div>
        </div>

        {/* ── Why now ───────────────────────────────────────────────────── */}
        <aside className="border border-border border-l-2 border-l-accent bg-surface p-5 lg:mt-1">
          <p className="eyebrow text-accent-strong">Why now</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Rare earths and a handful of strategic metals sit at the fault line of
            US–China decoupling — indispensable to magnets, semiconductors, and
            defense systems, with highly concentrated supply. Since gallium and
            germanium in July 2023, China&rsquo;s MOFCOM has issued{' '}
            <span className="font-mono tabular-nums text-fg">{announcements}</span>{' '}
            successive export-control announcements, now reaching{' '}
            <span className="font-mono tabular-nums text-fg">{controlled}</span> of
            the {totalElements} elements tracked here — some suspended into late
            2026, the rest gated behind case-by-case export licences. A single
            notice can reprice or halt a supply line overnight.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            This is the ledger that tracks it — dated, sourced, and cited to the
            original announcement.
          </p>
        </aside>
      </div>

      {/* ── Trust at a glance ───────────────────────────────────────────── */}
      <ul className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-3">
        {trustPoints(totalElements).map((t) => (
          <li key={t.title} className="bg-surface p-4">
            <p className="font-medium text-fg">{t.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
