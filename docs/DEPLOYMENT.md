# DEPLOYMENT.md: Vercel deployment

How **lanthanides.io** is deployed on Vercel after moving off GitHub Pages.
Grounded in the actual repo config (`next.config.mjs`, `prisma/schema.prisma`,
`lib/seo.ts`, and the data-only GitHub Actions pipelines), not generic advice.
The key operational rule: **Vercel is the only web deployer.** GitHub Actions can
collect data and open PRs, but they do not deploy the site.

---

## TL;DR

1. The site is no longer static. GitHub Pages **cannot** serve it (API routes,
   per-request rendering, a database). The production host is **Vercel**, backed
   by Postgres.
2. **Database is Postgres, already wired in the repo.** `prisma/schema.prisma` is
   `provider = "postgresql"` (with `directUrl`) and a Postgres migration baseline is
   committed — so deploying is just: set `DATABASE_URL`/`DIRECT_URL`, run
   `prisma migrate deploy`, seed once. See [§2](#2-database-postgres-already-wired).
3. **Heads-up — the canonical origin is `https://www.lanthanides.io`**,
   hardcoded in `lib/seo.ts` and matching `CNAME`. **`www` is the primary
   domain**; the apex (`lanthanides.io`) must 301 → `www`. Get this backwards and
   every canonical URL, the sitemap, and the feeds point at the wrong host.
4. Deploy to **Vercel**. No GitHub Actions workflow deploys the web app.
5. Move DNS: release the domain from GitHub Pages, point `www` (CNAME) + apex (A)
   at Vercel, let it issue TLS, then run the [parity checks](#6-post-cutover-verification).

---

## 0. Why the host has to change

The old site was Jekyll → static HTML on GitHub Pages. The new app has surfaces
that **require a running Node server**:

| Surface | Why it needs a server |
|:--|:--|
| `/api/price-gauge`, `/api/listings`, `/api/subscribe`, `/api/export/[format]` | Route handlers — server code per request |
| `/sell`, `/offers`, `/alerts` | `force-dynamic` + Prisma reads/writes (live DB) |
| `/dashboard` and reference pages | SSG/ISR — built/revalidated by Node |
| The 3 redirects + `trailingSlash` | Served by Next from `next.config.mjs` |

`next.config.mjs` has **no `output: 'export'`** (verified), so this is a standard
Next server build. Vercel runs the serverless equivalent of `next build` plus the
Next runtime. Do **not** add `output: 'export'`; it would strip the API routes,
the DB pages, and the redirects.

---

## 1. Pre-flight (run locally first)

```bash
npm ci
npm run build      # THE GATE — must pass before you deploy anything
npm run lint       # should be clean
```

Inventory of what the deploy must satisfy (the preservation contract from
`CLAUDE.md` hard rule #2 / `docs/AUDIT.md` §2):

- `trailingSlash: true` — every page URL keeps its trailing slash.
- Machine-readable endpoints keep their exact path with **no** trailing slash:
  `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/movements.xml`,
  `/assets/data/fluctuations.json`, `/assets/images/site.webmanifest`.
- Three 301s (already in `next.config.mjs`, host-agnostic):
  `/prices → /elements/`, `/vision → /about/`,
  `/assets/data/elements.json → /api/export/json/`.
- Element URLs are **case-sensitive** (`/elements/Dy/`, not `/elements/dy/`).
- Preserved in-page anchors: `/methodology/#display-price` (+ siblings),
  `/framework/#pricing`, `/framework/#us-side-tariff-stack-may-14-2026`.

Because `trailingSlash` and the redirects live in `next.config.mjs`, they travel
with the app to Vercel. You do not configure them at the host level.

---

## 2. Database: Postgres (already wired)

The repo is **Postgres everywhere** — no per-deploy schema surgery:

- `prisma/schema.prisma` → `provider = "postgresql"`, with
  `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`.
- A Postgres migration baseline is committed at
  `prisma/migrations/20260530224526_init/` (`migration_lock.toml` → `postgresql`).
- `package.json` runs `prisma generate` on `postinstall`, so the client is rebuilt
  on every `npm ci`.

So the deploy DB steps are just:

```bash
npx prisma migrate deploy   # apply the committed baseline to the prod DB
npx prisma db seed          # one-time: 220 ScreenedOffer rows (idempotent)
```

**Local dev** also uses Postgres — run a throwaway one with Docker:

```bash
docker run --name lanth-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# .env: set DATABASE_URL and DIRECT_URL to the same local URL (see .env.example)
npx prisma migrate deploy && npx prisma db seed
```

> History: during the migration, dev used SQLite and prod was meant to "switch by
> connection string." That was inaccurate — Prisma's `provider` is a static
> literal — so the repo moved to Postgres everywhere. `docs/ARCHITECTURE.md` §5
> and `docs/MIGRATION.md` §1 still describe the old SQLite-dev framing as
> historical migration records.

---

## 3. Provision the database

Any managed Postgres works. Pick one:

| Provider | Notes |
|:--|:--|
| **Neon** | Serverless Postgres, generous free tier, branchable, built-in pooler — pairs well with Vercel. |
| **Vercel Postgres** | One dashboard if you host on Vercel (Neon under the hood). |
| **Supabase** | Postgres + pooler (port 6543). |

Capture two connection strings (most providers give both):

- **Pooled** URL → `DATABASE_URL` (what the app uses at runtime).
- **Direct** URL → `DIRECT_URL` (what `prisma migrate` uses). See [§7](#7-serverless-gotcha-connection-pooling).

---

## 4. Environment variables

The web app reads these (canonical list from `.env.example` + `CLAUDE.md`):

| Var | Required | Value |
|:--|:--|:--|
| `DATABASE_URL` | **yes** | `postgresql://…` (pooled). Never commit it. |
| `DIRECT_URL` | if pooling | `postgresql://…` (direct, for migrations). |
| `NEXT_PUBLIC_TELEGRAM_BOT_URL` | recommended | `https://t.me/<handle>` — the real MOFCOM alert bot. **`NEXT_PUBLIC_` is inlined into the client bundle at build**, so it must be public-safe (a bot link, never a token). Unset → the "Get alerts" CTAs route to `/alerts/` instead of a dead link. |
| `SCREENING_BACKEND` | optional | Controls the `/offers` honesty banner status (per `CLAUDE.md`). Leave unset for the stubbed state. |

Set these in **Vercel Project Settings -> Environment Variables**. `NODE_ENV=production`
is set by Vercel.

> **Pipeline secrets are separate.** The web app never uses monitor secrets such
> as `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `EMAIL_RECIPIENT`, or
> `DEEPL_API_KEY`. The scheduled regulatory-monitor GitHub Action has been
> removed, so do not add those to Vercel.

---

## 5. Deploy the app on Vercel

1. **Import** the GitHub repo at vercel.com → New Project. Framework preset:
   **Next.js** (auto-detected).
2. **Build command** — `postinstall` already runs `prisma generate` (committed),
   so the build command only needs to apply migrations first (idempotent — a no-op
   when already current):

   ```
   npx prisma migrate deploy && npm run build
   ```

3. **Environment variables** — add the [§4](#4-environment-variables) set for
   Production (and Preview if you want PR previews).
4. **Deploy.** First build provisions everything.
5. **Seed once** (the 220-row `/offers` feed). From your machine with the prod
   `DATABASE_URL` exported, or a Vercel CLI shell:

   ```bash
   DATABASE_URL='postgresql://…' npx prisma db seed
   ```

   The seeder is **idempotent** (`prisma/seed.ts`: clear-then-insert scoped to
   `origin:'seed'` in one transaction) — safe to re-run; it never touches
   `Listing`, `Subscription`, or live `screened` rows.

---

## 6. Move the domain from GitHub Pages to Vercel

The canonical origin is **`https://www.lanthanides.io`** (`lib/seo.ts:16`,
`CNAME` = `www.lanthanides.io`). So **`www` is primary; the apex 301s to `www`.**

### 6.1 Lower TTL first (do this a day ahead if you can)

At your DNS registrar, drop the TTL on the existing `lanthanides.io` records to
**300s** so the cutover propagates fast and rollback is quick.

### 6.2 Add the domain on Vercel

- **Vercel:** Project → Settings → Domains → add **`www.lanthanides.io`** and set
  it **Primary**; add `lanthanides.io` and choose **Redirect → www**. Vercel shows
  the exact DNS records to create — use those.

### 6.3 Release the domain from GitHub Pages

In the **GitHub repo → Settings → Pages**, clear the **Custom domain** field
(this removes GitHub's domain hold so Vercel can verify). The root `CNAME`
file (`www.lanthanides.io`) is a GitHub-Pages artifact — it is **not** served by
Next (it's in the repo root, not `public/`), so it's harmless to leave; remove it
only if you want to.

### 6.4 Update DNS records at the registrar

Replace the GitHub Pages records with Vercel's. Typical values (confirm
against what your dashboard shows):

| Record | Host/Name | Value | Replaces |
|:--|:--|:--|:--|
| `CNAME` | `www` | `cname.vercel-dns.com` | old `www` CNAME → `<user>.github.io` |
| `A` | `@` (apex) | `76.76.21.21` | GitHub Pages A records `185.199.108–111.153` |

### 6.5 TLS + verify

Vercel auto-issues a Let's Encrypt cert once DNS resolves (minutes to a couple
of hours). Confirm both `https://www.lanthanides.io/` loads and
`https://lanthanides.io/` 301s to `www`.

---

## 7. Serverless gotcha: connection pooling

Only relevant on **serverless** hosts (Vercel functions). Each invocation can open
its own DB connection; under load this exhausts Postgres. `lib/db.ts` uses a plain
`PrismaClient` (no driver adapter), so handle pooling at the **connection-string**
level:

- Point `DATABASE_URL` at the provider's **pooled** endpoint (Neon `…-pooler…`,
  Supabase port `6543`, or PgBouncer in transaction mode).
- Point `DIRECT_URL` at the **direct** endpoint — the schema already declares
  `directUrl = env("DIRECT_URL")`, so `prisma migrate` bypasses the pooler.
- Or use **Prisma Accelerate** and skip the manual pooler.

---

## 8. Keeping reference data fresh after deploy

Reference data (`_data/`) is read at **build time** (SSG/ISR). One GitHub Action
currently opens review PRs for updates:

- `price-update.yml` — weekly (Sun 06:00 UTC) → opens a PR with `_data/` +
  `assets/data/fluctuations.json` changes.

**To turn those PRs into live updates, merge them into the production branch.**
Vercel is connected to the repo, so production-branch merges trigger the web
deploy. No GitHub Actions workflow deploys the site, calls a deploy hook, or
builds a GitHub Pages artifact.
- ISR pages (`/dashboard` etc.) also refresh on rebuild; the data layer memoises
  `_data/` per process, so a fresh build is what picks up new files.

---

## 9. Post-cutover verification

Run against the live host once DNS resolves:

```bash
# Trailing-slash pages resolve 200
curl -sI https://www.lanthanides.io/elements/Dy/ | head -1

# Apex 301s to www
curl -sI https://lanthanides.io/ | grep -i location

# The three preserved 301s
curl -sI https://www.lanthanides.io/prices            | grep -iE 'HTTP|location'
curl -sI https://www.lanthanides.io/vision            | grep -iE 'HTTP|location'
curl -sI https://www.lanthanides.io/assets/data/elements.json | grep -iE 'HTTP|location'

# Machine-readable endpoints (no trailing slash, exact path)
for p in /sitemap.xml /robots.txt /feed.xml /movements.xml \
         /assets/data/fluctuations.json /assets/images/site.webmanifest; do
  echo -n "$p -> "; curl -sI "https://www.lanthanides.io$p" | head -1
done

# DB-backed surfaces work against prod Postgres
curl -sI https://www.lanthanides.io/offers/ | head -1
curl -s  "https://www.lanthanides.io/api/price-gauge?element=Dy&form=oxide" | head -c 200

# Case-sensitivity: lowercase symbol must NOT resolve as the element page
curl -sI https://www.lanthanides.io/elements/dy/ | head -1
```

Also eyeball:

- `view-source` on `/` → `<link rel="canonical" href="https://www.lanthanides.io/">`
  and `og:url` on the **www** origin.
- `/offers/` shows ~220 rows (seed ran) and the honesty banner.
- Submit a test listing at `/sell/` and an alert at `/alerts/` → they persist
  (then clean up the test rows).
- TLS cert valid on both apex and www.

---

## 10. Rollback

Rollback is a Vercel operation: redeploy a previous successful Vercel deployment
or revert the commit on `main`. Do not re-enable GitHub Pages as a rollback path.

---

## Appendix — repo changes that made this turnkey

Applied when this guide was committed (so the steps above need no schema surgery):

- `prisma/schema.prisma` → `provider = "postgresql"` + `directUrl`; the SQLite
  migration baseline was regenerated as Postgres
  (`prisma/migrations/20260530224526_init/`, `migration_lock.toml` → `postgresql`).
- `package.json` → added `"postinstall": "prisma generate"`.
- `.env.example`, `README.md`, and `CLAUDE.md` updated to Postgres-everywhere
  (including hard rule #3).
- `docs/ARCHITECTURE.md` §5 and `docs/MIGRATION.md` §1 still contain the original
  "SQLite dev / switch by connection string" framing as **historical** migration
  records — not the current setup.
