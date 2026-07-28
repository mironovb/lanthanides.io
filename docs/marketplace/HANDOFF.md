# HANDOFF — Marketplace

> **Production-posture pass (2026-07-28, owner-directed), superseding the
> "preliminary" framing below where they conflict.** The surface is now
> just "Marketplace": hedging UI removed (no Preliminary pill, no
> verification-pending chips, no document scoreboards), demo inventory
> added (2 demonstration sellers + 4 placeholder-status listings with
> specimen documents — internal markers only; see ASSUMPTIONS #20–22),
> every eligible listing positioned against the sourced ledger via the
> price-gauge engine (green below / red above strip on detail pages), and
> the inquiry CTA is an on-page form POSTing to
> `/api/marketplace/inquiries`, which **only writes a `[marketplace-inquiry]`
> line to the server log** — wire a real delivery channel before treating
> inquiries as received. Demo entities and specimen documents must be
> removed or replaced before public launch.

Built overnight, unattended, on branch
`feature/lanthanides-marketplace-preliminary`. Read this first, then
[IMPORT_REPORT.md](./IMPORT_REPORT.md) → [ASSUMPTIONS.md](./ASSUMPTIONS.md)
→ [PLAN.md](./PLAN.md) → the screenshots in [screenshots/](./screenshots/).

## What was built

- **Nav**: "Lanthanides Marketplace" is the second header item (desktop and
  the same list renders the mobile panel), with a "Preliminary" pill;
  "Marketplace" is second in the footer row.
- **Data**: all **19 listings / 90 pack-size variants / 19 photos** from the
  vendored periodictech store are imported into `_marketplace/listings/*.md`
  + `public/assets/marketplace/`, normalized into the typed schema — titles,
  descriptions and prices verbatim, provenance recorded honestly (origin
  only where the source states it; zero invented documents).
- **Attribution**: seed seller **`kazakhelements`** (verified, with a
  verification basis scoped to what is actually known) owns every listing;
  profile page at `/marketplace/sellers/kazakhelements/`.
- **Layers**: schema-as-code (`lib/marketplace/`, build-time validation in
  place of migrations — the repo forbids new DB tables), idempotent import
  pipeline (`scripts/import-periodictech.mjs`), four read-only API routes
  (`/api/marketplace/{listings,listings/[slug],sellers/[handle],price-reference}`),
  browse + detail + seller UI, filters/search/sort, tests, and these docs.
- **Quarantine**: `./periodictech` is gitignored (first commit of the
  branch); `git ls-files` has zero paths under `periodictech/`. The three
  tracked files whose *names* contain "periodictech" are our own
  deliverables (import script, recon doc, agent definition).

## How to run

```sh
PATH=/usr/local/opt/node@24/bin:$PATH   # node is keg-only on this machine
npm run dev                             # dev server
npm run build && npm run start          # production build + serve
npm test                                # vitest suite (tests/marketplace/)
node scripts/verify-marketplace.mjs     # post-build output checks (run after a build)
node scripts/import-periodictech.mjs    # re-run the import (idempotent; needs ./periodictech)
```

The import re-reads the vendored `./periodictech` folder; without it the
script fails loudly and changes nothing — the committed catalog stands on
its own.

## Key decisions (full log in ASSUMPTIONS.md)

- File-store persistence, not SQLite: the repo's data law (versioned files,
  reviewed diffs, no new DB tables) is itself the migration story.
- Real catalog shape won over the brief's guess: per-listing **variants**
  (90 real price points), category enum gained `alloy`, provenance country
  is null where the source states none.
- Honesty rules enforced in code: "Verification pending" everywhere
  (no documents exist), the seller-catalog average is never called a
  reference/market price, the leave-one-out comparison hint is gated and
  renders nowhere at current sample sizes, Product JSON-LD ships without
  Offer (no checkout exists), buyer-protection copy names no processor.
- Prices: the owner repriced the catalog to the reference ledger on
  2026-07-28 (ASSUMPTIONS #23) — 9 listings scaled by fixed factors baked
  into the import script; terbium's source price inversion was repaired by
  that pass. Devarda's alloy, not repriced, still carries the source's own
  pending-review flag on its 450 g pack.

## Known gaps

- One photo per listing (that is all the source has); no COA/provenance
  documents exist yet — every listing honestly shows "Verification pending".
- `listed_on` is the slug's first appearance in the source repo's git
  history (all 2026-03-11); the store operated earlier.
- The inquiry CTA mails `support@periodictech.com` (the store's real
  address) — swap in `_marketplace/sellers.yml` if a dedicated marketplace
  address is created.
- Not pushed: `gh` is unauthenticated on this machine. To publish:
  `git push -u origin feature/lanthanides-marketplace-preliminary` and open
  a draft PR titled "feat: Lanthanides Marketplace (Preliminary)".

## Suggested next steps

1. Owner pass over the two flagged price inversions and the seller bio.
2. Photograph documents (invoices, lot certificates) → flip listings to
   `document-on-file`; the schema, badges, and API already support it.
3. Real registration/auth + a second seller (the schema is multi-seller).
4. A buyer-protection flow that is operated, not just described, then add
   `Offer` to the Product JSON-LD in the same PR as checkout.
5. Automated price index once cells have ≥5 listings (the gate is already
   in `_marketplace/settings.yml`).

## Verification (final state of the run)

- `npm run build` — green (marketplace: index + 19 SSG detail pages +
  seller page + 3 static API routes + 1 dynamic API route). `npm run lint`
  clean.
- `npm test` — **35/35 passing** (data-layer invariants, loader
  hard-failure matrix, import idempotency at the git level, nav order +
  badge, API integration against the real handlers).
- `node scripts/verify-marketplace.mjs` — **5/5 PASS** over built HTML
  (nav second with "Lanthanides Marketplace" + "Preliminary"; all 19
  detail pages carry "Provenance" + "Verification pending"; quarantine;
  image paths).
- Data-fidelity audit (10 sampled listings + global invariants, in
  IMPORT_REPORT.md): **60/60 + 6/6 PASS** — titles/bodies/variants
  byte-faithful, photos sha256-identical, provenance honest, the only
  systematic delta a POSIX trailing newline.
- Screenshots: `screenshots/marketplace-{browse,detail-scandium,seller,mobile-browse}.png`.
- Tests deliberately pin today's honesty gates (`catalog_average` hint
  suppressed everywhere at current sample sizes) so real data growth
  forces a conscious re-review.
