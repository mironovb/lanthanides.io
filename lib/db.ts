/**
 * Prisma client singleton — the one handle to the dynamic, user-generated store
 * (the three Prisma models: `Listing`, `Subscription`, `ScreenedOffer`). The
 * reference/provenance dataset is NEVER read from here; that stays the typed
 * file layer in `lib/data/` (CLAUDE.md hybrid-data rule).
 *
 * Why a singleton: Next.js dev (and any hot-reload) re-evaluates modules on each
 * change, so a fresh `new PrismaClient()` per import would open a new connection
 * pool every reload and eventually exhaust the database. We cache the instance on
 * `globalThis` in non-production so reloads reuse one client; production gets a
 * single module-scoped instance as normal. This is the pattern Prisma documents
 * for Next.js.
 *
 * Server-only: import from route handlers / Server Components, never a Client
 * Component. SQLite locally, Postgres in prod — switched by DATABASE_URL alone
 * (prisma/schema.prisma), so nothing here changes between engines.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Quiet in dev except for real errors; production stays errors-only too.
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
