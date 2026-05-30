/**
 * Placeholder home (Prompt 3). The crown-jewel-forward home page is built in
 * Prompt 6 (docs/MIGRATION.md §4). This exists only to keep `npm run build`
 * green while the app shell is stood up.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col justify-center px-6 py-16">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
        Strategic Materials Ledger
      </p>

      <h1 className="mt-3 font-serif text-4xl font-semibold text-fg">
        lanthanides.io
      </h1>

      <p className="mt-4 max-w-prose text-base leading-relaxed text-fg-muted">
        Sourced pricing, supply-chain risk, and regulatory intelligence for
        rare-earth and strategic materials.
      </p>

      <div className="mt-8 inline-flex w-fit items-center gap-2 border border-border bg-surface px-3 py-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-risk-medium"
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-fg-muted">
          Migration in progress — Next.js app shell (Prompt 3 of 25)
        </span>
      </div>
    </main>
  );
}
