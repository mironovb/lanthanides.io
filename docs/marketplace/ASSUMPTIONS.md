# ASSUMPTIONS — decisions made during the unattended build

Each entry: the call, why, and what would change it. Ordered chronologically.

1. **Custom agent definitions dispatched via built-in agent types.** The six
   `.claude/agents/*.md` definitions were written and committed in Phase 0,
   but the running session's agent registry is fixed at session start, so
   they are not directly selectable mid-run. Each dispatch therefore uses a
   built-in agent type (read-only `Explore` for recon/design/QA,
   `general-purpose` for builders) with the committed definition's
   instructions inlined verbatim. The definitions are real and steer the run;
   future sessions can select them natively.

2. **Persistence layer = versioned files, not SQLite.** The brief says "use
   the repo's existing persistence layer; if none exists, add SQLite plus the
   lightest ORM". The repo's existing layer IS versioned files read at build
   time (`_data/`, `_elements/` via typed `lib/` readers) — and CLAUDE.md
   hard-forbids new DB tables/write paths after the 2026-07 refocus. So the
   marketplace stores listings as `_marketplace/*.md|yml`, with schema
   enforced by `lib/marketplace` at build. Migrations = reviewed git diffs
   (DESIGN §3.5). Would change if: the repo ever re-adopts a database.

3. **Variants extend the brief's schema.** The brief models one
   `weight_grams`/`price_cents` per listing; the real catalog prices every
   listing at up to 10 pack sizes (90 variants across 19 listings).
   Flattening to 90 near-duplicate listings would misrepresent the store, and
   collapsing to one price would drop 71 real price points. Listings carry a
   `variants` list; the card shows "from $X". Would change if: the owner
   prefers one-listing-per-SKU.

4. **Category enum extended with `alloy`; source taxonomy mapped** Rare
   Earth → `pure-metal`, Ultra Pure → `pure-metal`, Alloy → `alloy`. The
   brief's five categories don't fit the 3 real alloys (they are neither pure
   metals nor high-tech nor equipment), and mislabeling them would violate
   the no-fabrication rule. The original store category is preserved in the
   reviewer-only `source` block. `oxide`, `mineral-ore`, `high-tech`,
   `equipment` remain valid-but-empty today.

5. **Provenance is honest-minimal, never invented.**
   - 16 listings state `Origin: Kazakhstan` in the source → `country: KZ`,
     `verification_status: seller-declared` (renders "Verification pending").
   - 3 alloys state no origin → `country: null` ("Not stated"), **not**
     defaulted to Kazakhstan: the brief's fallback wording
     ("Kazakhstan (seller-declared)") would attribute a claim the seller
     never made for those items; the fallback record is otherwise as the
     brief specifies (private-collection, verification pending, counted
     separately in IMPORT_REPORT).
   - `source_type: private-collection` for all 19 — the seller's own retail
     stock is the only sourcing fact on record. No refinery/mine is named
     anywhere in the source, so none is claimed.
   - `documents: null` everywhere. The store's "ships with a COA" marketing
     line is flagged unverified by its own AUDIT.md and has no files behind
     it; importing it as provenance would fabricate a certificate.
   - `chain` records only the real, boring history: seller's retail catalog
     (periodictech.com) → imported to this marketplace 2026-07-28.

6. **Dates.** The catalog has zero timestamps. `listed_on` = the slug's
   first appearance in periodictech git history (real, per-listing,
   deterministic); `updated_at = listed_on` (per-listing update times are not
   honestly recoverable; the file-level last revision, 2026-07-06, is noted
   in IMPORT_REPORT only). Fixed import date constant `2026-07-28` used for
   chain/import annotations — never `Date.now()` — so re-runs are
   byte-stable.

7. **Seller `joined_at` = 2026-03-11** (periodictech repo first commit, as
   the brief instructs). The store demonstrably operated earlier (Prisma
   migrations dated 2026-01-06; the founder's ~6-year history) — that context
   lives in the bio and the seller-declared claims block, not in
   `member_since`.

8. **No auth system exists, so no registration flow.** The seed seller is a
   data-layer record. `SEED_SELLER_PASSWORD` is not needed and is NOT added
   to `.env.example` (repo hard rule: `DATABASE_URL` stays the only env var;
   adding a dead placeholder would violate the documented contract).
   Registration/login is out of scope for preliminary.

9. **Inquiry CTA = `mailto:support@periodictech.com`** (the store's real,
   operating support address found in the source repo), with the listing
   title/slug prefilled. No invented `marketplace@lanthanides.io` address
   (DESIGN's example) — it does not exist. Stored per-seller in
   `sellers.yml` (`contact_email`) so the owner can swap it in one line.

10. **Buyer-protection copy names no payment processor.** The brief's
    suggested "PayPal-backed returns" line would be false — the store runs
    Stripe checkout. The copy describes only what is real: photo/video
    documentation on receipt, the seller's 30-day-return policy, and the fact
    that payment happens directly with the seller, off-platform.

11. **`catalog_average` (the brief's `price_reference`) computes over
    variants** per (element × form) cell, reporting both variant count and
    listing count, with the leave-one-out comparison gated at ≥5 *other
    listings* — which today (one listing per cell) means the "vs. average"
    hint renders nowhere. The endpoint and computation exist, labeled
    `basis: seller_catalog` with an explicit disclaimer; the site's sourced
    ledger prices are never rendered next to marketplace prices, and
    marketplace prices never feed `_data/` (DESIGN Q1–Q3 adopted).

12. **Elements beyond the site's 31-element catalog are allowed** in
    listings (the store sells Cd, W, Bi, Te…). Symbols validate against the
    full periodic table; only symbols in the site catalog get
    `/elements/<Sym>/` cross-links and regulatory badges.

13. **The two source price inversions import verbatim** (terbium 90 g >
    150 g; Devarda's 250 g > 450 g), each carrying the source's own
    "pending owner review" caveat as a variant note. Silently "fixing" prices
    would fabricate data.

14. **Excluded from import** (third-party marks / non-catalog): the
    eBay-processed `metals.jpeg`, hero PNGs, `storelogo.png` (Periodic Tech
    brand ≠ the kazakhelements marketplace identity — the avatar is a
    monogram SVG per the brief), the Shopify lineage comment, Stripe prose,
    `specimen-kit.zip`. SKUs are kept only as opaque `legacy_sku`.

15. **Tests use vitest** (one dev-only dependency). The repo has no test
    framework; the brief mandates tests (idempotency, counts, integration).
    Build-time integrity assertions in `lib/marketplace` additionally enforce
    the invariants on every build, matching the house `assertDataIntegrity`
    pattern, and `scripts/verify-marketplace.mjs` checks built HTML.

16. **Quarantine hardening**: `periodictech` added to `tsconfig.json`
    `exclude` and `.eslintrc.json` `ignorePatterns` — shared config strictly
    required so the vendored Next-16/React-19 tree can never leak into this
    app's typecheck/lint. (The folder was already gitignored as commit #1.)

17. **Placeholder listings are not used** — the source repo was found, so
    all 19 listings are real imports with `status: preliminary`. The
    `placeholder` status remains in the schema as specified.

18. **Alt-text hard rule relaxed** from DESIGN's ≥12 chars to non-empty,
    with <12 a soft warning: source alts (e.g. "Cobalt pieces") are short but
    honest, and padding them would be invention.
