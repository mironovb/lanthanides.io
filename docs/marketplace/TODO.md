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
- [ ] `lib/marketplace/types.ts` (schema per PLAN deltas)
- [ ] `lib/marketplace/{load,validate,verify,index,catalog-average,serialize}.ts`
- [ ] tsconfig + eslint exclude `periodictech`
- [ ] Loader proven against a fixture; build green; commit

## Phase 2 — Seed seller
- [ ] `_marketplace/sellers.yml` (kazakhelements, verified, basis stated)
- [ ] `_marketplace/sellers/kazakhelements.md` bio (seller voice, declared claims)
- [ ] Monogram SVG avatar; build green; commit

## Phase 3 — Import pipeline
- [ ] `scripts/import-periodictech.mjs` (inventory → parse → normalize → copy → emit)
- [ ] Run; 19 listings in `_marketplace/listings/`; images copied per-slug
- [ ] Idempotency: second run produces zero diff
- [ ] `IMPORT_REPORT.md` (manifest vs imported reconciliation, fallback counts, inversions, exclusions)
- [ ] Build green; commit

## Phase 4 — API layer (api-builder)
- [ ] `GET /api/marketplace/listings` (filters, sort, pagination, q)
- [ ] `GET /api/marketplace/listings/[slug]` (static)
- [ ] `GET /api/marketplace/sellers/[handle]` (static)
- [ ] `GET /api/marketplace/price-reference` (static, seller_catalog basis + disclaimer)
- [ ] Build green; commit

## Phase 5 — Frontend (frontend-builder)
- [ ] Nav: "Lanthanides Marketplace" second, Preliminary badge, desktop + mobile
- [ ] `/marketplace/` browse (trust strip, filters, sort, card grid)
- [ ] `/marketplace/[slug]/` detail (gallery, variants table, specs, PROMINENT provenance, seller card, buyer-protection copy, mailto CTA)
- [ ] `/marketplace/sellers/kazakhelements/` profile
- [ ] Metadata + JSON-LD (Product without Offer); sitemap entries
- [ ] Build green; commits

## Phase 6 — Verification
- [ ] vitest suite: loader validation, idempotency, counts, image files exist, provenance present, nav second, API integration
- [ ] `scripts/verify-marketplace.mjs` over built output
- [ ] qa-fidelity agent: 10-listing source audit → appended to IMPORT_REPORT.md
- [ ] Screenshots → `docs/marketplace/screenshots/`
- [ ] Full build + lint + tests green; commit

## Phase 7 — Handoff
- [ ] `HANDOFF.md`
- [ ] Final commit; draft PR if remote + creds exist

## Definition of Done (from the brief)
- [ ] "Lanthanides Marketplace" second nav item, desktop + mobile, Preliminary badge
- [ ] Imported listing count = source manifest count (19 = 19), or discrepancies explained
- [ ] 100% of listings render ≥1 photo and a provenance section
- [ ] `kazakhelements` exists, verified, owns all listings, profile page works
- [ ] Build green, tests green, screenshots captured
- [ ] `./periodictech` gitignored + absent from `git ls-files`; assets copied out
- [ ] `.claude/agents/` definitions committed and used
- [ ] IMPORT_REPORT.md, ASSUMPTIONS.md, PLAN.md, TODO.md, HANDOFF.md committed
