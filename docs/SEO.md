# SEO, Structured Data & URL Preservation — Parity Report

> Prompt 24. Companion to `docs/MIGRATION.md` §3 (the URL contract) and
> `docs/AUDIT.md` §2/§5 (the permalink + preserve-this lists). Records the
> before/after parity check: every old URL resolves or redirects, metadata and
> JSON-LD are complete, and the sitemap/robots/feeds work. `npm run build` green
> (61 routes); `npm run lint` clean.

## 1. The SEO layer (what was built)

| Piece | File(s) | What it does |
|:--|:--|:--|
| **Metadata builder** | `lib/seo.ts` | `buildMetadata({ title, description, keywords, path, ogType?, image?, … })` returns a *complete* `Metadata`: title (via the `%s · lanthanides.io` template), description, keywords, canonical, Atom feed alternates, Open Graph, and Twitter card — so every route ships the full set with one call. Ports `legacy/_includes/head.html`. |
| **Root defaults** | `app/layout.tsx` | `metadataBase`, title template, default description/keywords, `icons` (svg/ico/16/32/apple-touch), `manifest`, `robots` (index,follow + `max-image-preview:large` etc.), `authors` → `<link rel="author" href="/humans.txt">`, baseline OG/Twitter (inherited by `not-found`), and `viewport.themeColor = #1A5C6B`. Renders `<SiteJsonLd>` site-wide. |
| **JSON-LD components** | `components/seo/` | `JsonLd` renderer (single escaped `<script>`), `SiteJsonLd` (WebSite+Organization), `BreadcrumbJsonLd`, `FaqJsonLd`, `ArticleJsonLd`, `ElementJsonLd` (Product+Offer[]), `DatasetJsonLd`, `WebApplicationJsonLd`. Server-first; pages compose them instead of inline `<script>` blocks. |
| **Sitemap** | `app/sitemap.ts` | `/sitemap.xml` — 52 URLs (16 pages + 31 elements + 5 articles); real `lastmod`. Replaces jekyll-sitemap. |
| **Robots** | `app/robots.ts` | `/robots.txt` — Allow `/`, Disallow `/api/`, sitemap + host. Replaces the Liquid robots.txt. |
| **News feed** | `app/feed.xml/route.ts` | `/feed.xml` — Atom over the 5 articles. Replaces jekyll-feed (see §5). |

> A page's metadata is now `export const metadata = buildMetadata({ … })` (or
> `generateMetadata` → `buildMetadata(...)`), and its JSON-LD is one or more
> `components/seo` components rendered in the JSX. **Verified in built HTML:**
> every page's `og:title`/`og:url`/`canonical` are self-referential (a layout
> default does *not* leak the page's title — confirmed — which is exactly why
> every route builds its own OG).

## 2. URL parity — every old permalink (AUDIT §2)

`trailingSlash: true` keeps every page URL's trailing slash; machine endpoints
keep their exact extension path with no slash. Status against the live build:

### Top-level pages
| Old URL | Status |
|:--|:--|
| `/` | ✅ preserved |
| `/dashboard/` | ✅ preserved |
| `/elements/` | ✅ preserved |
| `/regulatory/` | ✅ preserved |
| **`/framework/`** | ✅ **NOW RESOLVES** — was a 404 (no route existed); ported this prompt (§4) |
| `/movements/` | ✅ preserved |
| `/news/` | ✅ preserved |
| `/methodology/` | ✅ preserved |
| `/about/` | ✅ preserved |
| `/sources/` | ✅ preserved |
| `/prices/` | ↪ **301 → `/elements/`** (next.config.mjs) |
| `/vision/` | ↪ **301 → `/about/`** (next.config.mjs) |
| `/404.html` | ✅ behavior preserved (Next serves `not-found` for unmatched; the literal path was a Jekyll artifact, unlinked) |

### Collections
| Old URL pattern | Count | Status |
|:--|:--|:--|
| `/elements/<Symbol>/` (case-sensitive) | 31 | ✅ all in sitemap; `generateStaticParams` emits cased symbols (`/elements/Dy/`) |
| `/news/<slug>/` | 5 | ✅ all in sitemap |

