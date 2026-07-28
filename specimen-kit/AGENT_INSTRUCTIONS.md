# Agent instructions: integrate the specimen kit

You are integrating two self-contained visual features from periodictech.com into a
different website. Follow the steps in order; verification criteria are at the end.

## What you are integrating

1. **SpecimenShowcase** (`components/SpecimenShowcase.tsx` + `styles/specimen-showcase.css` + `assets/*.png`)
   Three photographic metal-specimen cutouts (transparent PNGs) arranged as a floating
   composition: top-left scandium, top-right tellurium, bottom-center thulium. Each
   drifts vertically on its own 6.5 to 8 second cycle, casts a soft drop shadow, can link
   to a page, and reveals a small monospace element chip ("Sc Scandium") only while
   hovered or keyboard-focused. Chips are completely hidden on touch devices and
   screens under 640px. All motion stops under `prefers-reduced-motion`.

2. **LanthanumBohrScroll** (`components/LanthanumBohrScroll.tsx`)
   A three.js Bohr model of lanthanum (57 protons, 82 neutrons, 6 electron shells)
   rendered with react-three-fiber on a transparent canvas. It idles with a slow damped
   rotation, tilts a few degrees toward the pointer, and morphs its shells from flat
   circles toward an edge-on "star" as the page scrolls (exponentially damped). Under
   `prefers-reduced-motion` the spin, orbits, and parallax stop; only the scroll-driven
   morph remains. The canvas ignores pointer events and is marked decorative
   (`aria-hidden`).

## Prerequisites

- React project (SPA or SSR). React 19 preferred; React 18 works (see dependency note).
- For the atom only: WebGL (every modern browser).
- If the host project is not React, stop and report that this kit is React-only.

## Step 1: install dependencies

Only the atom needs new packages. See `package.deps.json`.

```bash
npm install three@^0.182.0 @react-three/fiber@^9.4.2
npm install -D @types/three@^0.182.0   # TypeScript projects
```

React 18 host: use `@react-three/fiber@^8` instead of v9; no code changes needed.
If only SpecimenShowcase is wanted, skip this step entirely.

## Step 2: copy files into the host project's conventions

- `components/SpecimenShowcase.tsx` and `components/LanthanumBohrScroll.tsx`
  -> the project's component directory (e.g. `src/components/`).
- `styles/specimen-showcase.css` -> the project's styles, imported ONCE globally
  (Next.js: in the root layout; Vite: in `main.tsx`).
- `assets/*.png` -> the project's static/public directory, e.g. `public/images/hero/`.
  If the public path differs, update the `src` values where you use the component.
- Both components start with `"use client"`. Outside React Server Components that
  directive is an inert string; leave it in place.

## Step 3: place SpecimenShowcase

Use `examples/plain-react-hero.tsx` (any React app) or `examples/nextjs-hero.tsx`
(Next.js App Router) as the template. Key points:

- The component fills its container; give the container an explicit height
  (`style={{ height: 460 }}` or a CSS class). 280 to 460px reads well.
- Pass exactly three items in order: top-left, top-right, bottom-center. Keep the
  provided `width`/`height` numbers (intrinsic PNG dimensions; they prevent layout
  shift): scandium 717x549, tellurium 531x463, thulium 719x577.
- `href` per item is optional; with it, specimens become links (use the host site's
  relevant pages, or omit).
- Next.js: pass `ImageComponent={Image}` and `LinkComponent={Link}` so the ~700KB
  PNG sources are served resized as AVIF/WebP (~90KB at hero sizes). Other frameworks:
  defaults render plain `<img>`/`<a>`; consider pre-resizing the PNGs if the host has
  no image optimizer.
- Theming: set `--sk-accent` (chip border/symbol color) on `:root` to match the host
  brand; defaults are orange #e65100.

## Step 4: place LanthanumBohrScroll

- It is decorative; good spots are a hero side column or an about-page sidebar.
- It must render client-side only. Next.js App Router: import via
  `next/dynamic({ ssr: false })` FROM A FILE MARKED `"use client"` (see example).
  Plain SPAs can import it normally.
- Size via the `height` prop (px) or `className`/`style`; width fills the container.
- Colors are constants at the top of the file (`COLOR_ELECTRON`, `COLOR_RING`, ...);
  adjust to the host palette. Motion tunables: idle spin `0.055`, pointer parallax
  `0.16`/`0.10` (in `Scene`), scroll morph mapping in the outer component
  (`raw * 4`, `STAR_REACH`, `MORPH_MAX`).
- The scroll morph reads the WHOLE page's scroll progress. On very long pages the
  star form completes within the first quarter of scrolling; increase the `* 4`
  multiplier's divisor context if it should complete later.

## Step 5: verify (all must pass)

1. Build passes (`tsc`/framework build) with no new errors.
2. The three specimens render, gently drift, and their images load from the host's
   static path (no 404s in the network tab).
3. Desktop: hovering a specimen scales it slightly and fades in its chip; moving away
   hides the chip. Keyboard Tab onto a linked specimen also reveals the chip.
4. Touch emulation (or a real phone): chips never appear, at any width.
5. The atom renders on a transparent background, slowly rotates, tilts subtly toward
   the cursor, and its shells tilt toward the star form as you scroll down.
6. With reduced motion emulated (DevTools > Rendering > prefers-reduced-motion):
   specimens stop drifting, chips still work, the atom stops spinning/orbiting but
   still responds to scroll.
7. No console errors (a WebGL context warning on unsupported hardware is acceptable;
   the rest of the page must still work).

## Asset notes

- The PNGs are studio cutouts with real alpha (background removed, edges feathered,
  white fringe decontaminated). They composite correctly on any background color;
  on dark backgrounds consider lightening the drop shadow in the CSS.
- `assets/metals.png` is the combined three-specimen transparent image, included for
  reuse (e.g. social cards); the site composition uses the three individual files.
