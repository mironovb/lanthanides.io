/**
 * Discussion-board helpers shared by the client forms and the server write
 * paths. This module is pure and client-safe: no DB, no filesystem, no server
 * imports. Public DTOs intentionally carry only display fields. There is no
 * email/contact field in the discussion schema, so nothing private can be echoed
 * by accident.
 */

export const DISCUSSION_CATEGORIES = [
  {
    id: 'source-tip',
    label: 'Source tip',
    description: 'A document, supplier page, notice, or filing worth reviewing.',
  },
  {
    id: 'price-question',
    label: 'Price question',
    description: 'A request to understand a quoted price, spread, form, or tier.',
  },
  {
    id: 'regulatory-question',
    label: 'Regulatory question',
    description: 'Questions about export controls, notices, scope, or timing.',
  },
  {
    id: 'data-correction',
    label: 'Data correction',
    description: 'A suspected error in the public dataset or page copy.',
  },
  {
    id: 'market-note',
    label: 'Market note',
    description: 'A sourced observation about supply, demand, trade, or pricing.',
  },
  {
    id: 'site-meta',
    label: 'Site/meta',
    description: 'Contributor coordination, feature requests, and site mechanics.',
  },
] as const;

export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number]['id'];
export const DISCUSSION_CATEGORY_IDS: readonly DiscussionCategory[] =
  DISCUSSION_CATEGORIES.map((c) => c.id);

// Thread moderation states (enum-like Strings; the DB column is a free-form
// String, so extending this list needs no migration). Public surfaces only ever
// render PUBLIC_THREAD_STATUSES below — `pending` (held for maintainer review)
// and `hidden` (removed) are both NON-public. Full model + transitions in
// docs/DISCUSSION-MODERATION.md.
export const THREAD_STATUSES = [
  'pending',
  'open',
  'answered',
  'locked',
  'hidden',
] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

/** The only statuses a public reader ever sees (board list + thread detail). */
export const PUBLIC_THREAD_STATUSES = ['open', 'answered', 'locked'] as const;
export type PublicThreadStatus = (typeof PUBLIC_THREAD_STATUSES)[number];

// Reply moderation states. `pending` mirrors the thread state so the optional
// pre-moderation mode can hold replies too; only `visible` replies are public.
export const REPLY_STATUSES = ['pending', 'visible', 'hidden'] as const;
export type ReplyStatus = (typeof REPLY_STATUSES)[number];

/** Narrowing guards for status values arriving from the DB or an API body. */
export function isThreadStatus(v: unknown): v is ThreadStatus {
  return typeof v === 'string' && (THREAD_STATUSES as readonly string[]).includes(v);
}
export function isReplyStatus(v: unknown): v is ReplyStatus {
  return typeof v === 'string' && (REPLY_STATUSES as readonly string[]).includes(v);
}
export function isPublicThreadStatus(v: string): v is PublicThreadStatus {
  return (PUBLIC_THREAD_STATUSES as readonly string[]).includes(v);
}

/**
 * Whether a thread in the given status may accept a new reply, and if not, why.
 * Centralizes the lock/hide/pending gate so the reply API and the detail page
 * agree on one rule. `notfound` covers hidden, pending, and any unknown status:
 * those threads are not public, so a reply attempt 404s rather than confirm the
 * thread exists.
 */
export type ReplyDisposition = 'ok' | 'locked' | 'notfound';
export function replyDisposition(threadStatus: string): ReplyDisposition {
  if (threadStatus === 'open' || threadStatus === 'answered') return 'ok';
  if (threadStatus === 'locked') return 'locked';
  return 'notfound';
}

export const LIMITS = {
  titleMin: 8,
  titleMax: 160,
  authorMin: 2,
  authorMax: 80,
  organizationMax: 120,
  threadBodyMin: 20,
  threadBodyMax: 4000,
  replyBodyMin: 5,
  replyBodyMax: 2500,
  sourceUrlMax: 500,
} as const;

/**
 * The one category that carries structured "source tip" lead fields. Kept as a
 * named constant so the form (progressive disclosure) and the validator (which
 * fields it enforces + persists) agree on a single source of truth.
 */
export const SOURCE_TIP_CATEGORY: DiscussionCategory = 'source-tip';

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizeMultiline(v: unknown): string {
  return str(v)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n');
}

function isCategory(v: string): v is DiscussionCategory {
  return (DISCUSSION_CATEGORY_IDS as readonly string[]).includes(v);
}

