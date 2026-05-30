import type { Metadata } from 'next';
import './globals.css';

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
        Baseline font setup via Google Fonts (Prompt 3). Kept as plain <link>
        tags so the production build never depends on a build-time font fetch.
        Prompt 5/11 migrates this to self-hosted next/font.
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
      <body className="min-h-screen bg-base text-fg">{children}</body>
    </html>
  );
}
