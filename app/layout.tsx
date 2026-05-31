import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/layout';

/*
 * Self-hosted fonts via next/font/google: downloaded and served from our own
 * origin at build time (no runtime request to Google, no render-blocking
 * external stylesheet), subset to `latin`, with `display: swap` and
 * auto-generated size-adjusted fallback metrics so swapping in the web font
 * causes no layout shift. Each exposes a CSS variable consumed by Tailwind's
 * fontFamily (tailwind.config.ts) — the same --font-* seam the prior <link>
 * setup used, so this is a swap, not a rewrite.
 *
 * IBM Plex Sans/Mono ship as static weights (so we enumerate them); Source
 * Serif 4 is a variable font (so weight is omitted to fetch the full axis).
 */
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
  fallback: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Consolas',
    'Liberation Mono',
    'monospace',
  ],
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  fallback: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

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
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-base text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:border focus:border-accent focus:bg-surface focus:px-3 focus:py-1.5 focus:text-sm focus:text-fg"
        >
          Skip to content
        </a>
        <SiteHeader />
        {/* tabIndex=-1 so the skip link reliably moves keyboard focus here
            (a plain div isn't focusable); each page renders its own <main>
            landmark inside. */}
        <div id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
