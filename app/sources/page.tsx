/**
 * /sources: the curated data-source registry and trust tiers (SSG).
 *
 * The trust-tier reference table comes from `_data/site_settings.yml`
 * (source_trust_tiers) and the registered-source table from
 * `_data/source_registry.yml` (name, type, trust tier, country, supported
 * elements, parse status, review status). Only fields that exist in the registry
 * are shown; columns with no data (url, last_fetch, ingestion_method) are dropped
 * rather than fabricated (CLAUDE.md hard rule #1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings, getSources } from '@/lib/data';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, SectionHeading, Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { capitalize } from '@/components/elements/format';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd } from '@/components/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Rare Earth Price Data Sources: Trust Tiers & Registry',
  description:
    'Registry of curated data sources for rare earth and strategic metal pricing. Trust tier classifications, ingestion status, and data quality methodology.',
  path: '/sources/',
});

/** Tier to reliability label and tone, matching the old site's badge mapping. */
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

const PILL =
  'inline-block rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold';

export default function SourcesPage() {
  const settings = getSiteSettings();
  const sources = getSources();
  // YAML numeric keys arrive as object keys; order ascending (1 → 5).
  const tiers = Object.entries(settings.source_trust_tiers).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );

  return (
    <Container as="main" className="py-10">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Sources', path: '/sources/' }]} />
      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Sources' }]}
        eyebrow="Provenance"
        title="Data Sources"
        lead={
          <>
            Every price record names its source. Sources are classified into five
            trust tiers and tracked in a reviewable registry. See{' '}
            <Link
              href="/methodology/"
              className="text-fg underline decoration-dotted underline-offset-2 hover:text-accent-strong"
            >
              Methodology
            </Link>{' '}
            for how trust tiers gate reference-price selection.
          </>
        }
      >
        <StoryLink>
          See a source attached to live prices on any{' '}
          <Link href="/elements/">element page</Link>.
        </StoryLink>
      </PageHeader>

      {/* ── Trust tiers ──────────────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading title="Trust Tiers" />
        <Table>
          <THead>
            <TR hover={false}>
              <TH numeric>Tier</TH>
              <TH>Description</TH>
              <TH>Reliability</TH>
            </TR>
          </THead>
          <TBody>
            {tiers.map(([tier, description]) => {
              const rel = TIER_RELIABILITY[Number(tier)];
              return (
                <TR key={tier}>
                  <TD numeric>{tier}</TD>
                  <TD>{description}</TD>
                  <TD>
                    {rel && (
                      <span className={`${PILL} ${rel.classes}`}>
                        {rel.label}
                      </span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </section>

      {/* ── Registered sources ───────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionHeading title="Registered Sources" count={sources.length} />

        {sources.length > 0 ? (
          <Table>
            <THead>
              <TR hover={false}>
                {['Source', 'Type', 'Trust Tier', 'Country', 'Supported Elements', 'Status', 'Review'].map(
                  (h) => (
                    <TH key={h}>{h}</TH>
                  ),
                )}
              </TR>
            </THead>
            <TBody>
              {sources.map((source) => (
                <TR key={source.id}>
                  <TD className="font-medium">
                    <span className="text-fg">{source.name}</span>
                  </TD>
                  <TD>{capitalize(source.type)}</TD>
                  <TD className="font-mono tabular-nums">{source.trust_tier}</TD>
                  <TD className="font-mono">{source.country || 'n/a'}</TD>
                  <TD>
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
                  </TD>
                  <TD>
                    {source.parse_status === 'active' ? (
                      <span className={`${PILL} border border-up/25 bg-up/10 text-up`}>
                        Active
                      </span>
                    ) : (
                      <span className="font-mono text-2xs text-fg-dim">
                        {source.parse_status}
                      </span>
                    )}
                  </TD>
                  <TD className="text-xs">
                    <span className={REVIEW_STYLE[source.review_status] ?? 'text-fg-dim'}>
                      {capitalize(source.review_status)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="border border-border bg-surface px-4 py-6 text-sm text-fg-dim">
            No sources are registered yet.
          </div>
        )}
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <Callout tone="note" glyph={null} className="mt-12">
        <strong className="text-fg">Disclaimer:</strong> All prices shown require
        source provenance. No data is fabricated or interpolated. Prices are
        normalised to USD/kg for comparability; original quoted units are
        preserved in provenance records. Retail and bulk tiers are never merged.{' '}
        <Link href="/methodology/">Full methodology →</Link>
      </Callout>
    </Container>
  );
}
