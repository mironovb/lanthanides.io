# CLAUDE.md — lanthanides.io

Conventions every unattended session must follow. **Read this first.** The hard
rules below are non-negotiable; the migration checklist at the bottom tracks
progress across prompts 1–25.

Companion docs (read when relevant): `docs/AUDIT.md` (what exists, the
preservation contract), `docs/MIGRATION.md` (why this stack, the URL contract,
build-green sequencing), `docs/ARCHITECTURE.md` (directory layout, route map,
TypeScript data contracts).

---

## What this is

**lanthanides.io — Strategic Materials Ledger** is migrating from a static
**Jekyll** site to a dynamic **Next.js** app, as a sequence of unattended
prompts. The product is two things in one skin: an **open-data reference**
(elements, prices, provenance, regulatory intelligence) and a **thin commercial
app** (seller listings, alerts, screened offers).

## Stack

- **Next.js 14 (App Router)** + **TypeScript** — file-based routes; React Server
  Components keep dense reference tables server-rendered (no hydration tax).
- **Tailwind CSS** — tokens in `tailwind.config.ts`; fonts as CSS variables in
  `app/globals.css`. Type pairing: **IBM Plex Sans** (UI) · **IBM Plex Mono**
  (all numerics, tabular figures) · **Source Serif 4** (headings).
- **Prisma** + **SQLite** (local/dev) / **Postgres** (prod) — the datasource
  `provider` switches by `DATABASE_URL` only, never by code.
- Content tooling: `gray-matter` (front matter), `yaml` (`_data/*.yml`),
  `react-markdown` + `remark-gfm` + `rehype-raw` (HTML-rich element/article
  bodies).

## Hybrid data strategy (the load-bearing decision)

Two stores with opposite needs — **never mix them**:

1. **Reference + provenance data stays in versioned files** — `_data/`,
   `_elements/`, `_articles/`. Read at build time through the typed data layer
   in **`lib/data/`** (contracts in `lib/types.ts`, mirroring ARCHITECTURE §3),
   rendered **SSG/ISR**. This data *is* the product: it must stay inspectable in
   git (open-data / CC BY 4.0), and the Python pipeline in `scripts/` reads &
   writes it on a 6-hour cadence. **Never** move reference data into the DB.
2. **Only genuinely dynamic, user-generated rows live in Prisma** — three
   models: `Listing` (`/sell`), `Subscription` (`/alerts`), `ScreenedOffer`
   (`/offers`). Runtime writes, often private; **never** auto-published into the
   open dataset (that stays the reviewed git-PR flow).

## Commands

- `npm run dev` — local dev server.
- **`npm run build`** — **the gate. It MUST pass before every commit.** A
  not-yet-ported route renders a labeled placeholder; it must never be a build
  error (MIGRATION §4 invariant).
- `npm run lint` — ESLint (`next/core-web-vitals`).
- `npx prisma migrate dev` — create/apply a dev migration after editing
  `prisma/schema.prisma`.
- `npx prisma db seed` — seed the DB (seeder lands with the Prisma models).
- `npx prisma generate` — regenerate the client (also runs on `npm install`).

## Hard rules (non-negotiable)

1. **No fabricated data.** Never invent prices, dates, sources, regulatory
   facts, or counts. Read from `_data/` (or the DB). If a value is missing,
   surface the gap — do not fill it.
2. **Preserve permalinks.** `trailingSlash: true` is set in `next.config.mjs`;
   every page URL keeps its trailing slash. Machine-readable endpoints
   (`.xml`/`.json`/`.txt`/`.webmanifest`) keep their exact extension path with
   **no** trailing slash. The only URL that changes: `/prices/ → 301 →
   /elements/`. Element URLs are case-sensitive (`/elements/Dy/`, not `/dy/`).
   Preserve in-page anchors (e.g. `/methodology/#display-price`,
   `/framework/#pricing`).
3. **No credentials, no paid services.** SQLite only (local file). Stub anything
   external (email delivery, payments, live ingestion) with env vars +
   placeholders. Never commit a real `.env`, key, or secret. **Do not
   `git add -A`** — `.arun/`, `combined*.txt`, `chat.md` are gitignored
   scratch/secrets; **stage deliverables explicitly.**
4. **`legacy/` is reference-only.** It holds the quarantined Jekyll build files
   (layouts, includes, SCSS, pages, config, old JS/CSS). The Next build **never**
   imports from `legacy/`. It is deleted in **Prompt 25** after route-parity
   sign-off.
5. **`build` stays green on every commit** (MIGRATION §4 sequencing invariant).

## Directory map (condensed from ARCHITECTURE §1)

```
app/          Next.js App Router — routes + handlers (api/, sitemap.ts, robots.ts, feed.xml/, movements.xml/)
components/    server-first React (structured-data/, charts/, price/, regulatory/, layout/, ui/)
lib/          data/ (typed readers over _data/), types.ts, price-gauge.ts, seo.ts, db.ts
prisma/       schema.prisma (Listing, Subscription, ScreenedOffer), seed.ts
_data/        UNCHANGED — versioned reference + provenance (yml/json)
_elements/    UNCHANGED — 31 element bodies (.md)
_articles/    UNCHANGED — 5 articles (.md)
scripts/      UNCHANGED — Python pipeline + regulatory monitor (commits _data/ every 6h)
public/       assets/images (favicons, og, manifest), assets/data (open-data exports, build-generated)
docs/         AUDIT.md, MIGRATION.md, ARCHITECTURE.md
legacy/       quarantined Jekyll files (reference-only; removed in Prompt 25)
```

