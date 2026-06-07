# DISCUSSION-MODERATION.md: the discussion board moderation model

> Scope: the `/discussion` board only (`DiscussionThread` / `DiscussionReply` in
> `prisma/schema.prisma`). Companion docs: `docs/ARCHITECTURE.md` §4.4 (where the
> board sits), `docs/DEPLOYMENT.md` §4 (environment variables), `CONTRIBUTING.md`
> (the separate dataset-contribution pipeline this board never bypasses).
>
> Guiding rule carried from the rest of the project: **be honest about what
> exists.** The public site has no user accounts and no login, so this document
> does not pretend there is one. Moderation is a small set of safe primitives —
> all OFF by default — plus a documented operator runbook, not an admin app.

---

## 1. The boundary: there is no authentication

The site has **no user accounts, no sessions, no login, and no admin UI.** Every
public surface is anonymous. That is a deliberate product fact, not a gap to
paper over. It has two consequences this model is built around:

1. **No per-user trust.** We cannot attribute a post to a verified identity,
   rate-limit per account, or grant per-user roles. Author names are free text.
2. **No in-app moderator role.** There is no logged-in "moderator" who clicks a
   Hide button. Maintainer actions happen out-of-band: through the database
   directly, or through a **single shared secret** carried by the maintainer API
   in §6 (which is disabled unless that secret is configured).

So the workflow is: **safe defaults + server-enforced rules + an opt-in,
secret-gated maintainer channel.** Nothing here implies authentication that does
not exist.

---

## 2. Data model: statuses

Statuses are enum-like `String` columns (the schema avoids native enums for
portability). Because they are free-form strings, **extending the vocabulary
needs no migration** — only the code that reads/writes them changes.

### Thread status (`DiscussionThread.status`)

| Status | Public? | Meaning | Accepts replies? |
|:--|:--|:--|:--|
| `pending` | **No** | Held for maintainer review; submitted but not yet approved. | No (404) |
| `open` | Yes | Published, accepting replies. | Yes |
| `answered` | Yes | Published; a maintainer marked it as having a useful answer. | Yes |
| `locked` | Yes | Published and readable as a record, but closed to new replies. | No (409) |
| `hidden` | **No** | Removed by a maintainer. | No (404) |

`PUBLIC_THREAD_STATUSES = ['open', 'answered', 'locked']` is the single source of
truth for "what a public reader may ever see" (`components/discussion/discussion.ts`).
`pending` and `hidden` are both non-public; the difference is intent — *awaiting
review* vs *removed*.

### Reply status (`DiscussionReply.status`)

| Status | Public? | Meaning |
|:--|:--|:--|
| `pending` | **No** | Held for maintainer review (pre-moderation mode). |
| `visible` | Yes | Published. |
| `hidden` | **No** | Removed by a maintainer. |

Only `visible` replies are ever rendered or counted on public pages.

---

## 3. State transitions

```
                 submit (default)        submit (DISCUSSION_REQUIRE_APPROVAL)
                      │                            │
                      ▼                            ▼
   thread:         [ open ] ◄──── approve ──── [ pending ]
                   /  │   \                         │
        mark      /   │    \  lock                  │ hide
      answered   /    │     \                       ▼
                ▼     │      ▼                   [ hidden ]
           [ answered ]   [ locked ]                ▲
                │             │                      │
                └──── hide / lock / hold (pending) ──┘   (any state → any state,
                                                          via the maintainer API)

   reply:       [ visible ]  ◄── approve ──  [ pending ]      (default → visible)
                     │                             │
                     └──────── hide ──────────────► [ hidden ]
```

- **Submit** is the only transition the public can cause. It always lands on a
  **server-chosen** status (`open`/`visible`, or `pending` under pre-moderation).
  The client cannot set or influence the status — the create routes ignore any
  `status` field in the body.
- **All other transitions** (approve, mark answered, lock, hide, hold) are
  maintainer actions, performed via the database or the §6 API. There is no other
  way to change a status.

---

## 4. Two operating modes

Both are controlled by environment variables and are **off by default**, so an
out-of-the-box deploy behaves exactly as the board did before this model existed.

### 4.1 Post-moderation — the default

`DISCUSSION_REQUIRE_APPROVAL` unset (or false).

- New threads are created `open`; new replies `visible`. They are **public
  immediately**.
- A maintainer reacts **after the fact**: mark `answered`, `locked`, `hidden`, or
  move back to `pending` (de-list for a second look) via §6.
- This is the honest default precisely because there is no always-on reviewer: a
  pre-moderation queue with nobody reading it would silently swallow every
  contribution and make the board look dead.