### Machine-readable / feeds / SEO / assets
| Old URL | Status |
|:--|:--|
| `/sitemap.xml` | ✅ `app/sitemap.ts` |
| `/feed.xml` | ✅ `app/feed.xml/route.ts` (now populated — §5) |
| `/movements.xml` | ✅ `app/movements.xml/route.ts` (unchanged, valid Atom) |
| `/robots.txt` | ✅ `app/robots.ts` |
| `/humans.txt` | ✅ **NOW SERVED** — `public/humans.txt` (was a Jekyll Liquid template at repo root, not served by Next); de-`.edu`'d contact (`hello@lanthanides.io`) + Next stack |
| `/assets/images/site.webmanifest` | ✅ **NOW SERVED** — `public/assets/images/site.webmanifest`; **§4.8 fixed**: `/periodicpricing/…` → `/assets/images/…`, colors → brand (`theme_color #1A5C6B`, `background_color #0b0d10`) |
| `/assets/images/*` (favicons, og, logos) | ✅ copied into `public/assets/images/` (favicon ico/svg/16/32, apple-touch, android-chrome 192/512, logos, og-default) |
| `/assets/data/elements.json` | ↪ **301 → `/api/export/json/`** (MIGRATION §3.4.1) |
| `/assets/data/fluctuations.json` | ✅ preserved static file in `public/assets/data/` |
| `CNAME` | ✅ intact at repo root (`www.lanthanides.io`) |

**Result: no old URL 404s.** The one structural gap found this prompt — the
unbuilt `/framework/` route — is closed.

### In-page anchors preserved (deep-linked)
`/methodology/#display-price`, `#provenance-chain`, `#data-sources-breakdown`,
`#oxide-to-metal` (heading-id slugger); **`/framework/#pricing`** (raw
`<a id="pricing">` via rehype-raw) and **`#us-side-tariff-stack-may-14-2026`**
(auto-slug) — both confirmed present in built HTML.

> **Lowercase element URLs** (`/elements/dy/` → `/elements/Dy/`) are intentionally
> *not* redirected: the Jekyll site only ever served the cased form, so they are
> not "old URLs," and `dynamicParams = false` 404s them exactly as before. Adding
> case-fold redirects remains a deferred parity-plus (MIGRATION §3.2).

## 3. Structured data — the four legacy includes + extensions

| Legacy include | New component | Emitted on |
|:--|:--|:--|
| `structured-data-site.html` (WebSite + FAQPage) | `SiteJsonLd` (WebSite + Organization) · `FaqJsonLd` | WebSite/Organization **site-wide** (root layout); FAQPage on `/` |
| `structured-data-breadcrumb.html` (BreadcrumbList) | `BreadcrumbJsonLd` | every section + detail page |
| `structured-data-article.html` (Article) | `ArticleJsonLd` | `/news/[slug]` |
| `structured-data-element.html` (Product + Offer[]) | `ElementJsonLd` | `/elements/[symbol]` |
| — *(new)* | `DatasetJsonLd` | `/data` (with JSON/CSV/fluctuations `DataDownload`), `/regulatory`, `/offers` |
| — *(new)* | `WebApplicationJsonLd` | `/tools/price-gauge`, `/sell`, `/alerts` |

**Verified @types in built HTML:** home → WebSite+Organization+FAQPage;
`/elements/Dy` → Product+Offer+Brand+PropertyValue+Breadcrumb; `/news/*` →
Article+Breadcrumb+WebPage; `/data` → Dataset+DataDownload+Breadcrumb;
`/regulatory` → Dataset+Breadcrumb; all pages → site WebSite+Organization +
their Breadcrumb. (Dynamic `/offers`, `/sell`, `/tools/price-gauge` render the
same components server-side; verified by source + lint.)

