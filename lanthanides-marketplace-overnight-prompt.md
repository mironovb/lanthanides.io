# Lanthanides Marketplace (Preliminary) — Overnight Claude Code Build

Two parts: **Part 1** is the prompt you paste into Claude Code. **Part 2** is the runbook for launching it on Fable 5 and orchestrating the overnight run.

Before launching:

- Drop the **periodictech** store repo (folder) into the root of the lanthanodes.io repo — expected path `./periodictech`. The prompt's very first task is to gitignore it, so it will never be committed into the main repo; everything usable will be pulled *out* of it instead.
- `<<SEED_SELLER_PASSWORD_NOTE>>` — leave as-is unless you want a specific password scheme.

---

## Part 1 — The prompt (paste everything below the line into Claude Code)

---

# MISSION

You are Claude Code running on Claude Fable 5, working **overnight and unattended** in the lanthanodes.io repository (your current working directory). You have a very large token budget and maximum reasoning available for this run — spend both on breadth of implementation and verification loops, not on re-reading the same files.

**Ultrathink.** At every phase boundary, every irreversible action (schema, gitignore, deletes, bulk import), and every confusing failure: ultrathink first, then act.

Build the site's second most important feature end to end: **Lanthanides Marketplace (Preliminary)** — the second item in the main navigation.

## Business context (shapes copy, UI, and priorities)

lanthanodes.io is a trusted, expertise-driven marketplace for rare earth metals, specialized materials, and high-tech equipment. Positioning: "eBay is for everyday goods; this is the professional marketplace for specialized materials." Trust is the product: verified specifications, visible provenance on every listing, published reference prices to dampen speculation, and buyer protection with photo/video documentation on receipt. Buyers are manufacturers, researchers, collectors, and investors. The founder has ~6 years and ~10,000 transactions selling rare earth samples at retail — the seed catalog and seed seller come from that existing business.

Because trust is the product, the preliminary marketplace must already *look* trustworthy: real listings, real photos, a visible provenance section on every listing, and a named verified seller.

## Non-negotiable outcomes

1. **Nav**: "Lanthanides Marketplace" appears **second** in the main navigation (desktop and mobile), with a small "Preliminary" badge, routing to `/marketplace`.
2. **Data**: all sample listings from the periodictech store repo are imported — title, description, specs, **every photo**, and **provenance** — normalized into a proper schema.
3. **Attribution**: seed user **`kazakhelements`** exists as the platform's **first registered user** (a verified seller); every imported listing is attributed to them, and their public seller profile page works.
4. **All layers exist in preliminary form**: schema + migrations, import pipeline, read API, browse UI, listing detail UI, seller profile, search/filter, seed scripts, tests, docs.
5. Everything is committed on branch `feature/lanthanides-marketplace-preliminary` with a green build, passing tests, and a `HANDOFF.md`.

## Inputs

- **Main repo**: current working directory (lanthanodes.io).
- **Source repo**: periodictech, vendored **inside** this repo at `./periodictech`. If that exact path doesn't exist, search the repo root (and one level down) for a directory matching `/period(ic)?[-_ ]?(tech|elements)/i` before concluding it's missing.
- **Quarantine rule**: `./periodictech` must NEVER be committed into lanthanodes.io. Your first git action (Phase 0, Step 0) is to gitignore it. Treat it as read-only source material. **Pull everything usable out of it** — every listing, every photo, every provenance/COA/certificate document, any category or price metadata — by *copying* into the main repo's own directories (those copies are committed; the vendored folder is not).
- **Content ownership**: periodictech is our own first-party store; its listings, photos, and provenance text are ours to migrate. Import listing content only — do **not** carry over any third-party marks found in its templates (marketplace logos, payment brand assets, etc.).
- **Never fabricate listings.** If the source repo truly cannot be located, skip the import, build everything else against 3 clearly labeled placeholder listings (`status: placeholder`), and flag this at the top of `HANDOFF.md`.

## Operating rules for the unattended run

- **Do not stop to ask questions.** Make the best call, record it in `docs/marketplace/ASSUMPTIONS.md`, and keep moving.
- Work in phases. After each phase: run the build and tests, fix what broke, then commit with a conventional message (`feat(marketplace): …`, `chore(marketplace): …`).
- Maintain `docs/marketplace/TODO.md` as a live checklist. Update it as you go; it is your source of truth if context gets compacted.
- Match the repo's existing stack, conventions, and design system. Do not introduce new frameworks. Add a dependency only when clearly necessary (e.g., a lightweight ORM if no persistence layer exists).
- Do not modify unrelated pages or components, except the nav and any shared config strictly required to mount the new route.
- Keep context lean between phases: rely on `PLAN.md`, `TODO.md`, and the latest diffs rather than re-reading history.