The public copy on `/discussion` reflects this: *"Threads and replies publish
immediately. A maintainer can later mark a thread answered, lock it to new
replies, hold it for review, or hide it."*

### 4.2 Pre-moderation — opt-in

`DISCUSSION_REQUIRE_APPROVAL=1` (or `true`/`yes`/`on`).

- New threads are created `pending`; new replies `pending`. They are **not
  public** until a maintainer approves them (sets a thread to `open`/`answered`,
  a reply to `visible`).
- The submission forms detect the held status in the API response and show a
  *"submitted for review"* confirmation instead of navigating to a (would-be-404)
  thread page. The board copy switches to *"held for maintainer review … become
  public only after a maintainer approves them."*
- **Only enable this if you are actually reviewing the queue.** Otherwise the
  board appears empty to contributors. Pair it with the §6 API (or direct DB
  access) so there is a way to approve.

The mode is read **server-side** (`requiresApproval()` in
`lib/discussion-moderation.ts`) and threaded into the pages and forms as a prop —
the flag is never exposed to the client bundle.

---

## 5. Server-enforced safety (validation)

These rules hold regardless of mode and are **not** client-trustable — they live
in the route handlers and the shared pure helpers:

1. **Status is server-assigned on create.** `POST /api/discussion/threads` and
   `…/replies` set the status from `initialThreadStatus()` /
   `initialReplyStatus()`. A `status` in the request body is ignored. A submitter
   can never publish-bypass or self-assign `answered`/`locked`.
2. **Replies are gated by one shared rule.** `replyDisposition(threadStatus)`
   (`components/discussion/discussion.ts`) is the single gate used by the reply
   API:
   - `open` / `answered` → **accept**.
   - `locked` → **409** ("This thread is locked.").
   - `hidden` / `pending` / unknown / missing → **404** ("Thread not found.") —
     we never confirm a non-public thread exists.
3. **Public reads exclude non-public rows.** The board list, the board count, the
   thread detail page, and `generateMetadata` all filter to
   `PUBLIC_THREAD_STATUSES`; reply queries filter to `visible`. A `pending` or
   `hidden` thread 404s on its detail URL and never appears in a listing.
4. **Status filters are constrained.** The `?status=` board filter is validated
   by `cleanStatus`, which only accepts a public status — a reader cannot request
   `?status=pending` or `?status=hidden`.
5. **No private fields exist.** The discussion schema has no email/contact
   column, so DTOs are contact-safe by construction and search can never reach
   private data.

---

## 6. Maintainer moderation API (disabled by default)

`app/api/discussion/moderation/route.ts` — a secret-gated channel for the
maintainer actions of §3. It is the **only** mutation path for status, and it is
**not public**.

### 6.1 Enablement and auth

- **Disabled by default.** With `DISCUSSION_MODERATION_SECRET` unset (or shorter
  than 16 characters), **every method returns `404`** — the endpoint does not
  advertise itself and offers no surface to probe.
- **Enabled** only when a real secret (≥16 chars) is configured. Every request
  must then present it as `Authorization: Bearer <secret>` (preferred) or the
  `x-moderation-secret` header. A missing/wrong secret returns `401`.
- The comparison is **constant-time**: both sides are SHA-256 digested and
  compared with `crypto.timingSafeEqual`, so neither the value nor its length
  leaks through timing.
- This is a **single shared secret for a solo maintainer — not multi-user
  authentication.** It grants all-or-nothing moderation. Treat the secret like a
  password: server-only (never `NEXT_PUBLIC_`), never committed, rotate by
  changing the env var.

### 6.2 Endpoints

| Method | Purpose |
|:--|:--|
| `GET` | The review queue: all `pending` + `hidden` threads and replies (capped at 200 each, newest first) plus a status histogram (`counts`). Read-only. |
| `POST` | Set one row's status. Body: `{ "target": "thread"\|"reply", "id": "<cuid>", "status": "<valid status>" }`. Validated against the vocabulary in §2; unknown ids return `404`. |

There is intentionally **no public-by-id GET** that exposes pending/hidden
content — only the secret holder can read the queue.

### 6.3 Examples

```bash
SECRET='…the configured DISCUSSION_MODERATION_SECRET…'
BASE='https://www.lanthanides.io'

# Review the queue (pending + hidden, plus counts):
curl -s "$BASE/api/discussion/moderation" -H "Authorization: Bearer $SECRET"

# Approve a held thread (pending → open):
curl -s "$BASE/api/discussion/moderation" -H "Authorization: Bearer $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"target":"thread","id":"clx…","status":"open"}'

# Hide a thread; lock a thread; hide a reply:
#   …"status":"hidden"   …"status":"locked"   {"target":"reply",…,"status":"hidden"}

# With moderation DISABLED (no secret set), the same calls return 404.
```

