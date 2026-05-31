# lanthanides.io — Visualization Audit & Remediation (Prompts 9–10)

> Date: 2026-05-31 · Branch: `main` · Companion to `docs/AUDIT.md §3` (the
> visualization inventory and REMOVE/REBUILD/KEEP decisions) and
> `docs/ARCHITECTURE.md`.
>
> **Prompt 9** removed the choppy/low-data visuals (below). **Prompt 10** rebuilt
> the small approved set behind a single, centralized data-sufficiency gate — the
> final rendered inventory and the chosen threshold are in
> [§ Prompt 10 — Rebuilt, gated visualizations](#prompt-10--rebuilt-gated-visualizations).
>
> **Thesis:** a clean table beats a bad chart. The price corpus clusters on two
> collection days; any line, trend, or "% move" drawn from one or two points is
> structurally choppy and reads as broken — or worse, as a trend the data cannot
> support. This pass executes the REMOVE decisions from the audit, replaces each
> removed visual with an honest table or a stat that shows its own sample size,
> and records exactly what changed and why. Saying so is the point: showing our
> work is a credibility signal, not an apology.

---

## The load-bearing fact (data sufficiency)

Measured against the live `_data/` on 2026-05-31:

- **Price history** (`_data/price_history/*.yml`): 31 elements, **285 observations
  (238 once the derived daily medians are excluded)**. Distinct *observation days*
  per element: **8 elements have 1 day, 16 have 2 days, 3 have 3, 2 have 4, and 2
  (Sc, Te) reach 6 — the maximum in the dataset.** So **24 of 31 elements have ≤2
  distinct days**, and only 7 reach 3 or more. A polyline needs ≥3 points to imply
  a defensible shape, and even the 7 that clear that bar are unevenly spaced over
  weeks (e.g. Lu: 2026-01-31, 03-15, 03-29, 03-30).
- **Movements feed** (`_data/movements.yml`): 57 events; the 26 price-move events
  each carry a sparkline. **24 of those 26 sparklines are 2-point** (a slope fixed
  by direction, not by data); only 2 span 3 points.
- **Fluctuation windows** (`_data/fluctuations.json`): nearly every window is
  `confidence: "low"` with `distinct_days_in_window: 2`, which is what produces the
  absurd headline percentages quoted below.

**Hard rendering rule adopted (AUDIT §3, §4.9):** *≤2 distinct points ⇒ no line,
no sparkline, no drawn trend.* Convey the information as a table or as a single
stat with its sample size shown honestly (e.g. "2 observations across 2 days").

---

## What was removed (and what replaced it)

### 1. Per-element price-history line chart — REMOVED → replaced by a table
- **Was:** an inline-SVG line/scatter of retail & bulk USD/kg over time
  (`legacy/_includes/price-chart.html` + `legacy/assets/js/charts.js`). The code
  was honest (it suppressed the connecting line below 3 points and plotted
  per-day medians), but with ≤2 days for 24 of 31 elements the result is a
  near-empty two-dot plot that reads as broken.
- **Status in the Next app:** never ported — confirmed absent from `app/`,
  `components/`, `lib/` (no SVG, `polyline`, `pc-*`, or `charts.js` references on
  any element page).
- **Replaced by two factual tables on every element page:**
  1. the **Price Movement %** table (`components/elements/PriceMovementTable.tsx`,
     ported in P6) — retail/bulk × 7d/30d/90d/1y, missing windows shown as "—";
  2. a new **Price History** observations table
     (`components/elements/PriceHistoryTable.tsx`, this prompt) — a sortable
     **date · tier · form · USD/kg · source** list of the recorded observations,
     with the sample size stated in the header and footnote ("N observations
     across M days"). It draws **no line at any point count**, for every element —
     uniform and honest, rather than conditionally charting the 7 elements that
     technically reach 3+ unevenly-spaced points. Derived `median_aggregate` rows
     are excluded (they would double-count the raw listings they summarise). It
     renders nothing for an element with no recorded raw observation, so no empty
     section ever ships.
- **Rationale:** data sufficiency + credibility. The numbers we actually have,
  shown plainly and sortably, are more useful and more honest than a line through
  two dots.

### 2. Dashboard "30-day movers" leaderboard — ENSURED NEVER PORTED
- **Was:** top gainers/decliners by absolute % over a trailing 30-day window
  (`legacy/pages/dashboard.html` + `legacy/_includes/dashboard-mover-row.html`),
  fed by the same 2-day, mixed-form windows that yield artefacts like Ce 1y
  `+10,450%` and La 30d `+761,400%` (oxide-day vs metal-day, not a real move).
  The legacy page itself conceded "most current windows span only two distinct
  observation days, so confidence is generally low."
- **Status in the Next app:** the `/dashboard` route does not exist yet, so the
  movers board was never ported. This pass **confirms it will not be** — when the
  dashboard is built (Prompt 17) it keeps only the **retail-premium leaderboard,
  the regulatory snapshot, and the data-coverage grid** (AUDIT §3 #6, #13, #7 —
  all KEEP). A "biggest movers" board ranking oxide→metal artefacts as the top
  movers is exactly the credibility-underminer this audit exists to prevent.
- **Information preserved:** genuine, threshold-crossing events already live in
  the factual `/movements` feed (≥10% over 30d), each shown with its confidence
  and sample size — no leaderboard ranking of low-confidence windows.

### 3. Movers 2-point sparkline — ENSURED NEVER PORTED
- **Was:** a hardcoded up/down/flat slope (`M3,18 L77,4`) inside each dashboard
  mover row (`legacy/_includes/dashboard-mover-row.html`; AUDIT §3 #4 = REMOVE).
- **Status:** part of the un-ported movers board; not reintroduced. Pure
  decoration — the geometry was fixed by direction, not data, so the arrow + %
  label already carried everything it could.

### 4. Movements-feed sparkline — GATED at a minimum-data threshold (≥3 points)
- **Was / is:** `components/movements/MovementRow.tsx` rendered an inline-SVG
  sparkline for every price-move event from `event.sparkline.path`. With **24 of
  the 26 sparkline-bearing events at `point_count: 2`**, most of these were
  2-point slopes implying a shape the data doesn't have (AUDIT §3 #5 =
  REBUILD-CLEAN: "drop or rebuild the 2-point sparkline … acceptable once events
  span ≥3 points").
- **Change:** the sparkline now renders **only when `point_count >= 3`** (2 of the
  26 events today; the built `/movements` page emits exactly 2 `<svg>`). Below the
  threshold it is suppressed entirely.
- **Information preserved:** nothing is lost — the event's **from → to price,
  signed % change, window span, and observation/day counts** all remain in the
  row's Meta block, shown verbatim.

### 5. `fluctuation-fallback.html` sparkline/fallback — ENSURED NEVER PORTED
- **Was:** a no-JS "latest price + 30d change" block
  (`legacy/_includes/fluctuation-fallback.html`; AUDIT §3 #8 = REMOVE) that was
  **orphaned — included by no template** even in the Jekyll site.
- **Status:** never ported; not reintroduced. The same "latest price" and change
  information is carried, honestly and with sample sizes, by the two reference
  price cards and the Price Movement table on each element page.

---

## What was kept (and why)

These were classified KEEP / REBUILD-CLEAN in AUDIT §3 and are **not** choppy or
low-data; they are tables, stat callouts, or genuinely sufficient visuals:

| Visual | Where | Decision | Note |
|:--|:--|:--|:--|
| Price Movement % table | `PriceMovementTable.tsx` | KEEP (table) | A table, not a chart. Suppressing windows with <3 distinct days / mixed forms (AUDIT §3 #2) is a separate REBUILD-CLEAN tracked for the viz-polish phase — out of scope for this REMOVE pass. |
| Provenance / all-offers table | `ProvenanceTable.tsx` | KEEP | Full sortable price-record ledger; core trust asset. |
| Two-price reference cards | `ReferencePriceCard.tsx` | KEEP | Single observed prices, fully attributed. |
| Regulatory tracker + timeline | `components/regulatory/*` | KEEP | The crown jewel (AUDIT §6); deep, dated, sourced. |
| Movements feed (rows/meta) | `components/movements/*` | KEEP | Factual events; only the sub-threshold sparkline was gated (above). |
| Home element grid · regulatory snapshot | home / dashboard (Prompt 17) | KEEP | Dense, honest, sample-size-aware. |
| Premium leaderboard · coverage grid | **now on `/data`** (rebuilt in Prompt 10, below) | KEEP/REBUILD | The coverage grid turns thin data into a transparency signal; both will also feed the Prompt 17 dashboard. |

---

## Prompt 10 — Rebuilt, gated visualizations

> Date: 2026-05-31. Executes the **KEEP / REBUILD-CLEAN** rows of `docs/AUDIT.md §3`.
> Thesis unchanged: *a clean table beats a bad chart.* The new rule: every drawn
> trend passes through **one** gate, so nothing choppy can render.

### The shared primitive + the one gate (`components/charts/`)

- **`sufficiency.ts` — the single rule.** `meetsThreshold(distinctPoints, min)` +
  `distinctCount()`. Two configured minimums, both centralized here so no
  visualization re-derives its own:
  - **`MIN_LINE_POINTS = 5`** — a line/area needs ≥ 5 **distinct points**
    (distinct observation days) **in the single series it plots**. The gate is
    applied **per series (per tier)**, never per element — a 2-day retail line is
    never drawn just because the bulk series beside it is longer.
  - **`MIN_SPARKLINE_POINTS = 3`** — the looser bar for inline event sparklines
    (a 2-point sparkline is a slope fixed by direction, not data).
- **`price-series.ts`** — collapses each day's raw offers in a tier to their
  per-day **median** (derived `median_aggregate` rows excluded), yielding one
  point per distinct day: exactly the unit the gate counts.
- **`LineChart.tsx`** — the lone inline-SVG line primitive. It filters series
  through the gate and, if **none** qualifies, renders its `fallback` (a table)
  instead of a line. Pure server SVG; no client JS, no animation.
- **`BarTable.tsx`** — labeled horizontal bar-in-table (the honest alternative to
  a pie); categorical, so no line-gate, but every bar prints its exact number.

### Final inventory — what renders, where, and the gate

| Visualization | Component | Where | Gate | Renders today |
|:--|:--|:--|:--|:--|
| **Price Trend** line (retail/bulk, daily medians) | `PriceHistoryChart` → `LineChart` | `/elements/[symbol]` | per-series **≥ 5 distinct days** | **0 elements** — see below; the P9 observations table stands in for all 31 |
| **Price History** observations table | `PriceHistoryTable` (P9) | `/elements/[symbol]` | n/a (always a table) | all 31 elements |
| **Movements** sparkline | `MovementRow` | `/movements` | **≥ 3 points** (same `meetsThreshold`) | **2 of 26** price-move events |
| **Coverage grid** (heatmap) | `CoverageGrid` | `/data` | n/a (categorical; each tile prints its observation count) | 31 tiles · rich 4 / moderate 19 / sparse 8 / none 0 |
| **Control by category** bars | `MarketStructure` → `BarTable` | `/data` | n/a (categorical bar-in-table) | 4 category rows |
| **Retail-premium leaderboard** (sortable) | `PremiumLeaderboard` | `/data` | n/a (ranked table; **Basis** column discloses the form each side is quoted in) | 12 rows (the elements with both a qualifying retail reference *and* bulk benchmark, via `selectReferencePrices`) |
| **Regulatory announcement timeline** | `RegulatoryTimeline` | `/regulatory` | KEEP — refined to terminal-grade (tabular dates, tightened title tracking, monospace announcement refs) | 11 events |

### Why the price-trend line renders for zero elements today (the gate, proven)

A line connects points **within one series** (one tier). Measured against the live
`_data/price_history/*.yml` on 2026-05-31, the deepest single tier in the whole
catalog is **4 distinct days** — Sc *bulk* (4) and Te *bulk* (4) — and those four
days even **mix forms** (oxide → metal → compound), which the audit flags as noise
dressed as signal (`AUDIT §3 #2`). **No tier reaches 5.** (The `fluctuations.json`
`distinct_days = 6` for Sc/Te is the *union* across tiers, which a single line
cannot honestly use.)

So with the per-series ≥ 5 gate, the Price Trend line is **suppressed for all 31
elements**, and every element shows the honest observations table instead — the
expected, correct outcome (the prompt: *"Most elements will show the table, and
that is correct."*). The line is not dead code: it is wired into the element page
and build-verified, and it activates automatically the moment the Python pipeline
deepens any tier to ≥ 5 clean days. **Proof:** the built site emits **0
`<polyline>` across all 31 element pages**.

### Threshold rationale (why 5, not 3)

`AUDIT §3 #1` floated ≥ 3 for the line; this pass adopts **≥ 5** as the configured
line minimum (the prompt's own example) because, with this corpus, ≥ 3 or ≥ 4
would draw exactly the form-mixed 3–4-point bulk lines (Sc, Te, Lu, Tb) the audit
warns against. ≥ 5 guarantees that the first lines to appear are genuinely
deepening series, not artefacts. The value is a single constant (`MIN_LINE_POINTS`)
and a per-call `min` prop, so it is trivially re-tuned in one place. The sparkline
keeps its looser ≥ 3 because it is a glanceable adornment beside the full factual
row, not a standalone trend.

---

## Verification (no dead code / orphaned assets in the active app)

- The only inline-SVG **trend** code in the active app now lives behind the gate:
  `components/charts/LineChart.tsx` (the price-trend primitive) and
  `components/movements/MovementRow.tsx` (the event sparkline). No legacy `pc-*`,
  `price-chart`, `charts.js`, `dashboard-mover-row`, or `fluctuation-fallback`
  references exist anywhere in `app/`, `components/`, or `lib/`.
- **Built-output proof of the gate:** every built element page emits **0
  `<polyline>`** (the Price Trend line is suppressed for all 31 elements — no
  tier clears ≥ 5 distinct days); the built `/movements` page emits exactly **2
  `<svg>`** (the 2 events with ≥ 3 points). Re-checkable with
  `grep -c "<polyline" .next/server/app/elements/*.html`.
- No chart CSS selectors exist in `app/globals.css` or the component CSS; the
  charts are pure Tailwind-classed inline SVG / tables.
- The legacy implementations remain only under `legacy/` (reference-only;
  removed wholesale in Prompt 25) — the Next build never imports from there.
- `npm run build` passes (53 routes; all 31 element pages + `/movements` +
  `/data`).

---

## Data appendix (measured 2026-05-31)

**Price history — raw (non-aggregate) distinct observation days per element**

```
6 days (2)  : Sc, Te
4 days (2)  : Lu, Tb
3 days (3)  : Ho, Tm, V
2 days (16) : Ce, Co, Dy, Er, Eu, Ga, Gd, Ge, In, La, Nb, Nd, Pr, Sm, Y, Yb
1 day  (8)  : Bi, Li, Mo, Sb, Se, Ta, W, Zr
```
Totals: 31 files · 285 observations · 238 non-aggregate · 47 derived medians ·
**max 6 distinct days** · 24 of 31 elements at ≤2 days, 7 at ≥3.

**Movements — sparkline point counts**

```
point_count 3 : 2 events   (sparkline retained)
point_count 2 : 24 events  (sparkline suppressed)
```
Totals: 57 events (20 price_spike, 6 price_drop, 31 new_data); the 26 price-move
events all previously carried a sparkline; 2 now do.

---

*Guiding rule, restated: ≤2 distinct points ⇒ a table or a stat with its sample
size, never a line. Every removal above either survives as a table/stat or was
already represented by one. A clean table beats a bad chart.*