## Mandatory: use agent workflows

Do not run this single-threaded. You must use Claude Code's subagent workflows explicitly:

- In Phase 0, before anything else, write custom agent definitions to `.claude/agents/`: `recon-lanthanodes`, `recon-periodictech`, `marketplace-designer` (all read-only tools), `api-builder`, `frontend-builder`, and `qa-fidelity` (read-only). These definitions are part of the deliverable — commit them.
- Dispatch phase work through these agents exactly as laid out in the orchestration section below; run independent workstreams in parallel.
- Keep integration, commits, conflict resolution, and judgment calls in the main orchestrator loop. Ultrathink at every integration point.

## PHASE 0 — Recon and plan (parallel subagents)

**Step 0 — quarantine periodictech (before any other git action).** Create branch `feature/lanthanides-marketplace-preliminary`. Add `/periodictech/` to `.gitignore` (create the file if missing). If the folder is already tracked, run `git rm -r --cached periodictech` as well. Verify with `git check-ignore -v periodictech/` and confirm `git status` shows it untracked. Make this the first commit.

**Step 1 — write the agent workflow definitions** to `.claude/agents/` (see the mandatory workflows section). Commit.

**Step 2 — dispatch three parallel read-only recon agents:**

- **Agent A — lanthanodes recon**: map the main repo. Stack, router, nav component location, styling/design system, persistence layer and ORM, auth (if any), test framework, scripts, CI. Write `docs/marketplace/RECON-lanthanodes.md`.
- **Agent B — source recon**: map periodictech. Where listings live (HTML pages, JSON, CMS/db export, markdown), where images are stored, where provenance/origin/COA text lives, total listing count, fields available per listing. Write `docs/marketplace/RECON-periodictech.md`.
- **Agent C — design draft**: from the business context above, draft the data model and API surface (entities: users, listings, listing_images, provenance_records, categories, price_reference). Write `docs/marketplace/DESIGN.md`.

Ultrathink while merging all three into `docs/marketplace/PLAN.md` with a concrete task list per phase — this plan steers the whole night. Commit.

## PHASE 1 — Data layer

Implement schema and migrations in the repo's existing persistence layer (if none exists, add SQLite plus the lightest ORM idiomatic to the stack):

- `users`: id, handle (unique), display_name, role (seller|buyer|admin), country, verified (bool), joined_at, bio, avatar_path
- `listings`: id, seller_id → users, slug (unique), title, element_symbol, category (`pure-metal` | `oxide` | `mineral-ore` | `high-tech` | `equipment`), form (ingot, powder, crystal, ampoule, sputtering-target, …), purity (numeric, e.g. 99.95), weight_grams, price_cents, currency, description_md, status (`preliminary` | `placeholder`), created_at
- `listing_images`: id, listing_id, path, alt, sort_order, is_primary
- `provenance_records`: id, listing_id, origin_country, source_type (mine|refinery|lab|private-collection|recycled), chain_of_custody_md, document_paths (json), acquired_at, notes
- `price_reference`: element_symbol, form, avg_price_per_gram_cents, sample_size, updated_at

Add a seed entrypoint and fixtures for tests. Commit.

## PHASE 2 — Seed user: kazakhelements

Create the platform's first registered user:

- handle `kazakhelements`, display_name "Kazakh Elements", role seller, country Kazakhstan, `verified: true`
- joined_at: the first commit date of the periodictech repo if discoverable, else today
- bio drawn from the business context (6+ years selling rare earth samples, ~10,000 transactions), written in the seller's voice
- avatar: a simple monogram/SVG placeholder consistent with the design system

If the repo has a real auth system, register the user through it properly, with the password taken from env `SEED_SELLER_PASSWORD` (generate one and document how to set it in `.env.example` — never commit a secret). If there is no auth system, create the user at the data layer and note in ASSUMPTIONS.md that registration/login is out of scope for preliminary. `<<SEED_SELLER_PASSWORD_NOTE>>`

## PHASE 3 — Import pipeline from periodictech

Write `scripts/import-periodictech.*` (language matching the stack). Requirements:

