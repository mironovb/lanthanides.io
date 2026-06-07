# DASHBOARD-ROADMAP.md: /dashboard baseline audit and backlog

> Date: 2026-06-07 · Branch: `main` · Companion to `docs/VISUALIZATION-AUDIT.md`
> (the data-sufficiency gate), `docs/ARCHITECTURE.md` (route map, data
> contracts), and `docs/DEPLOYMENT.md` §8 (how reference data refreshes).
>
> Purpose: a baseline audit of the `/dashboard/` route as it stands, the data it
> already depends on, and a prioritized backlog for the next increments. Scope is
> the dashboard only. This document plans; it does not rebuild the page.
>
> Guiding rules carried from the rest of the project: every figure is derived
> from `_data/` (no fabricated prices, dates, counts, or movement claims, hard
> rule #1); colour only ever encodes meaning; a clean table beats a bad chart
> (the `≤2 distinct days ⇒ no line` rule); keep it dense and editorial.

---

## 1. Current state (what `/dashboard/` renders today)

Source: `app/dashboard/page.tsx` + `components/dashboard/RegulatorySnapshot.tsx`,
reusing `components/charts/PremiumLeaderboard.tsx` and
`components/charts/CoverageGrid.tsx`.

**Render model.** Static (SSG), like every other reference surface. The data
layer memoises its `_data/` reads per process (`lib/data/load.ts`), so a fresh
build is what picks up new data; an ISR `revalidate` would only re-render against
the same cached snapshot, so it is deliberately omitted. (Note a documentation
drift to reconcile: `docs/ARCHITECTURE.md` §2 lists `/dashboard` as ISR and
`docs/DEPLOYMENT.md` §0 as "SSG/ISR"; the code is SSG. See §5.)

**Masthead.** `PageHeader` (eyebrow "Data", serif H1 "Market Dashboard", lead),
a "Data as of" stamp from `getDataGeneratedAt()` (the `fluctuations.json`
`generated_at`, currently `2026-05-31`), a Methodology link, and a `StoryLink`
cross-link into the Regulatory Tracker and Market Movements. A new "Dashboard
scope" `Callout` (added in this pass) states plainly that the screen is a
build-time snapshot of the open dataset, not a live feed.

**Three panels, each derived and stating its own sample size:**

1. **Regulatory snapshot** (`RegulatorySnapshot` ← `getRegulatorySnapshot()`).
   Two count groups over all 31 catalog elements: export-control posture
   (restricted / monitored / unrestricted) and current regulatory state (active
   / suspended / clear). Every tile links into `/regulatory/`. Colour is
   semantic only (the risk scale, via `Badge`).
2. **Retail premium leaderboard** (`PremiumLeaderboard` ← `getPremiumLeaderboard()`).
   Sortable table of latest retail reference ÷ latest bulk benchmark, ranked by
   premium, with a **Basis** column disclosing the form each side is quoted in
   (so a metal-retail ÷ oxide-bulk ratio is never passed off as like-for-like).
   Inverse (<1×) rows are flagged. Only elements priced in both tiers appear (12
   as measured 2026-05-31; derived live, so a current build may differ).
3. **Data coverage grid** (`CoverageGrid` ← `getElementCoverage()` +
   `getCoverageTally()`). One tile per element, graded by how many distinct days
   of observations back it (`data_quality`), the observation count printed on
   every tile, a monochrome teal density ramp (not the price/risk colours). Each
   tile links to its element. Grades as of 2026-05-31: 4 rich / 19 moderate /
   8 sparse / 0 none (derived live).

**Deliberate exclusion.** No "30-day movers" board. The closing note explains
why: most price windows span only two observation days, so ranking them surfaces
oxide-vs-metal artefacts as if they were real moves (`docs/VISUALIZATION-AUDIT.md`
§2). Genuine threshold-crossing events live in the `/movements/` feed, which the
note links to.

---

## 2. What the page already does well (keep)

- **Honest by construction.** Every number is derived from `_data/`; the page
  takes the harder, more credible path of excluding the movers board rather than
  shipping artefacts.
- **Dense and terminal-grade.** No decorative cards, no hero, no gradients.
- **Colour discipline.** Colour appears only where it carries meaning (the
  regulatory risk scale); coverage density is monochrome on purpose.
- **Self-disclosing.** Coverage tiles print their observation counts; the premium
  table discloses its basis; the masthead carries a "Data as of" date.
- **Connected.** Every panel links into the detail surface behind it
  (`/regulatory/`, `/elements/`, `/data/`, `/movements/`).

These are the constraints any future work must preserve, not just nice-to-haves.

---

## 3. Data dependencies

All reads go through the typed `lib/data` layer, are validated at the boundary
(`ensureVerified()`), and are process-memoised at build time.

| Surface | Accessor | `_data/` source | Constraints / notes |
|:--|:--|:--|:--|
| "Data as of" stamp | `getDataGeneratedAt()` | `fluctuations.json` `generated_at` | Single timestamp; currently `2026-05-31T08:31:43Z`. Reflects the last pipeline run, not "now". |
| Element total (31) | `getElements()` | `element_catalog.yml` | Stable; build asserts 31. |
| Regulatory snapshot | `getRegulatorySnapshot()` | `element_catalog.yml` (`export_control_status`, `regulatory_status`) | Pure counts; partitions all 31. |
| Premium leaderboard | `getPremiumLeaderboard()` | `price_records.json` via `selectReferencePrices` (`lib/price-gauge.ts`) | Only elements with both a retail ref and bulk benchmark; ratio can mix forms (disclosed in Basis). |
| Coverage grid + tally | `getElementCoverage()`, `getCoverageTally()` | `fluctuations.json` (`data_quality`, `observation_count`) | `none` = no fluctuation entry or zero observations. |

**Not yet wired (available for the backlog):** `getPolicyEvents()` (11 events) and
`getRegulatoryNotices()` (5 notices) for regulatory recency/suspension detail;
`getControlByCategory()` + `MarketStructure`/`BarTable` (already on `/data`) for
category structure; `getMovements()` for a factual movements pulse; per-element
`data_since`/`data_until` in `fluctuations.json` for a freshness window. The
Prisma models (`Listing`, `Subscription`, `ScreenedOffer`) are reachable via
`lib/db.ts` but would couple the dashboard to the DB (see §4 P3 and §5).

---

## 4. Prioritized backlog

Priority weighs user value (what a dashboard reader needs first) against data
readiness and risk. Each item names whether it needs new data or is pure reuse.

### P1 — next increment (data and components already exist, low risk)

1. **Regulatory recency anchor.** The snapshot shows counts but no time. Add the
   most-recent announcement date and a short label from `getPolicyEvents()` /
   `getRegulatoryNotices()` so the crown-jewel panel carries recency, not just
   tallies. Pure read; no new data; reuses `formatDate`.
2. **Control-by-category structure.** Surface where control concentrates across
   the four categories by reusing the existing `getControlByCategory()` +
   `MarketStructure`/`BarTable` already shipped on `/data`. Zero new data; decide
   against redundancy with the snapshot before adding.
3. **Freshness context for the "Data as of" date.** A small accessor over
   `fluctuations.json` per-element `data_since`/`data_until` + observation totals
   to show the dataset window and depth beside the stamp, so the (currently
   week-old) date reads honestly. Needs a thin `getDataWindow()`-style accessor;
   must state thinness plainly, never imply continuous updates.

### P2 — credible, modest design

4. **Suspensions detail.** The snapshot's "Suspended" count is a number with no
   context. Surface which controls are suspended and when they expire
   (`NoticeSuspension.suspension_expires`, e.g. `2026-11-28`) as a compact
   callout. High regulatory value; data exists; small component.
5. **Movements pulse (factual, gated).** A text-only "N detected events since
   DATE, latest on DATE" stat linking to `/movements/`. No ranking, no sparkline:
   it must honour the no-movers stance and the `≥3-point` sparkline gate. From
   `getMovements()`.

### P3 — larger / architectural / blocked

6. **Commercial-layer activity (DB-backed).** Counts such as the screened-offer
   feed size or accepted listings. This forces SSG → dynamic or ISR and couples
   the dashboard to Prisma (it is DB-free today). Must respect privacy (no PII)
   and the seeded-vs-real honesty (`ScreenedOffer` is seeded). Worth doing only
   once the commercial layer has real volume; document the rendering tradeoff.
7. **Price-trend visuals — BLOCKED by data sufficiency.** No single tier reaches
   5 distinct observation days, so the P10 `LineChart` gate suppresses trend
   lines for all 31 elements (`docs/VISUALIZATION-AUDIT.md`). Park until the
   pipeline deepens a tier to ≥5 clean days; the gated `PriceHistoryChart`
   already exists and would activate automatically. Not a build item now.

---

## 5. Risks and constraints

- **Data sufficiency, not engineering, is the binding limit.** The corpus
  clusters on a few collection days; this is why the page is three honest
  panels, not a wall of charts. Any new visual must pass the existing gate
  (`components/charts/sufficiency.ts`) or be a table/stat that shows its sample
  size. Adding a trend that draws through two points would undo the credibility
  the page is built on.
- **No fabrication (hard rule #1).** Counts, dates, premiums, and coverage are
  all derived. Backlog items that "summarize the market" must resist inventing
  movement narratives the data cannot support.
- **Freshness model changed.** The scheduled regulatory monitor was removed
  (commit `ac8f85c`); the only scheduled data job left is the weekly
  `price-update.yml` (Sun 06:00 UTC), which opens a PR. Vercel rebuilds on merge,
  so the dashboard is a build-time snapshot, not a near-real-time feed. The
  stamp can legitimately be days old (it reads `2026-05-31` today). Stale code
  comments asserting a "6-hourly pipeline commit" were corrected in this pass
  (`app/dashboard/page.tsx`, `lib/data/index.ts` `getDataGeneratedAt`).
- **SSG vs DB coupling.** The dashboard is intentionally DB-free and static. Any
  commercial-layer panel (P3 #6) is an architectural decision: it would move the
  route to dynamic/ISR and add a Prisma dependency and its failure modes.
- **Documentation drift.** `docs/ARCHITECTURE.md` §2 and `docs/DEPLOYMENT.md`
  still describe `/dashboard` as ISR / "SSG/ISR"; the code is SSG. Reconcile
  these when the rendering model is next revisited so the docs match the route.
- **Colour discipline must hold.** New panels reuse the semantic risk scale and
  the monochrome density ramp; no new colour axes.

---

*End of roadmap. This is a planning document; the page itself stays dense and
editorial. Build the P1 items behind the same data-sufficiency gate that governs
every other visual on the site.*
