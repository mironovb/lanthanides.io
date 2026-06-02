import type { Config } from 'tailwindcss';

/**
 * Design tokens — the lanthanides.io "Strategic Materials Ledger" system.
 *
 * LIGHT MODE — a clean white "print intelligence brief" matching the last
 * deployed static (Jekyll) site (`_sass/_variables.scss`): white surfaces,
 * near-black text, a single disciplined deep-teal accent (#1A5C6B), saturated
 * category hues, and monospace tabular numerics. Color ONLY ever encodes
 * meaning — price movement (up/down/flat), regulatory status
 * (restricted/monitored/normal/active/suspended), and the four element
 * categories. There is no decorative color anywhere in the system.
 *
 * ── History (read before touching colors) ───────────────────────────────────
 * The migration first shipped a DARK instrument-panel theme; this is the
 * light-mode flip the design system was built for. Because every component
 * references tokens by SEMANTIC name (`surface`, `fg`, `accent`, `risk-*`,
 * `category-*`) and never a literal color, the switch is a token-value edit, not
 * a utility-class rewrite (docs/DESIGN-SYSTEM.md §"Theme & the light-mode path").
 *
 * A few static-site values were darkened to meet WCAG AA (the project's Prompt-23
 * commitment, docs/QA.md): dim text, the suspended gray, the amber/gold used for
 * text, and the form-field border — each kept in-family, just contrast-safe.
 *
 * NOTE: tokens are hex (not `rgb(var() / <alpha-value>)`) on purpose. The
 * markdown/prose stylesheets (the `*-body.css` files) resolve these via the
 * PostCSS `theme()` function, which cannot expand the `<alpha-value>`
 * placeholder; hex keeps BOTH `theme()` and Tailwind `/opacity` modifiers valid.
 *
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
        // ── Surfaces — white page & cards; faint grays for raised/hover. ──
        base: '#ffffff', // page background
        surface: '#ffffff', // panels / cards (separated by border + subtle shadow)
        raised: '#f8f9fa', // table headers, raised strips
        overlay: '#e9ecef', // popovers / hovered rows / tooltips
        border: {
          DEFAULT: '#dee2e6', // hairline dividers, default panel edge
          strong: '#ced4da', // emphasized edge, separators, sort glyphs
          // Form-control boundary. ≥3:1 against the white field fill so inputs
          // meet WCAG 1.4.11 (non-text contrast); the lighter `border`/
          // `border-strong` stay for decorative hairlines (which 1.4.11 exempts).
          // Darkened from the static site's #ADB5BD (1.6:1, failed). See docs/QA.md.
          field: '#868d95',
        },
        // ── Foreground text — three deliberate steps of emphasis (all AA). ──
        fg: {
          DEFAULT: '#1a1a1a', // primary text / numerics (near-black)
          muted: '#4a4e54', // body, secondary text — ~8.7:1 on white
          // Labels, captions, fine print, table headers, eyebrows. Darkened from
          // the static #999 (2.8:1, failed) to clear AA on white/raised/overlay.
          dim: '#5a616a', // ~5.9:1 white · ~5.0:1 overlay
        },
        // ── The one restrained accent (deep brand teal #1A5C6B). ──
        accent: {
          DEFAULT: '#1a5c6b', // links, active state, focus ring
          strong: '#14505d', // hover / emphasis (≈ darken 10%)
          dim: '#d4eaf0', // accent tint (selection, active row wash)
        },
        // ── Price-movement semantics (financial up / down / flat). ──
        up: '#2e7a4e', // gain — green (AA on white)
        down: '#b5342b', // loss — red
        neutral: '#6c757d', // flat — gray
        flat: '#6c757d', // alias of `neutral` for the up/down/flat trio
        // ── Regulatory-status semantics (green / amber / red / gray). ──
        // The five named states map onto this 4-stop scale (Badge resolves them):
        //   normal → low · monitored/active → medium · restricted → high · suspended.
        // Green-for-clear matches the static site (reg-none = green); amber and
        // suspended gray are darkened from the static gold/#888 to clear AA.
        risk: {
          low: '#2e7a4e', // normal / clear — green
          medium: '#9a6b00', // export-controlled / active licence — dark gold
          high: '#b5342b', // restricted / presumptive denial — red
          suspended: '#6b7178', // suspended — gray (AA)
        },
        // ── Element-category accents (static palette, all AA on white). ──
        category: {
          'ree-light': '#2563eb', // azure — light rare earth
          'ree-heavy': '#7c3aed', // violet — heavy rare earth
          strategic: '#b45309', // copper — strategic metal
          semiconductor: '#047857', // emerald — semiconductor metal
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        // The static site unified headings onto Inter too; --font-serif is
        // mapped to --font-sans in globals.css, so "serif" classes render Inter
        // without churning every heading's class name.
        serif: ['var(--font-serif)'],
      },
      // ── Type scale — comfortable 16px base (static site), serif/sans display. ──
      // Mirrors the static `_variables.scss` ramp: 11/12/14/16/17 → 20/24/30/38/48.
      // Numerics always render in the mono family + tabular.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }], // 11px — badges, eyebrows, fine print
        xs: ['0.75rem', { lineHeight: '1.05rem' }], // 12px — table headers, mono meta
        sm: ['0.875rem', { lineHeight: '1.35rem' }], // 14px — nav, captions, compact body
        base: ['1rem', { lineHeight: '1.55rem' }], // 16px — body
        md: ['1.0625rem', { lineHeight: '1.7rem' }], // 17px — lead paragraphs, prose
        lg: ['1.25rem', { lineHeight: '1.6rem' }], // 20px — h3, card titles
        xl: ['1.5rem', { lineHeight: '1.85rem' }], // 24px — h2, section headings
        '2xl': ['1.875rem', { lineHeight: '2.2rem' }], // 30px — h1, article titles
        '3xl': ['2.375rem', { lineHeight: '2.6rem' }], // 38px — page hero titles
        '4xl': ['3rem', { lineHeight: '1.1' }], // 48px — display
        '5xl': ['3.5rem', { lineHeight: '1.05' }], // 56px — large hero
      },
      // Soft, restrained corners (static site: 2/3/4/6px) — gentle, not SaaS-round.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
        md: '3px',
        lg: '4px',
        xl: '6px',
      },
      // Subtle elevation to match the static white cards (borders still carry most
      // of the separation; shadows are barely-there, never dramatic).
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.06)',
        md: '0 1px 4px rgba(0, 0, 0, 0.06)',
        lg: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      maxWidth: {
        content: '75rem', // page column (static $content-width 1200px ≈ 75rem)
        prose: '46rem', // reading measure for long-form prose
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
      },
      letterSpacing: {
        tightish: '-0.01em', // headings
        caps: '0.08em', // uppercase table headers / chip labels
        eyebrow: '0.2em', // the mono uppercase eyebrow label convention
      },
      // Subtle, fast hover transitions only (no entrance/decorative animation).
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