1. **Inventory first**: walk `./periodictech`, detect the listing format, and log a manifest: listing count, fields present, image count, document count (COAs/certificates/PDFs). Do not guess the format — inspect real files, then ultrathink about the parsing strategy before writing the parser.
2. **Extract per listing**: title, description, element, specs (purity / form / weight), price, **all** photos, and provenance text (search for sections/fields named provenance, origin, source, history, certificate, COA, mined, locality).
3. **Normalize** into the Phase 1 schema: slugify titles, prices to cents, parse purity to a number, map to the category enum, and set `seller = kazakhelements` on every record.
4. **Photos and documents**: copy out of `./periodictech` into the main repo's static-asset convention (e.g. `public/marketplace/<slug>/…`), preserve originals, set alt text from titles, mark the first image primary. Copy any COA/certificate/provenance documents alongside and link them via `provenance_records.document_paths`. If an image-processing lib is already a dependency, generate a web-sized variant; otherwise skip resizing. Remember: copies are committed, the vendored folder is not.
5. **Provenance**: if a listing has no explicit provenance, create a minimal honest record — origin_country "Kazakhstan (seller-declared)", source_type `private-collection`, notes "Imported from periodictech catalog; provenance verification pending" — and count these separately in the report. Never invent specific mines, certificates, or documents.
6. **Price reference**: after import, compute `price_reference` rows as the average imported price per gram per (element, form) with `sample_size`.
7. **Idempotent**: upsert by slug so re-runs are safe.
8. Emit `docs/marketplace/IMPORT_REPORT.md`: totals, per-category counts, listings missing photos/prices/explicit provenance, skipped items and why, and a source-manifest vs. imported-count reconciliation.

Run it. Verify imported count equals the manifest count (or explain every discrepancy in the report). Commit.

## PHASE 4 — API layer

Follow whatever pattern the repo already uses (REST route handlers, tRPC, server components/loaders — match it). Read-only for preliminary:

- `GET /api/marketplace/listings` — filters: element, category, form, min/max price, free-text `q`; sort: newest, price asc/desc; paginated
- `GET /api/marketplace/listings/[slug]` — full listing with images + provenance + seller
- `GET /api/marketplace/sellers/[handle]` — profile + their listings
- `GET /api/marketplace/price-reference`

Input validation, sensible 404/400s, and a handful of integration tests against seeded fixtures. Commit.

## PHASE 5 — Frontend

Respect the existing design system exactly — reuse its components, tokens, spacing. Build:

1. **Nav**: insert "Lanthanides Marketplace" as the **second** item, with a subtle "Preliminary" pill. Update the mobile menu too.
2. **`/marketplace` (browse)**: a one-line trust strip ("Verified specs · Provenance on every listing · Buyer protection"), filter sidebar (element, category, form, price), sort control, responsive card grid. Card: primary photo, title, element badge, purity, weight, price, and "kazakhelements ✓" seller line.
3. **`/marketplace/[slug]` (detail)**: gallery with all imported photos; spec table (element, purity, form, weight); price plus per-gram price with a "vs. reference average" hint when price_reference has data; a prominent **Provenance** section (origin, source type, chain of custody, documents if any, and a "Verification pending" badge where applicable); seller card linking to the profile; a buyer-protection explainer block (photo/video documentation on receipt, PayPal-backed returns — copy only, no payment integration); and a stubbed "Request purchase" CTA (mailto inquiry or an interest log — no checkout in preliminary).
4. **`/marketplace/sellers/kazakhelements`**: avatar, verified badge, country, member-since, bio, stats (listing count, categories covered), grid of their listings.
5. Empty/loading/error states, 404s for bad slugs, page titles and OG tags (OG image = primary listing photo).

Commit per page or logical chunk.

## PHASE 6 — Verification loop (spend tokens here)

- Full build + full test suite; fix everything that breaks. When a failure is confusing, ultrathink before patching — no whack-a-mole fixes at 3 a.m.
- Confirm the quarantine held: `git ls-files | grep -i periodictech` must return nothing.
- Add tests: import idempotency; imported count matches report; every listing has ≥1 image file that exists on disk; every listing has a provenance record; nav renders the marketplace link second; the detail page renders the provenance section.
- If Playwright/Cypress exists (or is trivial to add headlessly), script a pass over `/marketplace`, one detail page, and the seller profile; save screenshots to `docs/marketplace/screenshots/`.
- **Data-fidelity QA subagent**: pick 10 random imported listings, open their source files in periodictech, and confirm title/photo/provenance fidelity. Append findings to `IMPORT_REPORT.md`.
- Sanity-check performance: no multi-MB unoptimized images on the browse grid.

