/**
 * /sources — the curated data-source registry + trust tiers (SSG, Prompt 8).
 *
 * Ports legacy/pages/sources.html: the trust-tier reference table (from
 * `_data/site_settings.yml` → source_trust_tiers) and the registered-source
 * table (from `_data/source_registry.yml` → name, type, trust tier, country,
 * supported elements, parse status, review status). Only fields that actually
 * exist in the registry are shown — absent legacy columns (url, last_fetch,
 * ingestion_method) are dropped rather than fabricated (CLAUDE.md hard rule #1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings, getSources } from '@/lib/data';
import { capitalize } from '@/components/elements/format';

export const metadata: Metadata = {
  title: 'Rare Earth Price Data Sources — Trust Tiers & Registry',
  description:
    'Registry of curated data sources for rare earth and strategic metal pricing. Trust tier classifications, ingestion status, and data quality methodology.',
  alternates: { canonical: '/sources/' },
};

/** Tier → reliability label + tone, matching the legacy badge mapping. */
const TIER_RELIABILITY: Record<number, { label: string; classes: string }> = {
  1: { label: 'Highest', classes: 'text-up bg-up/10 border border-up/25' },
  2: { label: 'High', classes: 'text-accent-strong bg-accent/10 border border-accent/25' },
  3: { label: 'Medium', classes: 'text-risk-medium bg-risk-medium/10 border border-risk-medium/25' },
  4: { label: 'Reference', classes: 'text-fg-muted bg-overlay border border-border-strong' },
  5: { label: 'Context Only', classes: 'text-fg-dim bg-surface border border-border' },
};

const REVIEW_STYLE: Record<string, string> = {
  reviewed: 'text-accent-strong',
  pending: 'text-risk-medium',
};

export default function SourcesPage() {
  const settings = getSiteSettings();
  const sources = getSources();
  // YAML numeric keys arrive as object keys; order ascending (1 → 5).
  const tiers = Object.entries(settings.source_trust_tiers).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">Sources</span>
      </nav>

      <header className="mb-8 border-b border-border-strong pb-6">
        <h1 className="font-serif text-3xl font-semibold text-fg">Data Sources</h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-fg-muted">
          Every price record names its source. Sources are classified into five
          trust tiers and tracked in a reviewable registry. See{' '}
          <Link
            href="/methodology/"
            className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
          >
            Methodology
          </Link>{' '}
          for how trust tiers gate reference-price selection.
        </p>
      </header>

      {/* ── Trust tiers ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 border-b border-border pb-2 font-serif text-lg font-semibold text-fg">
          Trust Tiers
        </h2>
        <div className="overflow-x-auto border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface text-left">
                <th className="border-b-2 border-border-strong px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-dim">
                  Tier
                </th>
                <th className="border-b-2 border-border-strong px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-dim">
                  Description
                </th>
                <th className="border-b-2 border-border-strong px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-dim">
                  Reliability
                </th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(([tier, description]) => {
                const rel = TIER_RELIABILITY[Number(tier)];
                return (
                  <tr
                    key={tier}
                    className="border-b border-border last:border-0 hover:bg-overlay"
                  >
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-fg">
                      {tier}
                    </td>
                    <td className="px-3 py-2 text-fg-muted">{description}</td>
                    <td className="px-3 py-2">
                      {rel && (
                        <span
                          className={`inline-block rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold ${rel.classes}`}
                        >
                          {rel.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Registered sources ───────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-3 flex items-baseline gap-2 border-b border-border pb-2 font-serif text-lg font-semibold text-fg">
          Registered Sources
          <span className="ml-auto font-mono text-xs font-normal text-fg-dim">
            {sources.length}
          </span>
        </h2>

        {sources.length > 0 ? (
          <div className="overflow-x-auto border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface text-left">
                  {['Source', 'Type', 'Trust Tier', 'Country', 'Supported Elements', 'Status', 'Review'].map(
                    (h) => (
                      <th
                        key={h}
                        className="border-b-2 border-border-strong px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-dim"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr
                    key={source.id}
                    className="border-b border-border align-top last:border-0 hover:bg-overlay"
                  >
                    <td className="px-3 py-2 font-medium text-fg">{source.name}</td>
                    <td className="px-3 py-2 text-fg-muted">{capitalize(source.type)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-fg-muted">
                      {source.trust_tier}
                    </td>
                    <td className="px-3 py-2 font-mono text-fg-muted">
                      {source.country || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="mb-1 block font-mono text-2xs text-fg-dim">
                        {source.supported_elements.length} elements
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {source.supported_elements.map((sym) => (
                          <code
                            key={sym}
                            className="rounded-sm bg-overlay px-1 py-px font-mono text-2xs text-fg-muted"
                          >
                            {sym}
                          </code>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {source.parse_status === 'active' ? (
                        <span className="inline-block rounded-sm border border-up/25 bg-up/10 px-1.5 py-0.5 font-mono text-2xs font-semibold text-up">
                          Active
                        </span>
                      ) : (
                        <span className="font-mono text-2xs text-fg-dim">
                          {source.parse_status}
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs ${REVIEW_STYLE[source.review_status] ?? 'text-fg-dim'}`}
                    >
                      {capitalize(source.review_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-border bg-surface px-4 py-6 text-sm text-fg-dim">
            No sources are registered yet.
          </div>
        )}
      </section>

      {/* ── Disclaimer (legacy disclaimer.html) ──────────────────────────── */}
      <aside className="mt-10 border border-l-[3px] border-border border-l-accent bg-surface px-5 py-4 text-sm leading-relaxed text-fg-muted">
        <strong className="text-fg">Disclaimer:</strong> All prices shown require
        source provenance. No data is fabricated or interpolated. Prices are
        normalised to USD/kg for comparability; original quoted units are
        preserved in provenance records. Retail and bulk tiers are never merged.{' '}
        <Link
          href="/methodology/"
          className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
        >
          Full methodology →
        </Link>
      </aside>
    </main>
  );
}
