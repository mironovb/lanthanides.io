/**
 * Server-only discussion moderation configuration + maintainer-secret check.
 *
 * The public site has NO user accounts and NO login. Moderation is therefore two
 * small, opt-in primitives, both OFF by default so the deployed board behaves
 * exactly as before unless an operator turns them on:
 *
 *   1. Pre-moderation (DISCUSSION_REQUIRE_APPROVAL), when truthy, new threads
 *      and replies are created `pending` (held, non-public) instead of publishing
 *      immediately. Only sensible if an operator is actually reviewing the queue,
 *      otherwise the board appears empty to contributors.
 *   2. Maintainer API secret (DISCUSSION_MODERATION_SECRET), when set (≥16
 *      chars), the secret-gated /api/discussion/moderation endpoint is enabled.
 *      When unset, that endpoint is DISABLED (404) and nothing can hide / lock /
 *      approve over HTTP. This is a single shared secret for a solo maintainer,
 *      NOT multi-user authentication.
 *
 * Never import this from a Client Component: it reads server env and node:crypto.
 * See docs/DISCUSSION-MODERATION.md.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

function envFlag(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Pre-moderation mode: hold new threads/replies as `pending` until approved. */
export function requiresApproval(): boolean {
  return envFlag(process.env.DISCUSSION_REQUIRE_APPROVAL);
}

/** Status a freshly submitted thread should get under the current mode. */
export function initialThreadStatus(): 'pending' | 'open' {
  return requiresApproval() ? 'pending' : 'open';
}

/** Status a freshly submitted reply should get under the current mode. */
export function initialReplyStatus(): 'pending' | 'visible' {
  return requiresApproval() ? 'pending' : 'visible';
}

/**
 * The configured maintainer secret, or null when moderation is disabled. A value
 * under 16 characters is treated as unset, so a leftover placeholder or empty
 * string can never silently enable the endpoint.
 */
function configuredSecret(): string | null {
  const raw = process.env.DISCUSSION_MODERATION_SECRET;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length >= 16 ? trimmed : null;
}

/** Whether the maintainer moderation API is enabled (a real secret is set). */
export function moderationEnabled(): boolean {
  return configuredSecret() !== null;
}

/**
 * Constant-time check of a presented secret against the configured one. Returns
 * false when moderation is disabled or the presented value is missing/wrong.
 * Both sides are SHA-256 digested first so the compare is fixed-length
 * (timingSafeEqual throws on length mismatch) and never leaks the secret length.
 */
export function verifyModerationSecret(
  presented: string | null | undefined,
): boolean {
  const secret = configuredSecret();
  if (!secret) return false;
  if (typeof presented !== 'string' || presented.length === 0) return false;
  const a = createHash('sha256').update(secret).digest();
  const b = createHash('sha256').update(presented).digest();
  return timingSafeEqual(a, b);
}

/**
 * Extract the presented secret from a request: `Authorization: Bearer <secret>`
 * (preferred) or the `x-moderation-secret` header. Returns null when neither is
 * present.
 */
export function presentedSecret(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  const header = request.headers.get('x-moderation-secret');
  return header ? header.trim() : null;
}