## PHASE 7 — Handoff

Write `docs/marketplace/HANDOFF.md`: what was built, how to run it (dev server, seed, import commands), assumptions made, known gaps, and suggested next steps (real registration/auth, PayPal buyer-protection flow, spec-verification workflow, automated price index, seller onboarding). Final commit on the feature branch. Do not push or open a PR unless a remote and credentials already exist; if they do, open a **draft** PR titled "feat: Lanthanides Marketplace (Preliminary)".

## Subagent orchestration inside this run

Run this as an explicit workflow using the agents defined in `.claude/agents/`:

- Phase 0: `recon-lanthanodes`, `recon-periodictech`, and `marketplace-designer` in parallel (**read-only**).
- Phases 1 → 2 → 3 run sequentially in the main loop — they share evolving schema state.
- Once Phase 3 lands, dispatch `api-builder` (Phase 4) and `frontend-builder` (Phase 5) **in parallel**, coordinating only through the committed schema and a shared types module; the main loop integrates and resolves conflicts, ultrathinking at the merge.
- Phase 6: `qa-fidelity` runs the data-fidelity audit while the main loop fixes build/test failures.
- Delegate narrow, well-scoped tasks to subagents; keep integration, commits, and judgment in the main loop. Subagents cannot answer permission prompts, so keep them read-only where possible.

## Definition of done — verify each, check off in TODO.md

- [ ] "Lanthanides Marketplace" is the second nav item on desktop and mobile, with Preliminary badge
- [ ] Imported listing count = source manifest count, or every discrepancy is explained in IMPORT_REPORT.md
- [ ] 100% of listings render ≥1 photo and a provenance section
- [ ] `kazakhelements` exists, is verified, owns all listings, and has a working profile page
- [ ] Build green, tests green, screenshots captured (if a browser runner was available)
- [ ] `./periodictech` gitignored and absent from `git ls-files`; all photos/documents copied out into committed assets
- [ ] `.claude/agents/` workflow definitions committed and actually used for the phases above
- [ ] IMPORT_REPORT.md, ASSUMPTIONS.md, PLAN.md, TODO.md, HANDOFF.md all committed on `feature/lanthanides-marketplace-preliminary`

*(end of prompt)*

---

## Part 2 — Runbook: launching and orchestrating the overnight run

### Recommended architecture: one orchestrator, phase-scoped subagents

Resist the temptation to launch a swarm of independent agents. The schema is the coupling point of this feature — parallel agents that don't share it will diverge. The prompt above therefore uses the pattern that works reliably overnight: a single long-running orchestrator session that (a) parallelizes only read-only recon and post-schema implementation, (b) checkpoints with git commits after every phase, and (c) keeps durable state in committed markdown files (`PLAN.md`, `TODO.md`, `ASSUMPTIONS.md`) so progress survives any context compaction. Fable 5 in the main loop does integration and judgment; subagents do narrow, disposable work.

### Setup (5 minutes)

1. Copy the periodictech repo folder into the root of the lanthanodes.io repo as `./periodictech`. Don't gitignore or commit anything yourself — the prompt makes quarantining it the agent's very first git action, and verifies it again in Phase 6.
2. Start from a clean git state in the lanthanodes.io repo. Strongly consider running in a fresh clone, a git worktree, or a container — the run is unattended and will execute shell commands.
3. Save Part 1 (everything between the two "---" markers) as `overnight-prompt.md` in the repo root.
4. If the repo has a `CLAUDE.md`, great — the agent will read it. If not, consider adding a two-line one describing the stack and how to run tests; it improves every future session too.

### Launch on Fable 5 — regular interactive UI (recommended for an open laptop)

Since the laptop stays open all night, run the normal Claude Code interface — no `-p`. The trick is starting the *regular UI* with permissions already unblocked, then kicking it off with a short message that points at the prompt file instead of a giant paste:

    claude --model claude-fable-5 --dangerously-skip-permissions

Then type this as your first message:

    Read overnight-prompt.md in the repo root and execute it end to end.
    Do not stop, do not ask questions, and do not end your turn until the
    Definition of Done at the bottom is fully checked off. ultrathink

Why this shape works overnight:

