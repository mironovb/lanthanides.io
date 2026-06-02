/**
 * ContributePanel: the contributor pipeline presented as a credibility feature
 * (Prompt 16): an open, auditable intake with TWO human checkpoints. It ports
 * the real flow documented on /methodology and in the repo: GitHub issue,
 * maintainer `approved` label, manually-dispatched PR, merge. It links the
 * existing structured issue templates, the contribution guide, and the repo.
 *
 * Every claim is checkable against the repository (CLAUDE.md hard rule #1): the
 * `approved`-label gate and the manual-dispatch-only workflow are exactly
 * `.github/workflows/community-intake.yml`; the three templates are the live
 * `.github/ISSUE_TEMPLATE/*.yml`. Nothing here implies auto-publication.
 *
 * Server component.
 */
import { Badge, buttonClasses, Callout } from '@/components/ui';

const GITHUB = 'https://github.com/mironovb/lanthanides.io';

const TEMPLATES = [
  {
    label: 'Submit a price',
    kind: 'Price intake',
    desc: 'A price you observed: seller, form, purity, quantity, and date.',
    href: `${GITHUB}/issues/new?template=price-update.yml`,
  },
  {
    label: 'Report a correction',
    kind: 'Correction',
    desc: 'Flag a value that looks wrong, with a source for the fix.',
    href: `${GITHUB}/issues/new?template=data-correction.yml`,
  },
  {
    label: 'Share a market note',
    kind: 'Market note',
    desc: 'A sourced supply-chain or regulatory development.',
    href: `${GITHUB}/issues/new?template=market-note.yml`,
  },
];

const STEPS: {
  title: string;
  body: string;
  checkpoint?: string;
}[] = [
  {
    title: 'Open a structured issue',
    body: 'Use one of the templates below. Required fields (element, price, form, purity, quantity, source, and date) are enforced by the form, so a submission arrives complete.',
  },
  {
    title: 'Maintainer reads and labels it',
    checkpoint: 'Human checkpoint 1',
    body: 'No automation touches the data until a maintainer reads the issue and applies the `approved` label. Stale, mistyped, or speculative submissions stop here.',
  },
  {
    title: 'A pull request opens',
    body: 'A manually-dispatched workflow validates the fields, writes one observation, refreshes derived data, runs lint and build, then opens a PR. It never runs automatically on issue creation.',
  },
  {
    title: 'Review and merge',
    checkpoint: 'Human checkpoint 2',
    body: 'Merging the PR is what publishes the change, as a reviewable git diff, attributed and dated. Closing it without merging discards the submission cleanly.',
  },
];

export function ContributePanel({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* The pipeline */}
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="flex flex-col border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-border-strong font-mono text-xs font-semibold text-fg">
                {i + 1}
              </span>
              <h3 className="font-serif text-base font-semibold text-fg">
                {s.title}
              </h3>
              {s.checkpoint ? (
                <Badge variant="accent" className="ml-auto whitespace-nowrap">
                  {s.checkpoint}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.body}</p>
          </li>
        ))}
      </ol>

      <Callout
        tone="note"
        title="Two checkpoints, no silent edits"
        className="mt-4"
      >
        There is no path from an unreviewed, unlabelled, or malformed issue into
        the published data. A maintainer decides what is real (the label), and a
        merge (a public, attributable git diff) is what publishes it. The whole
        history is inspectable in the repository.
      </Callout>

      {/* Templates */}
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {TEMPLATES.map((t) => (
          <a
            key={t.href}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col border border-border bg-surface p-4 transition-colors duration-fast hover:border-border-strong"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-fg group-hover:text-accent-strong">
                {t.label}
              </span>
              <Badge variant="default">{t.kind}</Badge>
              <span aria-hidden="true" className="text-fg-dim group-hover:text-accent-strong">
                ↗
              </span>
            </span>
            <span className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {t.desc}
            </span>
          </a>
        ))}
      </div>

      {/* Repo / guide links use plain anchors for new-tab behavior. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href={`${GITHUB}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('primary', 'md')}
        >
          Start a submission on GitHub ↗
        </a>
        <a
          href={`${GITHUB}/blob/main/CONTRIBUTING.md`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary', 'md')}
        >
          Read the contribution guide
        </a>
        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('ghost', 'md')}
        >
          Browse the repository ↗
        </a>
      </div>
    </div>
  );
}
