import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/layout';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.lanthanides.io'),
  title: {
    default: 'lanthanides.io — Strategic Materials Ledger',
    template: '%s · lanthanides.io',
  },
  description:
    'Sourced pricing, supply-chain risk, and regulatory intelligence for rare-earth and strategic materials.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        Font setup via Google Fonts. Kept as plain <link> tags so the build
        never depends on a build-time font fetch (next/font/google would).
        Self-hosting is deferred to a later prompt; the type pairing is wired
        through CSS variables (app/globals.css), so it's a swap, not a rewrite.
      */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Loaded once in the App Router root layout (applies to every route),
            so the pages-router single-page heuristic below is a false positive. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-base text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:border focus:border-accent focus:bg-surface focus:px-3 focus:py-1.5 focus:text-sm focus:text-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