---

## 7. What is intentionally NOT built (and why)

- **No login / admin UI.** Would require an auth system the site does not have.
  Building a fake "admin" page guarded by client checks would be security
  theatre. The maintainer channel is an explicit, server-verified secret instead.
- **No public moderation buttons.** No "report", "hide", or "lock" control is
  exposed to anonymous users — those would be public mutation routes that let
  anyone suppress content. Reporting could be added later as an *append-only*
  signal (never a direct state change).
- **No persisted audit log / moderator identity.** With one shared secret there
  is no individual actor to record. Action history, if needed, is whatever the
  host's request logs capture.
- **No email, no external moderation service, no rate limiting.** Out of scope
  and would need infrastructure/secrets we deliberately do not add. The
  disabled-by-default API means there is no standing attack surface to rate-limit.
- **No auto-publication into the dataset.** Unchanged and load-bearing:
  discussion is coordination and source review, **never** a write into `_data/`.
  Price claims, corrections, and source tips still go through the reviewed
  `CONTRIBUTING.md` git-PR pipeline (hybrid-data rule, `CLAUDE.md`).

---

## 8. Operator runbook

**Reactive moderation (default mode):**
1. Enable the API: set `DISCUSSION_MODERATION_SECRET` to a long random string in
   the host env; redeploy.
2. Watch the board, or `GET /api/discussion/moderation` for the `hidden`/`pending`
   queue and `counts` histogram.
3. Act with `POST`: `hidden` to remove, `locked` to freeze replies, `answered` to
   highlight a resolved thread, `pending` to de-list for a second look.

**Review-before-publish (pre-moderation):**
1. Set `DISCUSSION_REQUIRE_APPROVAL=1` **and** `DISCUSSION_MODERATION_SECRET`;
   redeploy. (Approval mode without an approval channel = an invisible board.)
2. `GET` the queue; for each acceptable thread `POST` `status:"open"`, for each
   acceptable reply `POST` `status:"visible"`; leave/`hidden` the rest.

**Direct DB alternative:** any action above is equally a Prisma/SQL `UPDATE` on
`discussion_threads` / `discussion_replies` (e.g. via Prisma Studio). The API
just makes it doable over HTTP with a single secret.

---

## 9. Limitations and threat model

- **Spam/abuse, default mode.** Anonymous + immediate publish means spam is
  possible; mitigation today is reactive hiding. Pre-moderation (§4.2) trades
  immediacy for a review gate. Stronger anti-abuse (rate limits, a captcha, an
  append-only report signal) is future work and is noted as not-built in §7.
- **Shared-secret blast radius.** Anyone with the secret can moderate everything.
  Keep it out of the client and source; rotate via the env var. There are no
  scoped/partial moderation grants.
- **No identity on posts.** Author names are unverified free text; do not treat
  them as attribution.
- **Operational honesty.** If pre-moderation is on, contributors are told their
  post is held; if off, they are told it is public immediately and may be
  moderated after the fact. The UI copy is derived from the actual server mode so
  it cannot drift from behaviour.

---

## 10. File map

| Concern | File |
|:--|:--|
| Status vocabulary, public-status set, `replyDisposition`, status guards (pure, client-safe) | `components/discussion/discussion.ts` |
| Mode + secret config, `requiresApproval`, `initial*Status`, secret verification (server-only) | `lib/discussion-moderation.ts` |
| Thread create (server-assigned status) | `app/api/discussion/threads/route.ts` |
| Reply create (server-assigned status + `replyDisposition` gate) | `app/api/discussion/threads/[id]/replies/route.ts` |
| Maintainer API (secret-gated GET queue / POST mutate) | `app/api/discussion/moderation/route.ts` |
| Public reads (board list/count, detail, metadata; mode-aware copy) | `app/discussion/page.tsx`, `app/discussion/[id]/page.tsx` |
| Mode-aware submission copy / held-state handling | `components/discussion/DiscussionThreadForm.tsx`, `DiscussionReplyForm.tsx` |
| Schema (status columns + comments) | `prisma/schema.prisma` |
| Environment flags | `.env.example` (`DISCUSSION_REQUIRE_APPROVAL`, `DISCUSSION_MODERATION_SECRET`) |
