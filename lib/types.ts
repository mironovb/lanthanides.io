/**
 * Schema contracts: the single source of schema truth (docs/ARCHITECTURE.md §3,
 * CLAUDE.md Prompt-4 checklist). The definitions live in `lib/data/types.ts`
 * alongside the loaders that produce them; this module re-exports them so the
 * architecture's documented `@/lib/types` import path also resolves.
 */
export type * from './data/types';