// ── Source-tip field validators ──────────────────────────────────────────────
//
// Each returns { value, error? }: `value` is the trimmed input echoed back to
// the form (so a redraw keeps what the user typed), `error` is set when the
// non-empty input is invalid. An empty input is always valid (these fields are
// optional). Pure and client-safe like the rest of this module.

const SOURCE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A public link a reviewer can open. http/https only — never `javascript:` or
 *  `data:`, since the value is later rendered as a clickable anchor. */
function checkSourceUrl(v: unknown): { value: string; error?: string } {
  const raw = str(v);
  if (!raw) return { value: '' };
  if (raw.length > LIMITS.sourceUrlMax)
    return { value: raw, error: `Keep the URL under ${LIMITS.sourceUrlMax} characters.` };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { value: raw, error: 'Enter a full URL starting with http:// or https://.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    return { value: raw, error: 'Use an http:// or https:// link.' };
  if (!parsed.hostname)
    return { value: raw, error: 'Enter a valid source URL.' };
  return { value: raw };
}

/** Observed/published date as ISO `YYYY-MM-DD`. Validates a real calendar date
 *  (rejects 2026-02-31) in a sane year range; stored verbatim, never as a
 *  timezone-bearing DateTime. */
function checkSourceDate(v: unknown): { value: string; error?: string } {
  const raw = str(v);
  if (!raw) return { value: '' };
  if (!SOURCE_DATE_RE.test(raw))
    return { value: raw, error: 'Use an ISO date in YYYY-MM-DD form.' };
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const realDate =
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  if (!realDate || y < 1900 || y > 2100)
    return { value: raw, error: 'Enter a real calendar date.' };
  return { value: raw };
}

/** Case-sensitive catalog symbol (e.g. 'Dy'). When the caller supplies the live
 *  catalog (`allowed`), membership is enforced — the identical rule runs on the
 *  client (from the form's element list) and the server (from lib/data). Without
 *  it, fall back to a defensive shape check. */
function checkElementSymbol(
  v: unknown,
  allowed?: readonly string[],
): { value: string; error?: string } {
  const raw = str(v);
  if (!raw) return { value: '' };
  if (allowed && allowed.length > 0) {
    return allowed.includes(raw)
      ? { value: raw }
      : { value: raw, error: 'Choose an element from the list.' };
  }
  return /^[A-Z][a-z]?$/.test(raw)
    ? { value: raw }
    : { value: raw, error: 'Use a valid element symbol, for example Dy.' };
}

/** A regulatory control notice id (e.g. 'MOFCOM No. 46/2024'). Like the element
 *  symbol, membership is enforced when the caller supplies the live notice list
 *  (`allowed`) — the same rule on the client (from the form's notice list) and
 *  the server (from lib/data). Without it, fall back to a length bound. */
function checkNoticeId(
  v: unknown,
  allowed?: readonly string[],
): { value: string; error?: string } {
  const raw = str(v);
  if (!raw) return { value: '' };
  if (allowed && allowed.length > 0) {
    return allowed.includes(raw)
      ? { value: raw }
      : { value: raw, error: 'Choose a control notice from the list.' };
  }
  return raw.length <= 80
    ? { value: raw }
    : { value: raw, error: 'Unknown control notice.' };
}

export function categoryLabel(category: string): string {
  return (
    DISCUSSION_CATEGORIES.find((c) => c.id === category)?.label ??
    category.replace(/-/g, ' ')
  );
}

export function statusLabel(status: string): string {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
}

export function statusVariant(status: string): 'accent' | 'normal' | 'suspended' | 'default' {
  if (status === 'answered') return 'normal';
  if (status === 'locked') return 'suspended';
  if (status === 'open') return 'accent';
  return 'default'; // pending / hidden (non-public) and any unknown status
}

/** Compact display text for a source link: the bare hostname (no `www.`), or the
 *  raw value if it cannot be parsed. Pure/client-safe; used wherever a stored
 *  sourceUrl is rendered. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Sort + query parsing (board page) ────────────────────────────────────────
//
// The board reads its state from the URL (?category=&status=&sort=&q=) so it is
// crawlable and works without JS. Everything here is pure string work: parsing,
// validation, and href building. The sort id → Prisma orderBy mapping lives in
// the server page, so this module keeps its "no Prisma, no server imports"
// contract.

export const THREAD_SORTS = [
  {
    id: 'latest',
    label: 'Latest activity',
    description: 'Most recently updated threads first (the default).',
  },
  {
    id: 'newest',
    label: 'Newest',
    description: 'Most recently created threads first.',
  },
  {
    id: 'replies',
    label: 'Most replies',
    description: 'Threads with the most replies first.',
  },
  {
    id: 'title',
    label: 'Title A–Z',
    description: 'Alphabetical by thread title.',
  },
] as const;

export type ThreadSort = (typeof THREAD_SORTS)[number]['id'];
export const THREAD_SORT_IDS: readonly ThreadSort[] = THREAD_SORTS.map((s) => s.id);
export const DEFAULT_THREAD_SORT: ThreadSort = 'latest';

/** Longest accepted search string; longer input is truncated, never rejected. */
export const SEARCH_MAX_LEN = 100;

function isSort(v: string): v is ThreadSort {
  return (THREAD_SORT_IDS as readonly string[]).includes(v);
}

export function sortLabel(sort: string): string {
  return THREAD_SORTS.find((s) => s.id === sort)?.label ?? 'Latest activity';
}

export function cleanCategory(value: unknown): DiscussionCategory | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  return isCategory(v) ? v : undefined;
}