- The flag applies to the interactive UI too — you get the full live interface (streaming output, todo list, tool calls scrolling by) with zero approval prompts to strand the run at 2 a.m. If you forget the flag, **Shift+Tab** cycles permission modes in-session; make sure you're on the bypass mode, since "accept edits" alone still prompts on shell commands, and subagents can't answer prompts at all.
- Kicking off via "read the file" keeps `overnight-prompt.md` as the source of truth and avoids paste-mangling 200 lines in a terminal.
- The explicit "do not end your turn until the Definition of Done is checked" line is your insurance against the one interactive failure mode headless doesn't have: the agent finishing a turn early with nobody awake to say "continue."
- After it starts working, you can type one more message — it queues and delivers when the current turn ends: `If you stopped before the Definition of Done is complete, re-read TODO.md and continue. ultrathink`
- If you find it stopped early in the morning anyway, recovery is one line: `continue from TODO.md`. If the terminal itself died, `claude --continue` reopens the most recent session with full history.

Fallback — detached headless (only if you decide the laptop might close after all):

    nohup claude -p "$(cat overnight-prompt.md)" \
      --model claude-fable-5 --dangerously-skip-permissions \
      --verbose --output-format stream-json > marketplace-run.log 2>&1 &

Notes on flags:

- `--dangerously-skip-permissions` removes approval prompts entirely — only use it inside the isolated clone/worktree from step 2, with a backup copy of `periodictech/` outside the repo. The safer middle ground is `--permission-mode acceptEdits` plus an `--allowedTools` allowlist (e.g. Edit, Write, and scoped Bash patterns like `Bash(npm run *)`, `Bash(git commit *)`) in `.claude/settings.json` — but expect it to prompt on anything outside the allowlist, which risks a stalled run.
- Avoid a low `--max-turns`; you *want* the long loop. Cost control here is the isolated repo + your budget, not turn caps.
- Exact flag names and current options: https://docs.claude.com/en/docs/claude-code/overview (CLI reference pages).

### Submitting the run for the night from VS Code

1. **Open the repo**: File → Open Folder → the lanthanodes.io repo. Confirm `periodictech/` is sitting in the root and `overnight-prompt.md` is saved.
2. **Open the integrated terminal**: View → Terminal (or Ctrl+`). Maximize the panel so you can glance at progress from across the room.
3. **Start the interactive run** exactly as above: `claude --model claude-fable-5 --dangerously-skip-permissions`, send the kickoff message, watch Phase 0 spin up its recon subagents, optionally queue the insurance nudge, and walk away. (The Claude Code VS Code extension panel is also a regular interactive UI and works the same way — start it, set bypass permissions, send the same kickoff message — but the terminal REPL is the battle-tested path for very long runs.)
4. **Disable everything that can kill the session**: VS Code must stay open, so — Windows: Settings → System → Power & battery → Sleep **Never** while plugged in (or `powercfg /change standby-timeout-ac 0`); macOS: run `caffeinate -i` in a second terminal tab. Plug the laptop in. Turning the *display* off or letting it lock is fine; system sleep is not. Disable automatic OS updates/restarts for the night.
5. **Morning review in VS Code**: scroll the session (or just read it live), then open `docs/marketplace/HANDOFF.md` → `IMPORT_REPORT.md` → `ASSUMPTIONS.md` → the screenshots folder, then walk the branch diff in the Source Control panel.

### Maximizing the "one night, huge token budget" mandate

- **Max reasoning + ultrathink**: since you're running maximum reasoning, the prompt now also carries `ultrathink` directives — a global one in the mission plus targeted ones at the highest-leverage decision points (Phase 0 plan merge, Phase 3 parser design, Phase 4/5 integration, confusing Phase 6 failures). That concentrates deep thinking where it changes outcomes; the mechanical recon subagents don't need it.
- The prompt already tells the agent where to burn tokens: Phase 6 verification, the data-fidelity QA subagent, and screenshots. Those loops are what turn a big token budget into quality rather than sprawl.
- Fable 5 is at its best with explicit success criteria — that's what the Definition of Done block is for. Don't trim it.
- If you want a mid-run checkpoint without waking up, add a simple Stop/PostToolUse hook that pushes the branch or pings you (hooks run even in headless mode).
- In the morning, read in this order: `HANDOFF.md` → `IMPORT_REPORT.md` → `ASSUMPTIONS.md` → the screenshots → `git log --oneline`.

### If you'd rather split into two sessions

A perfectly good variant: run Phase 0 interactively first (10–15 min, you sanity-check `PLAN.md` and the two RECON files before bed), then send `Execute PLAN.md phases 1–7 end to end. Do not stop until the Definition of Done is checked. ultrathink` in the same session and go to sleep. You trade a little automation for a much lower chance of the agent planning all night around a wrong assumption about either repo.
