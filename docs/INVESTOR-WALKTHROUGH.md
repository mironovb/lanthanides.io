# Investor Walkthrough — lanthanides.io

> A click-through narrative for a reviewer (investor / Emergent Ventures /
> grant committee). It takes ~5 minutes at [www.lanthanides.io](https://www.lanthanides.io),
> in the order below. Every figure here is live on the site and traceable to a
> source — nothing is asserted that you can't check in the product or in git.
>
> Companion reading: **[README.md](../README.md)** (what it is, how to run it),
> **[AUDIT.md](AUDIT.md)** §6 (why the tracker is the crown jewel), **[ARCHITECTURE.md](ARCHITECTURE.md)**
> (how it's built).

---

## The 30-second version

Rare earths and a handful of strategic metals are indispensable to magnets,
semiconductors, and defense systems — and their supply is highly concentrated and
increasingly gated by Chinese export controls. A buyer or analyst needs to know
two things about a given material: **what it costs**, and **whether it can legally
move**. No single, credible, open reference answers both.

**lanthanides.io is that reference** — source-transparent prices for 31 elements
*and* the only continuously maintained, English-language, source-cited record of
the MOFCOM/GAC export-control announcements that govern them. On top of that
reference sits the early scaffolding of a two-sided marketplace.

**The defensible asset is the dataset and the tracker, not a feature.** A
marketplace is easy to build and hard to trust; a credible, auditable reference is
hard to build and is what makes a marketplace trustworthy. We built the hard part
first, and it's live.

---

## The path (in order)

### 1. Home — `/`

The above-the-fold answers *what / who / why now* in one screen: source-transparent
prices and export-control intelligence for **31 elements**, built for procurement,
research, and investment. The "Why now" panel states the wedge with live numbers:
since Ga/Ge in July 2023, MOFCOM has issued **11 successive export-control
announcements**, now reaching **22 of the 31 elements** tracked here.

> **What it demonstrates:** a clear thesis and an honest one — the proof stats
> (elements, sourced records, sources, controlled count, announcements) are all
> computed live from the data layer, not typed into the page.

### 2. Regulatory Tracker — `/regulatory/` (the crown jewel)

The differentiator. **5 detailed control regimes** (e.g. MOFCOM Announcement
No. 18/2025) and an **11-event policy timeline** from the July-2023 gallium/germanium
controls forward. Each notice carries the announcement number, the **Chinese
reference** (e.g. `商务部 海关总署公告2025年第18号`), the issuing authority, issue and
effective dates, the exact affected elements and controlled forms, the **legal
basis** (Article 15, Export Control Law of the PRC), and the **suspension state**.
Filter by element; every claim links to its primary source.

> **What it demonstrates:** the moat. This is the thing a reviewer "can verify in
> five minutes and not find elsewhere." Prices are contestable; this corpus is
> deep, dated, sourced, and updated as announcements land.

### 3. Operational Framework — `/framework/`

The tracker's companion: it turns *what/when* into procurement *how* — a
three-tier regulatory classification (uncontrolled / general-licence / case-by-case),
the post-IEEPA US tariff stack, a multiplicative realised-price model, four-axis
landed-cost decomposition with worked examples, and a 2026 decision-trigger calendar.

> **What it demonstrates:** domain depth that a generalist can't fake — and the
> confident, decision-oriented voice the product speaks in.

### 4. Elements & provenance — `/elements/` → `/elements/Dy/`

The directory of all **31 elements** across four categories. Open **Dysprosium**
(`/elements/Dy/`) to see the model in full:

- The **two-price system** — a **Retail Reference** and a **Bulk Benchmark**, never
  merged or averaged; the ratio between them is itself a signal.
- The inline regulatory banner — Dy cites Announcement No. 18/2025 and the
  28 November 2026 suspension key date, right where a buyer would look.
- The **full provenance table** — every price record names a seller, country, date,
  form, purity, quantity, confidence, and verification status.

Across the dataset: **238 sourced price records**, of which **27 carry an
independently verified status**. The rest are single-source offers and benchmarks —
each labelled as such, never dressed up as verified.

> **What it demonstrates:** "provenance-first" is literal. Every number shows its
> work; empty fields mean "not yet collected," never "estimated" (hard rule #1).

### 5. Market dashboard — `/dashboard/`

A dense, terminal-grade overview derived live from the data: a regulatory snapshot
by export-control posture, a retail-premium leaderboard (with the form basis
disclosed, because a metal-vs-oxide ratio would otherwise mislead), and a
data-coverage map. Thin coverage is shown as a coverage grid, not hidden — and not
apologized for.

> **What it demonstrates:** transparency turned into a credibility signal rather
> than a hedge. Charts that would draw a trend from too few points refuse to draw
> (see [VISUALIZATION-AUDIT.md](VISUALIZATION-AUDIT.md)).

### 6. Open data — `/data/`

The dataset as a product: download all 238 records as **JSON or CSV** (`/api/export/json/`,
`/api/export/csv/`), generated from the same data layer the site renders, under
**CC BY 4.0**. Fork it, diff it, audit it.

> **What it demonstrates:** the open-data licence is honored in substance — the
> files in git *are* the export. This is what makes the reference auditable, and
> therefore defensible.

### 7. Price gauge — `/tools/price-gauge/`

The first commercial surface. Pick an element, form, purity, and quantity and get a
transparent **low/mid/high USD/kg band**, a **confidence grade**, and a full
**basis disclosure** (records matched, distinct sellers, date span, method, and the
contributing record IDs). On thin data it returns an explicit "insufficient data"
result — never a fabricated price.

> **What it demonstrates:** the dataset becomes a *tool*, not just a table — and it
> stays honest under sparse data, which is most of the long tail.

### 8. Sell / list — `/sell/`

The supply side. A seller submits a structured listing and gets an **instant price
gauge inline** — the same engine positions the asking price below / in / above the
reference band. The submission persists (with a frozen gauge snapshot) to the
database.

> **What it demonstrates:** the two-sided loop, end to end. Note the discipline: a
> listing is stored with `status: pending`, the private contact is never exposed,
> and publishing into the open dataset is a **maintainer git-PR step, never
> automatic**.

### 9. Offer feed — `/offers/`

The demand side. A dense, value-ranked, filterable feed of screened offers, each
annotated with the element's export-control status. It is **live and real — seeded
from the verified dataset (220 rows)**. A headline banner states plainly that the
**live internet-screening backend is in development** — no "we scanned the web"
theatre.

> **What it demonstrates:** the demand-side UX is real today, and the honesty about
> the stubbed backend is exactly the credibility posture the whole product runs on.

### 10. Alerts — `/alerts/`

Two channels, each honest about status. **Telegram automation is paused** after
removing the scheduled regulatory-monitor GitHub Action. **Email is a waitlist**
that captures an address and topics, and the confirmation states plainly that
nothing is sent yet.

> **What it demonstrates:** the site keeps alerting claims tied to what is
> actually operating, while preserving the storage path for future notification
> work.

**Worth a detour:** `/news/` (5 footnoted analysis articles), `/methodology/` (how
prices are selected, normalized, and verified), `/sources/` (the trust-tiered
registry), and `/contribute/` (the two-human-checkpoint intake) — the connective
tissue that makes the whole thing legible.

---

## Current stage vs. roadmap (candid)

The reference layer is **fully live**. The commercial layer is **early**, and the
site labels it stub-by-stub (the canonical version is the Now / In-progress /
Planned table on `/about/`).

| | Capability | Reality today |
|:--|:--|:--|
| ✅ **Live** | Regulatory tracker, framework, element/provenance pages, dashboard, open-data exports | Built, running, free. The defensible core. |
| ⏸ **Paused** | Telegram regulatory alerts | Scheduled GitHub Actions monitor removed; no automatic dispatch today. |
| ✅ **Live** | Price gauge, seller-listing capture, screened-offer feed | Working surfaces over the real dataset. |
| 🟡 **Stubbed** | Live offer-screening ingest (parse / score / dedup real web offers) | Interface defined (`lib/screening`, [OFFER-SCREENING.md](OFFER-SCREENING.md)); the feed is dataset-seeded until it lands. |
| 🟡 **Stubbed** | Email alert delivery, double opt-in, per-element routing | Waitlist captured; no provider wired. |
| ⚪ **Planned** | Full marketplace — listing moderation at scale, contact reveal, matching, transactions | Data model in place; flows not built. |

**What this page does not claim:** no traction, revenue, users, or partnerships.
The commercial layer is early and labelled as such. What is live, free, and worth
trusting today is the open reference and the export-control tracker.

---

## How to verify it in five minutes

1. Open `/regulatory/`, pick any controlled element, and follow a notice to its
   primary Chinese source. The citation chain holds.
2. Open `/elements/Dy/` and read the provenance table — every price has a seller
   and a date.
3. Download `/api/export/csv/` and diff it against `_data/price_records.json` in
   the repo. They match, because one generates the other.
4. Check `/offers/` — the banner tells you the backend is stubbed before you ask.

That last point is the whole thesis: **a product that tells you what it doesn't
know is one you can trust about what it does.**
