/**
 * One-shot database setup: creates the single contributions-inbox table
 * (db/schema.sql, idempotent). Run with `npm run db:init`.
 *
 * Reads DATABASE_URL from the environment, falling back to a minimal .env
 * parse so local setup needs no extra tooling. Never prints the URL.
 */
import { existsSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"#\s]+)"?\s*$/);
    if (m) process.env.DATABASE_URL = m[1];
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'DATABASE_URL is not set. Point it at your Neon database (see .env.example) and re-run.',
  );
  process.exit(1);
}

const ddl = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const sql = neon(url);

// The Neon HTTP driver runs one statement per call: drop comment lines, then
// split on ';' so a future second statement in schema.sql still works.
const statements = ddl
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

try {
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  const [{ count }] = await sql.query(
    "SELECT count(*)::int AS count FROM price_contributions",
  );
  console.log(`ok: price_contributions ready (${count} row${count === 1 ? '' : 's'})`);
} catch (err) {
  console.error('db:init failed:', err.message ?? err);
  process.exit(1);
}
