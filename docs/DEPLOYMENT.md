# DEPLOYMENT.md: Vercel deployment

How **lanthanides.io** is deployed on Vercel after moving off GitHub Pages.
Grounded in the actual repo config (`next.config.mjs`, `lib/seo.ts`, and the
data-only GitHub Actions pipelines), not generic advice. The key operational
rule: **Vercel is the only web deployer.** GitHub Actions can collect data and
open PRs, but they do not deploy the site.

> **2026-07 refocus.** The old database-backed layer (Prisma + Postgres:
> seller listings, screened offers, the alerts waitlist, the discussion board)
> was removed; every reference page and export derives from the versioned
> `_data/`, `_elements/`, and `_articles/` files. What remains of the database
> is **one Neon table**: the contributions inbox (`price_contributions`,
> `db/schema.sql`), which holds community price contributions awaiting review
> and nothing else. It needs one env var (`DATABASE_URL`), one idempotent
> setup command (`npm run db:init`), no migrations engine, and the site
> degrades gracefully without it. Publishing stays the reviewed git pipeline
> (`/contribute/`); the build never reads the database.

---

## TL;DR

1. The site is not fully static export material. GitHub Pages **cannot** serve
   it (API route handlers, two request-rendered pages, the redirects). The
   production host is **Vercel**.
2. **The build command is pinned by `vercel.json` to plain `next build`.** It
   overrides any stale dashboard Build Command (the old
   `prisma generate && ... && next build` override is what broke deploys after
   Prisma was removed); you can also clear the override in Project Settings →
   Build & Development Settings.
3. **One env var: `DATABASE_URL`** (Vercel Project Settings → Environment
   Variables), pointing at the Neon database that holds the single
   contributions-inbox table. Optional: without it the site still deploys and
   works; only the inbox reports itself unavailable.
4. **Heads-up: the canonical origin is `https://www.lanthanides.io`**,
   hardcoded in `lib/seo.ts` and matching `CNAME`. **`www` is the primary
   domain**; the apex (`lanthanides.io`) must 301 → `www`. Get this backwards and
   every canonical URL, the sitemap, and the feeds point at the wrong host.
