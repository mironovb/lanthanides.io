import type { Config } from 'tailwindcss';

/**
 * Baseline design tokens (Prompt 3) — dense, professional, terminal-adjacent.
 *
 * Understated by design: near-black/graphite surfaces, one restrained accent,
 * and color that only ever encodes meaning (price movement + regulatory risk +
 * element category). Numerics are monospace with tabular figures.
 *
 * NOTE: .impeccable.md specifies a LIGHT-mode brand system (IBM Plex Sans/Mono
 * + Source Serif 4; teal/amber/red risk semantics). These dark baseline tokens
 * are the scaffold; Prompt 11 reconciles them into the full design system.
 * Fonts are exposed as CSS variables in app/globals.css so the type pairing can
 * be swapped (e.g. self-hosted next/font) without touching utility classes.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — near-black page → graphite panels.
        base: '#0b0d10', // page background
        surface: '#14171c', // panels / cards
        raised: '#1a1d23', // raised surface (matches manifest theme_color)
        overlay: '#1f242b', // popovers / hovered rows
        border: {
          DEFAULT: '#262b33',
          strong: '#333b46',
        },
        // Foreground text.
        fg: {
          DEFAULT: '#e6e8eb',
          muted: '#9aa3ad',
          dim: '#6b7178',
        },
        // The one restrained accent (terminal teal, from brand #1A5C6B).
        accent: {
          DEFAULT: '#2f9bb7',
          strong: '#3fb0cd',
          dim: '#16323a',
        },
        // Price-movement semantics (financial up / down / neutral).
        up: '#3fb27f', // gain — green
        down: '#e5564b', // loss — red
        neutral: '#8a929c', // flat — gray
        // Regulatory-risk semantics (teal / amber / red per .impeccable.md).
        risk: {
          low: '#2f9bb7', // normal / monitored — teal
          medium: '#d4a847', // export-controlled — amber
          high: '#e5564b', // restricted / presumptive denial — red
          suspended: '#6b7178', // suspended — gray
        },
        // Element-category accents (carried from legacy/_sass, tuned for dark).
        category: {
          'ree-light': '#4b8bf5', // azure — light rare earth
          'ree-heavy': '#9b6bf0', // violet — heavy rare earth
          strategic: '#cc7a33', // copper — strategic metal
          semiconductor: '#1fae7a', // emerald — semiconductor metal
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        serif: ['var(--font-serif)'],
      },
      // Tight type scale with a small base (density without claustrophobia).
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }], // 11px
        xs: ['0.75rem', { lineHeight: '1.05rem' }], // 12px
        sm: ['0.8125rem', { lineHeight: '1.2rem' }], // 13px (data tables)
        base: ['0.875rem', { lineHeight: '1.45rem' }], // 14px (body)
      },
      // Sharp corners — no rounded SaaS cards (.impeccable.md "no decorative layer").
      borderRadius: {
        none: '0',
        sm: '1px',
        DEFAULT: '2px',
        md: '3px',
      },
      maxWidth: {
        content: '72rem', // page column
        prose: '46rem', // reading measure for long-form prose
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
    },
  },
  plugins: [],
};

export default config;
