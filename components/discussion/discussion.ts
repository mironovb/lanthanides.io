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

export const THREAD_STATUSES = ['open', 'answered', 'locked', 'hidden'] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];
export const PUBLIC_THREAD_STATUSES = ['open', 'answered', 'locked'] as const;
export type PublicThreadStatus = (typeof PUBLIC_THREAD_STATUSES)[number];

export const REPLY_STATUSES = ['visible', 'hidden'] as const;
export type ReplyStatus = (typeof REPLY_STATUSES)[number];

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
} as const;

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
  return 'default';
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
  return (PUBLIC_THREAD_STATUSES as readonly string[]).includes(v)
    ? (v as PublicThreadStatus)
    : undefined;
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
  authorName: string;
  organization: string;
  body: string;
}

export type ThreadField = keyof ThreadValues;

export const EMPTY_THREAD_VALUES: ThreadValues = {
  title: '',
  category: 'source-tip',
  authorName: '',
  organization: '',
  body: '',
};

export interface ThreadClean {
  title: string;
  category: DiscussionCategory;
  authorName: string;
  organization: string | null;
  body: string;
}

export interface ThreadValidation {
  values: ThreadValues;
  fieldErrors: Partial<Record<ThreadField, string>>;
  clean: ThreadClean | null;
}

export function validateThread(
  raw: Partial<Record<ThreadField, unknown>>,
): ThreadValidation {
  const title = str(raw.title);
  const category = str(raw.category) || EMPTY_THREAD_VALUES.category;
  const authorName = str(raw.authorName);
  const organization = str(raw.organization);
  const body = normalizeMultiline(raw.body);

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

  const clean: ThreadClean | null =
    Object.keys(fieldErrors).length === 0 && isCategory(category)
      ? {
          title,
          category,
          authorName,
          organization: organization || null,
          body,
        }
      : null;

  return {
    values: { title, category, authorName, organization, body },
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
