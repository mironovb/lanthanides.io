# TODO — Lanthanides Marketplace (Preliminary)

Live checklist for the overnight build. Source of truth on resume.

## Phase 0 — Recon & plan
- [x] Branch `feature/lanthanides-marketplace-preliminary`
- [x] `/periodictech/` gitignored, verified untracked (commit 1)
- [x] `.claude/agents/` definitions committed (commit 2)
- [x] Recon agents dispatched (lanthanodes, periodictech, designer)
- [x] RECON-lanthanodes.md, RECON-periodictech.md, DESIGN.md written
- [x] PLAN.md merged; ASSUMPTIONS.md started
- [x] Baseline `npm run build` green

## Phase 1 — Data layer
- [x] `lib/marketplace/types.ts` (schema per PLAN deltas)
- [x] `lib/marketplace/{load,load-listings,validate,verify,index,catalog-average,serialize}.ts`
- [x] tsconfig + eslint exclude `periodictech`
- [x] Loader proven against fixtures (58-assertion harness); build green; commit

## Phase 2 — Seed seller
- [x] `_marketplace/sellers.yml` (kazakhelements, verified, basis stated)
- [x] `_marketplace/sellers/kazakhelements.md` bio (seller voice, declared claims)
- [x] Monogram SVG avatar; build green; commit

## Phase 3 — Import pipeline
- [x] `scripts/import-periodictech.mjs` (inventory → parse → normalize → copy → emit)
- [x] Run; 19 listings in `_marketplace/listings/`; images copied per-slug
- [x] Idempotency: second run produces zero diff (PASS)
- [x] `IMPORT_REPORT.md` (19=19 reconciliation, 3 honest-fallback provenance, 2 inversions flagged, exclusions)
- [x] Build green; commit

## Phase 4 — API layer (api-builder) ✅
- [x] `GET /api/marketplace/listings` (filters, sort, pagination, q)
- [x] `GET /api/marketplace/listings/[slug]` (static)
- [x] `GET /api/marketplace/sellers/[handle]` (static)
- [x] `GET /api/marketplace/price-reference` (static, seller_catalog basis + disclaimer)
- [x] Build green; commit

## Phase 5 — Frontend (frontend-builder) ✅
- [x] Nav: "Lanthanides Marketplace" second, Preliminary badge, desktop + mobile
- [x] `/marketplace/` browse (trust strip, filters, sort, card grid)
- [x] `/marketplace/[slug]/` detail (gallery, variants table, specs, PROMINENT provenance, seller card, buyer-protection copy, mailto CTA)
- [x] `/marketplace/sellers/kazakhelements/` profile
- [x] Metadata + JSON-LD (Product without Offer); sitemap entries
- [x] Build green; commits
- [x] Screenshots captured (browse, detail, seller, mobile) → screenshots/

## Phase 6 — Verification ✅
- [x] vitest suite: 35/35 (loader validation, idempotency, counts, image files exist, provenance present, nav second, API integration)
- [x] `scripts/verify-marketplace.mjs` over built output — 5/5 PASS
- [x] qa-fidelity agent: 10-listing source audit (60/60 + 6/6 PASS) → appended to IMPORT_REPORT.md
- [x] Screenshots → `docs/marketplace/screenshots/` (browse, detail, seller, mobile)
- [x] Full build + lint + tests green; commit

## Phase 7 — Handoff ✅
- [x] `HANDOFF.md`
- [x] Final commit. Draft PR NOT opened: `gh` unauthenticated on this
      machine (ASSUMPTIONS #19); branch left local for the owner to push.

## Definition of Done (from the brief)
- [x] "Lanthanides Marketplace" second nav item, desktop + mobile, Preliminary badge
      (nav.test.ts + verify-marketplace nav check + browse screenshot)
- [x] Imported listing count = source manifest count (19 = 19; 90 variants; IMPORT_REPORT reconciliation)
- [x] 100% of listings render ≥1 photo and a provenance section (build-time
      loader invariant + verify-marketplace 19/19 built-HTML check)
- [x] `kazakhelements` exists, verified, owns all listings, profile page works
      (SSG /marketplace/sellers/kazakhelements/ + seller screenshot + API test)
- [x] Build green, tests green (35/35), screenshots captured
- [x] `./periodictech` gitignored + zero `periodictech/` paths in `git ls-files`;
      all photos copied out into committed assets (sha256-verified)
- [x] `.claude/agents/` definitions committed and used to steer every dispatched
      agent (inlined verbatim — session registry caveat in ASSUMPTIONS #1)
- [x] IMPORT_REPORT.md, ASSUMPTIONS.md, PLAN.md, TODO.md, HANDOFF.md committed
