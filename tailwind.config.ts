import type { Config } from 'tailwindcss';

/**
 * Design tokens — the lanthanides.io "Strategic Materials Ledger" system
 * (Prompt 11, formalizing the Prompt 3 baseline).
 *
 * The feel is an instrument panel a procurement officer trusts: dense, legible,
 * understated. Graphite/near-black surfaces, a single disciplined teal accent,
 * sharp corners, subtle borders over heavy shadows, and monospace tabular
 * numerics. Color ONLY ever encodes meaning — price movement (up/down/flat),
 * regulatory status (restricted/monitored/normal/active/suspended), and the
 * four element categories. There is no decorative color anywhere in the system.
 *
 * ── Theme reconciliation (read before touching colors) ──────────────────────
 * `.impeccable.md` describes a future LIGHT-mode brand ("a well-designed print
 * intelligence brief"). The system shipped here is the dark instrument-panel
 * theme that every page (Prompts 6–10) already composes from. Tokens are kept
 * strictly semantic by name (`surface`, `fg`, `accent`, `risk-*`, `category-*`)
 * so the eventual light switch is a token-value edit, never a utility-class
 * rewrite — see docs/DESIGN-SYSTEM.md §"Theme & the light-mode path".
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
        // ── Surfaces — near-black page → graphite panels → hovered rows. ──
        base: '#0b0d10', // page background
        surface: '#14171c', // panels / cards
        raised: '#1a1d23', // raised surface, table headers
        overlay: '#1f242b', // popovers / hovered rows / tooltips
        border: {
          DEFAULT: '#262b33', // hairline dividers, default panel edge
          strong: '#333b46', // emphasized edge, separators, sort glyphs
          // Form-control boundary. ≥3:1 against both the field fill (`base`) and
          // the enclosing panel (`surface`) so inputs meet WCAG 1.4.11 (non-text
          // contrast); the lighter `border`/`border-strong` stay for decorative
          // hairline dividers (which 1.4.11 exempts). See docs/QA.md.
          field: '#606b7b',
        },
        // ── Foreground text — three deliberate steps of emphasis. ──
        fg: {
          DEFAULT: '#e6e8eb', // primary text / numerics
          muted: '#9aa3ad', // body, secondary text
          // Labels, captions, fine print, table headers, eyebrows. Lightened
          // from #6b7178 so it clears WCAG AA (4.5:1) for normal text on base/
          // surface/raised (5.5 / 5.1 / 4.8); the old value failed at 3.4–4.0.
          dim: '#828993',
        },
        // ── The one restrained accent (terminal teal, from brand #1A5C6B). ──
        accent: {
          DEFAULT: '#2f9bb7', // links, active state, focus ring
          strong: '#3fb0cd', // hover / emphasis
          dim: '#16323a', // accent tint (selection, active row wash)
        },
        // ── Price-movement semantics (financial up / down / flat). ──
        up: '#3fb27f', // gain — green
        down: '#e5564b', // loss — red
        neutral: '#8a929c', // flat — gray
        flat: '#8a929c', // alias of `neutral` for the up/down/flat trio
        // ── Regulatory-status semantics (teal / amber / red / gray). ──
        // The five named states map onto this 4-stop scale (Badge resolves them):
        //   normal → low · monitored/active → medium · restricted → high · suspended.
        risk: {
          low: '#2f9bb7', // normal / monitored baseline — teal
          medium: '#d4a847', // export-controlled / active licence — amber
          high: '#e5564b', // restricted / presumptive denial — red
          suspended: '#6b7178', // suspended — gray
        },
        // ── Element-category accents (from legacy/_sass, tuned for dark). ──
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
      // ── Type scale — small dense base for data, serif display for headings. ──
      // 2xs→base are overridden for density; md is net-new (lead/prose); lg→5xl
      // inherit Tailwind's defaults (18/20/24/30/36/48) and are documented as
      // the heading ramp. Numerics always render in the mono family + tabular.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }], // 11px — badges, eyebrows, fine print
        xs: ['0.75rem', { lineHeight: '1.05rem' }], // 12px — table headers, mono meta
        sm: ['0.8125rem', { lineHeight: '1.2rem' }], // 13px — data tables, compact body (base)
        base: ['0.875rem', { lineHeight: '1.45rem' }], // 14px — body
        md: ['0.9375rem', { lineHeight: '1.6rem' }], // 15px — lead paragraphs, section intros
      },
      // Sharp corners — no rounded SaaS cards (.impeccable.md "no decorative layer").
      borderRadius: {
        none: '0',
        sm: '1px',
        DEFAULT: '2px',
        md: '3px',
      },
      maxWidth: {
        content: '72rem', // page column (header/footer/page gutters align to this)
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
