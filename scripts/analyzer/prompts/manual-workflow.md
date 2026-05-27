# Manual Workflow — When a Telegram Alert Arrives

The auto-update workflow currently runs in **detection-automated, analysis-human** mode. The scraper polls regulatory sources every 6 hours; new articles trigger a Telegram digest. You then do the analysis manually via Claude.ai (Max subscription) and commit the changes.

When autonomous Anthropic-API analysis is added later, steps 2–4 below get automated and this file becomes documentation of "what the bot does."

## When you get a Telegram alert

You'll see a message like:

```
🔔 REE regulatory monitor
3 new articles detected at 2026-05-27 12:35 UTC

━━━━━━━━━━━━━━━━━━━━
📰 商务部公告2026年第15号 关于将钬等五种稀土...
   MOFCOM 商务部 · language: zh · 2026-06-15
   [first 350 chars of body]

━━━━━━━━━━━━━━━━━━━━
📰 Federal Register: Notice of Section 301 Modification...
   Federal Register — USTR · 2026-05-26
   ...
```

For each article in the digest, work through the steps below.

## Step 1 — Open the article and triage

Click the article link. Read the headline and first paragraph.

If the title is in Chinese and you can't quickly assess: skip to Step 2 and let Claude.ai translate as part of triage.

Quickly ask yourself: *is this a real regulatory change or just market chatter?* If it's obviously a quarterly statistics release or press fluff, mark it seen (commit an empty entry to `scripts/run_state.json` if needed) and move on.

## Step 2 — Triage in Claude.ai

1. Open https://claude.ai (your Max subscription).
2. Start a new conversation.
3. Paste the **full content** of `scripts/analyzer/prompts/triage.md` from this repo as the first message context.
4. Then paste the article (URL + title + body). Claude will return a JSON object:

```json
{
  "sensitivity": 1-10,
  "category": "...",
  "elements_affected": [...],
  "instruments_mentioned": [...],
  "dates_mentioned": [...],
  "headline": "...",
  "reasoning": "..."
}
```

5. Decide based on the sensitivity score:
   - **1–3 (noise):** mark seen in `scripts/run_state.json`. No further action.
   - **4–6 (real, routine):** go to Step 3 (YAML update).
   - **7–9 (significant):** Step 3 (YAML) + Step 4 (framework markdown).
   - **10 (critical):** do not auto-edit anything. Read the article carefully, decide manually whether and how to update the data + framework. Flag for review by the partner.

## Step 3 — Draft YAML diff in Claude.ai (sensitivity 4+)

1. In the same Claude.ai conversation, paste the content of `scripts/analyzer/prompts/extract_regulatory.md`.
2. Tell Claude: *"Apply the extract_regulatory prompt to the article above. The current site has these regulatory files: [paste contents of relevant `_data/regulatory/*.yml` files for context]."*
3. Claude returns a JSON object containing:
   - `target_file`: which file to create or edit
   - `operation`: create / update / no_change_needed
   - `yaml_content`: the FULL new file content
   - `diff_summary`: bullet list of what changed
   - `pr_title` and `pr_body`: ready-to-use PR description

4. Save Claude's `yaml_content` to the target file path in your local clone:
   ```bash
   cd ~/code/lanthanides.io
   # paste yaml_content into _data/regulatory/mofcom_NN_2026.yml
   ```

5. Verify the file is valid YAML:
   ```bash
   python -c "import yaml; yaml.safe_load(open('_data/regulatory/mofcom_NN_2026.yml'))"
   ```

## Step 4 — Draft framework markdown edits (sensitivity 6+)

1. In the same Claude.ai conversation, paste `scripts/analyzer/prompts/update_framework.md`.
2. Then: *"Apply the update_framework prompt. Here's the current pages/framework.md: [paste the full file or relevant sections]."*
3. Claude returns a JSON with `edits` (array of `old_text` / `new_text` pairs).
4. Apply each edit to `pages/framework.md` in your local clone — find-and-replace, verifying each `old_text` matches exactly once before applying.

## Step 5 — Commit and push

```bash
cd ~/code/lanthanides.io
git checkout -b regulatory/{date}-{short-summary}
git add _data/ pages/framework.md
git commit -m "regulatory: {pr_title from Claude's output}

{diff_summary}

Source: {article URL}
Triage sensitivity: {score}/10"
git push -u origin regulatory/{date}-{short-summary}
gh pr create --title "..." --body "..."   # use the pr_body from Claude
```

Or just push to main directly if it's a minor update you trust — but for anything sensitivity 6+, a PR you self-approve gives you a 30-second sanity check before live.

GitHub Pages rebuilds in ~45 seconds after merge. The framework page is then live.

## Step 6 — Mark the article as notified

If your scraper-state file (`scripts/run_state.json`) hasn't been updated by the workflow, manually add the article URL to its `notified_urls` list so you don't get the same alert on next run.

Actually — the orchestrator already adds new articles to `notified_urls` after Telegram dispatch, so you don't normally need to do this manually. Only do it if you've decided an article is noise and want to suppress re-alerting on edge cases.

## When in doubt

- **Date discrepancy** between Claude's draft and the existing site data: trust the site's `_data/regulatory/*.yml` baseline, and update it if the new article actually changes a date. If the new article doesn't explicitly mention a date but Claude inferred one, leave the date alone.
- **Element classification ambiguity** (e.g., "is this Tier 2 or Tier 3?"): err toward Tier 3. False positives create one extra license requirement; false negatives ship a buyer into a license trap.
- **Whether to update the framework page**: only for sensitivity 6+. Below that, the YAML data is the source of truth and the framework's narrative stays correct.
- **Whether to merge your own PR**: for sensitivity 4–6, self-approve and merge. For 7+, ping the partner for a second pair of eyes.

## What happens when API access is added later

When `ANTHROPIC_API_KEY` becomes available:

1. Add the secret to repo settings.
2. Add `scripts/analyzer/triage.py`, `extract.py`, `update_framework.py` (Python wrappers around the prompts).
3. Update `scripts/run_monitor.py` to call them between scrape and notify.
4. Telegram messages become "PR opened: regulatory/...." with the auto-drafted PR link instead of raw article text.
5. This manual workflow file becomes the "what the bot does" reference doc.

The prompts stay the same. The Telegram dispatcher stays the same. Only the analyzer layer gets activated.