> **FAQPage** is ported *verbatim* from the legacy include — it is preserved
> editorial content (AUDIT §5), not newly invented data — with the two embedded
> counts (`{records}`, `{elements}`) wired live from `lib/data` (hard rule #1).
> The Product `Offer[]` reflect the real retail/bulk reference records (seller,
> price, `priceValidUntil` = quote_date + 90d); offers are omitted when a tier
> has no reference, never fabricated.

## 4. `/framework/` port (the URL-preservation fix)

`/framework/` is a hard contract (AUDIT §2) and a "preserve verbatim" asset
(AUDIT §5/§6 crown-jewel cluster) — but no route existed (it would 404). Ported
on the `/methodology` pattern:
- `legacy/pages/framework.md` → `app/framework/framework.md` (so the build never
  reads `legacy/`, hard rule #4), with the Jekyll Liquid resolved: `relative_url`
  filters → bare paths; the breadcrumb + disclaimer includes → `BreadcrumbJsonLd`
  + a `Callout`. (Verified: 0 Liquid tags remain.)
- `app/framework/page.tsx` renders it via `<Markdown>`, with full `buildMetadata`
  (the front-matter title/description/keywords) and BreadcrumbList JSON-LD.
- Anchors `#pricing` and `#us-side-tariff-stack-may-14-2026` preserved.
- Re-linked in nav (Intelligence group, after Regulatory — matching the legacy
  header order) so it's crawlable in header + footer.

## 5. Feeds

- **`/movements.xml`** — unchanged faithful Atom port (50-event cap); still valid.
- **`/feed.xml`** — the legacy jekyll-feed fed from `site.posts`, but this repo
  has **no `_posts`** (news lives in the `_articles` collection), so the legacy
  feed shipped **empty**. The new handler populates the same URL from the 5
  articles (newest first; title, link, id, published/updated, author, element
  categories, summary) — parity-plus. Discovery via `<link rel="alternate"
  type="application/atom+xml">` for **both** feeds on every page (`buildMetadata`).

## 6. OG images

- **Default** `og-default.png` (1200×630) resolves from `public/assets/images/`
  and is the OG/Twitter image on every route without a more specific one.
- **Per-article** hero images (`china-rare-earth-controls-1200.jpg`) resolve and
  drive `og:image` on the relevant article.
- **Dynamic OG (per-route `ImageResponse`)** was *considered and deferred*: it is
  explicitly optional and gated on "builds cleanly offline," but generating it
  needs a bundled font ArrayBuffer (the site's fonts are `next/font`-managed) and
  the Edge runtime, adding offline-build risk for marginal gain over the
  brand-appropriate static card. Left as a future enhancement.

## 7. Notes / known minor gaps

- `<link rel="license">` (a minor signal in the legacy `<head>`) has no
  first-class Next Metadata field. The CC BY 4.0 licence is still surfaced via
  the WebSite/Dataset JSON-LD `license`, the footer, and the Atom `<rights>`.
- The repo-root `robots.txt` / `humans.txt` Jekyll templates remain (harmless —
  Next serves only `public/` + the `app/robots.ts` route).

## 8. Redesign pass (prompt 18): plain SEO voice

A later redesign pass (separate from the original migration) reverts the app
toward the last static site and strips em dashes site-wide. Prompt 18 of that
pass is the SEO slice. What it found and changed:

- **Titles and descriptions are plain and em-dash-free.** The earlier redesign
  code and copy sweeps had already removed em dashes from every `.tsx`/`.ts`
  metadata string (the per-page `buildMetadata({ title, description })` calls and
  the shared `DESCRIPTION` constants), so no title or meta description carries an
  em dash. The one remaining case was the `/framework/` page meta description
  (front matter in `app/framework/framework.md`, which feeds `buildMetadata`): a
  trailing "verified May 14, 2026" aside used an em dash, now a comma. That fix
  shipped with the framework and methodology content cleanup (those two markdown
  page bodies held the last em dashes under `app/`; per-element and per-article
  metadata come from front matter cleaned in the content prompt).
- **The title template is unchanged and simple:** `%s · lanthanides.io`
  (`TITLE_SUFFIX` plus a middle-dot separator in `lib/seo.ts`). Page name, then
  the site name. The home page uses its full descriptive title.
- **Structured data is unchanged and still covers the right pages.** The real,
  used types stay: WebSite plus Organization (site-wide), BreadcrumbList (section
  and detail pages), FAQPage (home), Article (`/news/[slug]`), Product plus Offer
  (`/elements/[symbol]`), Dataset (`/data`, `/regulatory`, `/offers`), and
  WebApplication (the tool pages). Their description strings are plain, with no
  em dash and no marketing voice (verified by grep over `components/seo`). The
  ported FAQPage answers keep their ASCII-hyphen price ranges: preserved verbatim
  editorial, not em or en dashes.
- **URLs, sitemap, robots, and feeds are unchanged.** `app/sitemap.ts` still
  emits 52 URLs (16 pages plus 31 case-sensitive elements plus 5 articles, the
  elements and articles read live from the data layer), `app/robots.ts` still
  allows `/` and disallows `/api/`, and both Atom feeds keep their exact paths
  and plain titles. Only correctness was checked here; no URL changed.
- **Canonical and Open Graph host unchanged:** `SITE_URL` stays
  `https://www.lanthanides.io`; each page's canonical and `og:url` are
  self-referential (the page's own path).
- **Considered and deferred:** `og:site_name` and the WebSite JSON-LD `name`
  still read `lanthanides.io · Strategic Materials Ledger`, a migration-era brand
  string that is em-dash-free. The last static site used the plain
  `lanthanides.io` for `og:site_name`. This was left intact to avoid rippling the
  JSON-LD `name` and the feed titles, and is flagged for the final parity prompt
  as a one-token edit if exact brand parity is wanted.

No em dashes were added in this section. The migration sections above predate the
redesign and are outside its sweep, so they keep their original text.
