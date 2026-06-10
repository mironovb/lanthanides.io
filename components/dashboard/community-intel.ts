/**
 * Shared, pure contract for the dashboard's "Community intelligence" panel, the
 * one place the API route (server) and the CommunityIntel island (client) agree
 * on which discussion categories the dashboard surfaces and the shape of the
 * response between them.
 *
 * Pure and import-light by design: no DB, no filesystem, no server/client-only
 * imports (only a type-only import of DiscussionCategory). Keeping it pure is
 * what lets the SSG dashboard page stay DB-free, the live board reaches the page
 * only through the client island + the force-dynamic /api/dashboard/discussion
 * route, never a build-time Prisma read. See docs/DASHBOARD-ROADMAP.md §6.
 */
import type { DiscussionCategory } from '@/components/discussion/discussion';

/**
 * The discussion categories the dashboard actually acts on, in display order:
 * source tips and data corrections (signals to triage), then price and
 * regulatory questions (signals to answer). Market notes and site/meta threads
 * are intentionally left to the full board, the dashboard is not a social feed.
 * `satisfies` checks every id is a real category without widening the literals,
 * so `counts[cat]` stays exhaustively keyed.
 */
export const DASHBOARD_DISCUSSION_CATEGORIES = [
  'source-tip',
  'data-correction',
  'price-question',
  'regulatory-question',
] as const satisfies readonly DiscussionCategory[];

export type DashboardDiscussionCategory =
  (typeof DASHBOARD_DISCUSSION_CATEGORIES)[number];

/**
 * One recent thread as the panel renders it: display fields only. There is no
 * private contact column on a discussion thread, so nothing here can leak (see
 * components/discussion/discussion.ts). `body` is deliberately omitted, the
 * panel lists titles, not posts.
 */
export interface CommunityThreadItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  status: string;
  replyCount: number;
  /** RFC3339 last-activity timestamp. */
  updatedAt: string;
  authorName: string;
  organization: string | null;
  // Optional navigational reference links carried by the thread (never a claim
  // the dataset changed; see components/discussion/ThreadRefs.tsx).
  elementSymbol: string | null;
  noticeId: string | null;
  // Source-tip lead metadata, present only on source-tip threads.
  sourceUrl: string | null;
  sourceDate: string | null;
}

/** Successful payload: the recent threads plus per-category public counts. */
export interface CommunityIntelData {
  threads: CommunityThreadItem[];
  /** Count of public, actionable threads per category id (every key present). */
  counts: Record<string, number>;
  /** Sum of `counts`, total public, actionable threads on the board. */
  total: number;
}

/**
 * The /api/dashboard/discussion response. `ok:false` is the graceful path: the
 * board table is absent in local dev, or the database is briefly unreachable.
 * The panel treats it as "temporarily unavailable" and the SSG reference
 * sections, which never read the DB, are unaffected.
 */
export type CommunityIntelResponse =
  | ({ ok: true } & CommunityIntelData)
  | { ok: false; reason?: string };