`_data/`, `_elements/`, `_articles/`, `scripts/`, `assets/images`, `assets/data`,
`CNAME`, `robots.txt`, `humans.txt` stay at the repo root, reused by Next.

## Route map (ARCHITECTURE §2 — SSG unless noted; built across Prompts 6–8)

| Route | Render | Old URL |
|:--|:--|:--|
| `/` | SSG | `/` |
| `/elements` | SSG | `/elements/` (+ `/prices/` 301→here) |
| `/elements/[symbol]` | SSG (31, case-sensitive) | `/elements/<Symbol>/` |
| `/regulatory` | SSG | `/regulatory/` |
| `/framework` | SSG | `/framework/` (preserve anchors) |
| `/methodology` · `/sources` · `/about` | SSG | same `/…/` |
| `/news` · `/news/[slug]` | SSG (5 articles) | `/news/…/` |
| `/dashboard` | ISR | `/dashboard/` |
| `/movements` | SSG | `/movements/` |
| `/data` | SSG | — (new open-data landing) |
| `/tools/price-gauge` · `/sell` · `/offers` · `/alerts` | Dynamic/ISR | — (new, **STUB**) |
| `/sitemap.xml` · `/robots.txt` · `/feed.xml` · `/movements.xml` | Handler | same exact path |
| `/api/price-gauge` · `/api/listings` · `/api/subscribe` · `/api/export/[format]` | Handler | — (new) |

## Design tokens (baseline — Prompt 3)

Terminal-adjacent, dense, understated: near-black/graphite surfaces, one
restrained teal accent, sharp corners (no rounded cards), small base font (13px),
monospace tabular numerics. Color only ever encodes meaning — price movement
(`up`/`down`/`neutral`), regulatory risk (`risk-low`/`-medium`/`-high`/
`-suspended` = teal/amber/red/gray), and the four element categories. Colors live
in `tailwind.config.ts`; fonts are CSS variables in `app/globals.css`.

> **Reconciliation note:** `.impeccable.md` specifies a **light-mode** brand
> system. These dark baseline tokens are the scaffold; **Prompt 11** refines them
> into the full design system. Keep tokens semantic so the light-mode switch is a
> token edit, not a utility-class rewrite.

---

## Migration status checklist (Prompts 1–25)

Each prompt must leave `npm run build` green. Later prompts tick these off.

- [x] **1 — Audit.** `docs/AUDIT.md`: current-site inventory, visualization
  inventory, investment-readiness gaps.
- [x] **2 — Plan & architecture.** `docs/MIGRATION.md` (stack decision, data
  strategy, URL contract, sequencing) + `docs/ARCHITECTURE.md` (layout, route
  map, data contracts).
- [x] **3 — Scaffold.** Next.js + TS + Tailwind + Prisma app shell; baseline
  design tokens; Jekyll build files quarantined into `legacy/`; this `CLAUDE.md`.
  `npm run build` passes on the placeholder home.
- [ ] **4 — Data layer.** `lib/types.ts` (ARCHITECTURE §3 contracts) + `lib/data/*`
  readers over `_data/`, `_elements/`, `_articles/`; `lib/price-gauge.ts`;
  build-time validation (a malformed file fails the build loudly).
- [ ] **5 — Design system & shell.** Token system, fonts (self-hosted), `nav`/
  `footer`, `<head>`/SEO via `lib/seo.ts`, JSON-LD components, breadcrumb.
- [ ] **6 — Reference & content pages.** `/`, `/elements`, `/elements/[symbol]`,
  `/regulatory`, `/framework`, `/methodology`, `/sources`, `/about`, `/news`,
  `/news/[slug]` (markdown bodies rendered server-side).
- [ ] **7 — Data exports, feeds & dashboard.** `/dashboard`, `/movements`,
  `movements.xml`, `feed.xml`, `sitemap.ts`, `robots.ts`, `/data` landing, and the
  preserved `/assets/data/*.json` exports (build-generated).
- [ ] **8 — Commercial stubs & API.** Prisma models (`Listing`, `Subscription`,
  `ScreenedOffer`) + seed; stub routes `/tools/price-gauge`, `/sell`, `/offers`,
  `/alerts`; handlers `/api/price-gauge`, `/api/listings`, `/api/subscribe`,
  `/api/export/[format]`.
- [ ] **9–24 — Polish & rebuilds** (MIGRATION §4): visualization rebuilds
  (AUDIT §3), content/positioning (§4.5–§4.6), design polish (Prompt 11 = full
  design system), PWA/manifest fixes (§4.8, incl. `/periodicpricing/…` →
  `/assets/images/…`).
- [ ] **25 — Parity & cleanup.** Verify route parity against AUDIT §2; **remove
  `legacy/`**.