5. Deploy to **Vercel**. No GitHub Actions workflow deploys the web app.
6. Move DNS: release the domain from GitHub Pages, point `www` (CNAME) + apex (A)
   at Vercel, let it issue TLS, then run the [parity checks](#5-post-cutover-verification).

---

## 0. Why the host has to be a Node server

| Surface | Why it needs a server |
|:--|:--|
| `/api/price-gauge`, `/api/export/[format]`, `/api/dashboard/brief` | Route handlers: server code per request (file-derived, no DB) |
| `/api/contributions` | Route handler: writes one pending row to the contributions inbox |
| `/tools/price-gauge` | Reads `searchParams`, request-rendered |
| `/contribute` | Request-rendered: shows the live review queue (resilient DB read) |
| Reference pages, `/dashboard` | SSG: built by Node (no `output: 'export'`) |
| The redirects + `trailingSlash` | Served by Next from `next.config.mjs` |

`next.config.mjs` has **no `output: 'export'`**, so this is a standard Next
server build. Do **not** add `output: 'export'`; it would strip the API routes
and the redirects.

---

## 1. Pre-flight (run locally first)

```bash
npm ci
npm run build      # THE GATE: must pass before you deploy anything
npm run lint       # should be clean
```

Inventory of what the deploy must satisfy (the preservation contract from
`CLAUDE.md` hard rule #2 / `docs/AUDIT.md` §2):

- `trailingSlash: true`: every page URL keeps its trailing slash.
- Machine-readable endpoints keep their exact path with **no** trailing slash:
  `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/movements.xml`,
  `/assets/data/fluctuations.json`, `/assets/images/site.webmanifest`.
- The 301s (already in `next.config.mjs`, host-agnostic):
  `/prices → /elements/`, `/vision → /about/`,
  `/assets/data/elements.json → /api/export/json/`, plus the retired
  DB-era routes `/sell → /contribute/`, `/offers → /data/`,
  `/alerts → /regulatory/`, `/discussion(/:id) → /contribute/`.
- Element URLs are **case-sensitive** (`/elements/Dy/`, not `/elements/dy/`).
- Preserved in-page anchors: `/methodology/#display-price` (+ siblings),
  `/framework/#pricing`, `/framework/#us-side-tariff-stack-may-14-2026`.

Because `trailingSlash` and the redirects live in `next.config.mjs`, they travel
with the app to Vercel. You do not configure them at the host level.

---

## 2. Environment variables

One, optional:

| Var | Required | Value |
|:--|:--|:--|
| `DATABASE_URL` | for the inbox only | The Neon connection string (pooled endpoint is fine; the app uses Neon's HTTP driver). Powers `POST /api/contributions` and the review queue on `/contribute/`. Unset, both degrade gracefully and everything else works. Never commit it (CLAUDE.md hard rule #3). |

Set it in **Vercel Project Settings → Environment Variables**. Create the
table once from your machine with `npm run db:init` (idempotent; reads
`DATABASE_URL` from `.env`).

> **Pipeline secrets are separate.** The web app never uses monitor secrets such
> as `TELEGRAM_BOT_TOKEN` or `DEEPL_API_KEY`. The scheduled regulatory-monitor
> GitHub Action has been removed; do not add those to Vercel.

---

## 3. Deploy the app on Vercel

1. **Import** the GitHub repo at vercel.com → New Project. Framework preset:
   **Next.js** (auto-detected).
2. **Build command**: `vercel.json` pins `next build`, overriding any stale
   dashboard override. No migrations, no seeding, no postinstall hooks.
3. **Deploy.** First build provisions everything.

---

## 4. Move the domain from GitHub Pages to Vercel

The canonical origin is **`https://www.lanthanides.io`** (`lib/seo.ts:16`,
`CNAME` = `www.lanthanides.io`). So **`www` is primary; the apex 301s to `www`.**

### 4.1 Lower TTL first (do this a day ahead if you can)

At your DNS registrar, drop the TTL on the existing `lanthanides.io` records to
**300s** so the cutover propagates fast and rollback is quick.

### 4.2 Add the domain on Vercel

- **Vercel:** Project → Settings → Domains → add **`www.lanthanides.io`** and set
  it **Primary**; add `lanthanides.io` and choose **Redirect → www**. Vercel shows
  the exact DNS records to create; use those.

### 4.3 Release the domain from GitHub Pages

In the **GitHub repo → Settings → Pages**, clear the **Custom domain** field
(this removes GitHub's domain hold so Vercel can verify). The root `CNAME`
file (`www.lanthanides.io`) is a GitHub-Pages artifact; it is **not** served by
Next (it's in the repo root, not `public/`), so it's harmless to leave; remove it
only if you want to.

### 4.4 Update DNS records at the registrar

Replace the GitHub Pages records with Vercel's. Typical values (confirm
against what your dashboard shows):

| Record | Host/Name | Value | Replaces |
|:--|:--|:--|:--|
| `CNAME` | `www` | `cname.vercel-dns.com` | old `www` CNAME → `<user>.github.io` |
| `A` | `@` (apex) | `76.76.21.21` | GitHub Pages A records `185.199.108 to 111.153` |

### 4.5 TLS + verify

Vercel auto-issues a Let's Encrypt cert once DNS resolves (minutes to a couple
of hours). Confirm both `https://www.lanthanides.io/` loads and
`https://lanthanides.io/` 301s to `www`.

---

## 5. Post-cutover verification

Run against the live host once DNS resolves:

```bash
# Trailing-slash pages resolve 200
curl -sI https://www.lanthanides.io/elements/Dy/ | head -1

# Apex 301s to www
curl -sI https://lanthanides.io/ | grep -i location

# The preserved 301s
for p in /prices /vision /assets/data/elements.json \
         /sell /offers /alerts /discussion; do
  echo -n "$p -> "; curl -sI "https://www.lanthanides.io$p" | grep -iE 'HTTP|location' | tr '\n' ' '; echo
done

# Machine-readable endpoints (no trailing slash, exact path)
for p in /sitemap.xml /robots.txt /feed.xml /movements.xml \
         /assets/data/fluctuations.json /assets/images/site.webmanifest; do
  echo -n "$p -> "; curl -sI "https://www.lanthanides.io$p" | head -1
done

# File-derived API surfaces
curl -s  "https://www.lanthanides.io/api/price-gauge?element=Dy&form=oxide" | head -c 200
curl -sI https://www.lanthanides.io/api/export/json/ | head -1

# Contributions inbox: page renders, API validates (400 on an empty body means
# the endpoint and DB wiring are alive; 503 means DATABASE_URL is missing)
curl -sI https://www.lanthanides.io/contribute/ | head -1
curl -s -X POST -H 'content-type: application/json' -d '{}' \
  https://www.lanthanides.io/api/contributions/ | head -c 120

# Case-sensitivity: lowercase symbol must NOT resolve as the element page
curl -sI https://www.lanthanides.io/elements/dy/ | head -1
```

Also eyeball:

- `view-source` on `/` → `<link rel="canonical" href="https://www.lanthanides.io/">`
  and `og:url` on the **www** origin.
- TLS cert valid on both apex and www.

---

## 6. Keeping reference data fresh after deploy

Reference data (`_data/`) is read at **build time** (SSG). One GitHub Action
currently opens review PRs for updates:

- `price-update.yml`: weekly (Sun 06:00 UTC) → opens a PR with `_data/` +
  `assets/data/fluctuations.json` changes.

Community contributions arrive through the `/contribute/` form (queued in the
inbox table) or a structured GitHub issue; either way a maintainer reviews and
the accepted observation merges into `_data/` as a PR (see `CONTRIBUTING.md`).

**To turn those PRs into live updates, merge them into the production branch.**
Vercel is connected to the repo, so production-branch merges trigger the web
deploy. No GitHub Actions workflow deploys the site, calls a deploy hook, or
builds a GitHub Pages artifact. SSG pages (`/dashboard` etc.) refresh on
rebuild; the data layer memoises `_data/` per process, so a fresh build is what
picks up new files.

---

## 7. Rollback

Rollback is a Vercel operation: redeploy a previous successful Vercel deployment
or revert the commit on `main`. Do not re-enable GitHub Pages as a rollback path.

---

## Appendix: the removed database era (history)

Until 2026-07 the app carried a Prisma + Postgres (Neon) layer: `Listing`
(`/sell`), `Subscription` (`/alerts`), `ScreenedOffer` (`/offers`), and the
discussion board (`/discussion`). It was removed because it never worked
reliably in production and diluted the product: the ledger's value is the
open, reviewable dataset, and community input belongs in the same reviewed
git pipeline as every other record. The routes 301 to their nearest surviving
surfaces (see §1).

On 2026-07-03 the Neon database itself was cleaned: the old tables
(`listings`, `subscriptions`, `screened_offers`, `discussion_threads`,
`discussion_replies`, `_prisma_migrations`; all empty except the regenerable
220-row seed feed) were dropped, and the single `price_contributions` inbox
table was created in their place (`db/schema.sql`). `docs/ARCHITECTURE.md` §5
and `docs/MIGRATION.md` describe the old DB design as **historical** migration
records.
