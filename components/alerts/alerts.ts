/**
 * Notification-signup: pure, framework-agnostic helpers shared by the client
 * waitlist form (EmailWaitlistForm.tsx) and the server write path
 * (app/api/subscribe/route.ts). Nothing here does I/O or imports the server-only
 * data/DB layer, so it is safe in the client bundle: the form validates exactly
 * the way the API route does, so the two never disagree on what counts as a valid
 * signup.
 *
 * Privacy by construction (the task's privacy ask + CLAUDE.md): we model only what
 * a channel needs to deliver (an email address and the chosen topics), and never
 * anything that could track a visitor. Nothing here sends an email: the email
 * channel is captured as a WAITLIST (`status:'waitlist'`), and that honesty is the
 * whole point (hard rule #1: we never claim a message was sent).
 */

// ── Channels ──────────────────────────────────────────────────────────────────
// Telegram exists end-to-end today (the regulatory monitor dispatches alerts);
// email is the waitlist this prompt opens. The schema models both as enum-like
// Strings; the public form only ever submits the email channel (Telegram subscribe
// is a direct bot link, no server write), but the route accepts both for symmetry.
export const CHANNELS = ['email', 'telegram'] as const;
export type Channel = (typeof CHANNELS)[number];
export const DEFAULT_CHANNEL: Channel = 'email';

// ── Topics ──────────────────────────────────────────────────────────────────
// The two event streams the monitor can fire on. 'regulatory' is live today via
// Telegram; 'price-movements' is the next stream (in development for email).
export const TOPICS = [
  {
    id: 'regulatory',
    label: 'Export-control announcements',
    description:
      'New MOFCOM / GAC rare-earth & strategic-metal export-control announcements.',
  },
  {
    id: 'price-movements',
    label: 'Significant price movements',
    description: 'Tracked reference prices crossing a movement threshold.',
  },
] as const;

export type Topic = (typeof TOPICS)[number]['id'];
/** Canonical topic order: the single source of truth for serialization order. */
export const TOPIC_IDS: readonly Topic[] = TOPICS.map((t) => t.id);

// ── Bounds ──────────────────────────────────────────────────────────────────
export const LIMITS = { email: 254 } as const; // RFC 5321 practical maximum

// A pragmatic single-line email check: a non-empty local part, an @, and a dotted
// domain. Deliberately permissive (we never claim to verify deliverability; that
// would need a paid service, hard rule #3); it only rejects the obviously invalid.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= LIMITS.email && EMAIL_RE.test(email);
}

/** Normalize for storage + dedupe: trimmed, lower-cased (the user's own address). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

/**
 * Coerce topics from a form array OR the DB's CSV column into a validated,
 * de-duplicated subset in canonical order. Unknown ids are dropped, never a way
 * to smuggle an arbitrary value into the store.
 */
export function parseTopics(raw: unknown): Topic[] {
  let list: string[];
  if (Array.isArray(raw)) list = raw.map((x) => str(x));
  else if (typeof raw === 'string') list = raw.split(',').map((s) => s.trim());
  else list = [];
  const present = new Set(list.filter(Boolean));
  return TOPIC_IDS.filter((t) => present.has(t));
}

/**
 * Serialize topics to the CSV the schema stores, in canonical order. Validation
 * requires at least one topic, so this never produces the empty string (which the
 * schema documents as the "all topics" sentinel) by accident.
 */
export function serializeTopics(topics: Topic[]): string {
  return TOPIC_IDS.filter((t) => topics.includes(t)).join(',');
}

// ── Field model ───────────────────────────────────────────────────────────────

export interface SubscriptionValues {
  email: string;
  topics: Topic[];
}

/** Keys that can carry an inline error message. */
export type SubscriptionField = 'email' | 'topics' | 'channel';

export const EMPTY_SUBSCRIPTION_VALUES: SubscriptionValues = {
  email: '',
  // Default both topics on: a single uncheck is an explicit narrowing, not a trap.
  topics: [...TOPIC_IDS],
};

/** A validated, ready-to-persist signup (email normalized, topics a known subset). */
export interface SubscriptionClean {
  channel: Channel;
  /** Normalized address; null only for a Telegram signup with no email. */
  email: string | null;
  topics: Topic[];
}

export interface SubscriptionValidation {
  /** Normalised echo of the inputs, for re-populating the form. */
  values: { email: string; topics: Topic[]; channel: Channel };
  /** Per-field messages, shown inline; empty when the signup is valid. */
  fieldErrors: Partial<Record<SubscriptionField, string>>;
  /** The clean signup, or null when any field failed. */
  clean: SubscriptionClean | null;
}

/**
 * Validate + coerce a raw signup. Email is required for the email channel (and
 * validated whenever supplied); at least one topic must be chosen. Mirrors the
 * server checks exactly so the form and the API never disagree.
 */
export function validateSubscription(raw: {
  email?: unknown;
  topics?: unknown;
  channel?: unknown;
}): SubscriptionValidation {
  const channelRaw = str(raw.channel) || DEFAULT_CHANNEL;
  const channel = (CHANNELS as readonly string[]).includes(channelRaw)
    ? (channelRaw as Channel)
    : null;

  const emailRaw = str(raw.email);
  const topics = parseTopics(raw.topics);

  const fieldErrors: Partial<Record<SubscriptionField, string>> = {};

  if (!channel) fieldErrors.channel = 'Unsupported alert channel.';

  // email: required for the email channel; validated whenever present.
  let email: string | null = null;
  if (channel === 'email' || emailRaw) {
    if (!emailRaw) fieldErrors.email = 'Enter your email address.';
    else if (!isValidEmail(emailRaw))
      fieldErrors.email = 'Enter a valid email address.';
    else email = normalizeEmail(emailRaw);
  }

  // topics: at least one.
  if (topics.length === 0)
    fieldErrors.topics = 'Choose at least one alert type.';

  const clean: SubscriptionClean | null =
    Object.keys(fieldErrors).length === 0 && channel
      ? { channel, email, topics }
      : null;

  return {
    values: { email: emailRaw, topics, channel: channel ?? DEFAULT_CHANNEL },
    fieldErrors,
    clean,
  };
}

// ── API response shape (POST /api/subscribe): shared client/server contract ───

/** Public projection of a stored subscription. NEVER carries the email value. */
export interface SubscriptionDTO {
  id: string;
  createdAt: string;
  channel: string;
  topics: Topic[];
  status: string;
  /** Whether an email was stored. The address itself is never returned. */
  hasEmail: boolean;
}

/**
 * Structural shape of a stored row. It matches the Prisma `Subscription` model
 * without importing `@prisma/client` (keeps this module client-safe). Both the API
 * route and any reader project rows through `toSubscriptionDTO`, so the public
 * projection (which drops the private email) is defined in exactly one place.
 */
export interface SubscriptionRow {
  id: string;
  createdAt: Date | string;
  channel: string;
  email: string | null;
  topics: string;
  status: string;
  confirmedAt: Date | string | null;
}

export function toSubscriptionDTO(s: SubscriptionRow): SubscriptionDTO {
  return {
    id: s.id,
    createdAt:
      typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString(),
    channel: s.channel,
    topics: parseTopics(s.topics),
    status: s.status,
    hasEmail: !!s.email,
  };
}

export interface CreateSubscriptionResponse {
  ok: true;
  /** True when this email+channel was already on the list (idempotent re-signup). */
  alreadySubscribed: boolean;
  subscription: SubscriptionDTO;
}
