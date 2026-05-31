import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/layout';
import { SiteJsonLd } from '@/components/seo';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_TAGLINE_TITLE,
  SITE_URL,
} from '@/lib/seo';

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

/*
 * Site-wide metadata defaults (Prompt 24). The title template + metadataBase
 * apply to every route; the openGraph/twitter/robots/icons/manifest defaults
 * are inherited by any route that doesn't set its own (e.g. not-found). Real
 * pages override the OG/Twitter wholesale via lib/seo.ts `buildMetadata`.
 * `themeColor` lives in the separate `viewport` export (Next 14 requirement).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME.split(' — ')[0]}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: 'lanthanides.io',
  authors: [{ name: 'Bogdan Mironov', url: '/humans.txt' }],
  creator: 'Bogdan Mironov',
  publisher: 'lanthanides.io',
  formatDetection: { telephone: false },
  alternates: {
    types: {
      'application/atom+xml': [
        { url: '/feed.xml', title: `${SITE_NAME} — News` },
        { url: '/movements.xml', title: `${SITE_NAME} — Market Movements` },
      ],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/assets/images/favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/images/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/images/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/images/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/assets/images/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/assets/images/site.webmanifest',
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/`,
    siteName: SITE_NAME,
    title: SITE_TAGLINE_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: 'en_US',
    images: [
      { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TAGLINE_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: '#1A5C6B',
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
        <SiteJsonLd />
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