export function cleanStatus(value: unknown): PublicThreadStatus | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  // A reader may only ever filter to a PUBLIC status, never `pending`/`hidden`.
  return isPublicThreadStatus(v) ? v : undefined;
}

export function cleanSort(value: unknown): ThreadSort {
  const v = typeof value === 'string' ? value.trim() : '';
  return isSort(v) ? v : DEFAULT_THREAD_SORT;
}

/**
 * Normalize a raw search string: collapse internal whitespace, trim, and cap the
 * length. Returns undefined for an empty query so the caller can drop the filter
 * entirely. The value is only ever passed to Prisma `contains` (a bound query
 * parameter, never string-concatenated into SQL), so there is no injection
 * surface — the cap only bounds pathological input.
 */
export function cleanSearch(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LEN);
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface DiscussionQuery {
  category?: DiscussionCategory;
  status?: PublicThreadStatus;
  sort: ThreadSort;
  q?: string;
}

/** Raw `searchParams` shape from the App Router (values may repeat → arrays). */
export interface RawDiscussionParams {
  category?: string | string[];
  status?: string | string[];
  sort?: string | string[];
  q?: string | string[];
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseDiscussionQuery(
  params: RawDiscussionParams | undefined,
): DiscussionQuery {
  return {
    category: cleanCategory(firstParam(params?.category)),
    status: cleanStatus(firstParam(params?.status)),
    sort: cleanSort(firstParam(params?.sort)),
    q: cleanSearch(firstParam(params?.q)),
  };
}

/**
 * Canonical board href for a (partial) query. Defaults are omitted so the bare
 * board stays `/discussion/` and the default sort never shows in the URL; pass
 * `null` for a facet to clear it.
 */
export function discussionHref(query: {
  category?: string | null;
  status?: string | null;
  sort?: string | null;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.status) params.set('status', query.status);
  if (query.sort && query.sort !== DEFAULT_THREAD_SORT) params.set('sort', query.sort);
  if (query.q) params.set('q', query.q);
  const qs = params.toString();
  return qs ? `/discussion/?${qs}` : '/discussion/';
}

// ── Thread submission ────────────────────────────────────────────────────────

export interface ThreadValues {
  title: string;
  category: string;
  // Reference links (optional; navigational context, valid on any category).
  elementSymbol: string;
  noticeId: string;
  authorName: string;
  organization: string;
  body: string;
  // Source-tip lead fields (optional; only meaningful on the source-tip category).
  sourceUrl: string;
  sourceDate: string;
}

export type ThreadField = keyof ThreadValues;

export const EMPTY_THREAD_VALUES: ThreadValues = {
  title: '',
  category: 'source-tip',
  elementSymbol: '',
  noticeId: '',
  authorName: '',
  organization: '',
  body: '',
  sourceUrl: '',
  sourceDate: '',
};

export interface ThreadClean {
  title: string;
  category: DiscussionCategory;
  authorName: string;
  organization: string | null;
  body: string;
  // Reference links: navigational context, persisted on any category.
  elementSymbol: string | null;
  noticeId: string | null;
  // Persisted only for source tips; null on every other category.
  sourceUrl: string | null;
  sourceDate: string | null;
}

export interface ThreadValidation {
  values: ThreadValues;
  fieldErrors: Partial<Record<ThreadField, string>>;
  clean: ThreadClean | null;
}

export interface ThreadValidationOptions {
  /**
   * The live catalog symbols, supplied by both callers (the client form from its
   * element list, the API route from lib/data) so elementSymbol membership is
   * validated by the SAME rule on both sides. Omit for a defensive shape check.
   */
  elementSymbols?: readonly string[];
  /**
   * The live regulatory notice ids (getRegulatoryNotices().notice_id), supplied
   * by both callers so noticeId membership is validated by the SAME rule on both
   * sides. Omit for a defensive length check.
   */
  noticeIds?: readonly string[];
}

export function validateThread(
  raw: Partial<Record<ThreadField, unknown>>,
  opts: ThreadValidationOptions = {},
): ThreadValidation {
  const title = str(raw.title);
  const category = str(raw.category) || EMPTY_THREAD_VALUES.category;
  const authorName = str(raw.authorName);
  const organization = str(raw.organization);
  const body = normalizeMultiline(raw.body);

  // Reference links are echoed + validated for every category. Source URL/date
  // are echoed for every category (so the form keeps them if the user toggles
  // category) but only validated + persisted for source tips — see below.
  const elementSymbol = str(raw.elementSymbol);
  const noticeId = str(raw.noticeId);
  const sourceUrl = str(raw.sourceUrl);
  const sourceDate = str(raw.sourceDate);
  const isSourceTip = category === SOURCE_TIP_CATEGORY;

  const fieldErrors: Partial<Record<ThreadField, string>> = {};

  if (!title) fieldErrors.title = 'Add a specific thread title.';
  else if (title.length < LIMITS.titleMin)
    fieldErrors.title = `Use at least ${LIMITS.titleMin} characters.`;
  else if (title.length > LIMITS.titleMax)
    fieldErrors.title = `Keep the title under ${LIMITS.titleMax} characters.`;

  if (!isCategory(category)) fieldErrors.category = 'Choose a valid category.';

  if (!authorName) fieldErrors.authorName = 'Add a name or handle.';
  else if (authorName.length < LIMITS.authorMin)
    fieldErrors.authorName = `Use at least ${LIMITS.authorMin} characters.`;
  else if (authorName.length > LIMITS.authorMax)
    fieldErrors.authorName = `Keep the name under ${LIMITS.authorMax} characters.`;

  if (organization.length > LIMITS.organizationMax)
    fieldErrors.organization = `Keep organization under ${LIMITS.organizationMax} characters.`;

  if (!body) fieldErrors.body = 'Add the note, question, or source context.';
  else if (body.length < LIMITS.threadBodyMin)
    fieldErrors.body = `Use at least ${LIMITS.threadBodyMin} characters.`;
  else if (body.length > LIMITS.threadBodyMax)
    fieldErrors.body = `Keep the body under ${LIMITS.threadBodyMax} characters.`;

  // Reference links (element + control notice) are navigational context, valid on
  // ANY category — validated against the live lists when supplied, dropped to null
  // when left blank.
  let cleanElementSymbol: string | null = null;
  const es = checkElementSymbol(elementSymbol, opts.elementSymbols);
  if (es.error) fieldErrors.elementSymbol = es.error;
  else cleanElementSymbol = es.value || null;

  let cleanNoticeId: string | null = null;
  const nt = checkNoticeId(noticeId, opts.noticeIds);
  if (nt.error) fieldErrors.noticeId = nt.error;
  else cleanNoticeId = nt.value || null;

  // Source URL/date are source-tip lead fields only; on any other category they
  // are dropped (set to null in `clean`), never stored on the wrong record.
  let cleanSourceUrl: string | null = null;
  let cleanSourceDate: string | null = null;
  if (isSourceTip) {
    const u = checkSourceUrl(sourceUrl);
    if (u.error) fieldErrors.sourceUrl = u.error;
    else cleanSourceUrl = u.value || null;

    const sd = checkSourceDate(sourceDate);
    if (sd.error) fieldErrors.sourceDate = sd.error;
    else cleanSourceDate = sd.value || null;
  }

  const clean: ThreadClean | null =
    Object.keys(fieldErrors).length === 0 && isCategory(category)
      ? {
          title,
          category,
          authorName,
          organization: organization || null,
          body,
          elementSymbol: cleanElementSymbol,
          noticeId: cleanNoticeId,
          sourceUrl: cleanSourceUrl,
          sourceDate: cleanSourceDate,
        }
      : null;

  return {
    values: {
      title,
      category,
      elementSymbol,
      noticeId,
      authorName,
      organization,
      body,
      sourceUrl,
      sourceDate,
    },
    fieldErrors,
    clean,
  };
}

// ── Reply submission ─────────────────────────────────────────────────────────

export interface ReplyValues {
  authorName: string;
  body: string;
}

export type ReplyField = keyof ReplyValues;

export const EMPTY_REPLY_VALUES: ReplyValues = {
  authorName: '',
  body: '',
};

export interface ReplyClean {
  authorName: string;
  body: string;
}

export interface ReplyValidation {
  values: ReplyValues;
  fieldErrors: Partial<Record<ReplyField, string>>;
  clean: ReplyClean | null;
}

export function validateReply(
  raw: Partial<Record<ReplyField, unknown>>,
): ReplyValidation {
  const authorName = str(raw.authorName);
  const body = normalizeMultiline(raw.body);

  const fieldErrors: Partial<Record<ReplyField, string>> = {};

  if (!authorName) fieldErrors.authorName = 'Add a name or handle.';
  else if (authorName.length < LIMITS.authorMin)
    fieldErrors.authorName = `Use at least ${LIMITS.authorMin} characters.`;
  else if (authorName.length > LIMITS.authorMax)
    fieldErrors.authorName = `Keep the name under ${LIMITS.authorMax} characters.`;

  if (!body) fieldErrors.body = 'Add a reply.';
  else if (body.length < LIMITS.replyBodyMin)
    fieldErrors.body = `Use at least ${LIMITS.replyBodyMin} characters.`;
  else if (body.length > LIMITS.replyBodyMax)
    fieldErrors.body = `Keep the reply under ${LIMITS.replyBodyMax} characters.`;

  const clean: ReplyClean | null =
    Object.keys(fieldErrors).length === 0 ? { authorName, body } : null;

  return {
    values: { authorName, body },
    fieldErrors,
    clean,
  };
}

// ── Public DTOs ──────────────────────────────────────────────────────────────

export interface DiscussionThreadRow {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  title: string;
  category: string;
  authorName: string;
  organization: string | null;
  body: string;
  status: string;
  // Optional so older call sites / partial selects still satisfy the type; a row
  // read after the migration carries them (null when unset).
  elementSymbol?: string | null;
  noticeId?: string | null;
  sourceUrl?: string | null;
  sourceDate?: string | null;
  _count?: { replies: number };
}

export interface DiscussionReplyRow {
  id: string;
  createdAt: Date | string;
  threadId: string;
  authorName: string;
  body: string;
  status: string;
}

export interface DiscussionThreadDTO {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  category: string;
  categoryLabel: string;
  authorName: string;
  organization: string | null;
  body: string;
  status: string;
  // Reference links: navigational context, null unless the author set them.
  elementSymbol: string | null;
  noticeId: string | null;
  // Source-tip lead metadata; null unless set on a source-tip thread.
  sourceUrl: string | null;
  sourceDate: string | null;
  replyCount: number;
}

export interface DiscussionReplyDTO {
  id: string;
  createdAt: string;
  threadId: string;
  authorName: string;
  body: string;
  status: string;
}

function iso(d: Date | string): string {
  return typeof d === 'string' ? d : d.toISOString();
}

export function toThreadDTO(row: DiscussionThreadRow): DiscussionThreadDTO {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    title: row.title,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    authorName: row.authorName,
    organization: row.organization,
    body: row.body,
    status: row.status,
    elementSymbol: row.elementSymbol ?? null,
    noticeId: row.noticeId ?? null,
    sourceUrl: row.sourceUrl ?? null,
    sourceDate: row.sourceDate ?? null,
    replyCount: row._count?.replies ?? 0,
  };
}

export function toReplyDTO(row: DiscussionReplyRow): DiscussionReplyDTO {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    threadId: row.threadId,
    authorName: row.authorName,
    body: row.body,
    status: row.status,
  };
}

export interface CreateThreadResponse {
  ok: true;
  thread: DiscussionThreadDTO;
}

export interface CreateReplyResponse {
  ok: true;
  reply: DiscussionReplyDTO;
}
