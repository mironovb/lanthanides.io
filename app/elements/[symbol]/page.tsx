/**
 * /elements/[symbol] — per-element detail page (SSG, case-sensitive, Prompt 6).
 *
 * Statically generated for all 31 catalog symbols via generateStaticParams();
 * `dynamicParams = false` 404s anything else (URLs are case-sensitive: /Dy/, not
 * /dy/). Ports legacy/_layouts/element-detail.html — header + badges, the two
 * reference-price cards, the Price Movement table, the inline regulatory notice,
 * the editorial body (with its embedded provenance table), related elements, and
 * prev/next navigation. Per-page metadata comes from the `_elements/*.md` front
 * matter via the Next Metadata API.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import '@/components/elements/element-body.css';

import { getElementContent } from '@/lib/content';
import {
  getElementBySymbol,
  getElements,
  getFluctuation,
  getPriceRecords,
  getReferencePrices,
} from '@/lib/data';
import type { Element } from '@/lib/types';
import {
  CATEGORY_ORDER,
  CATEGORY_STYLE,
  REGULATORY_BADGE,
} from '@/components/elements/categories';
import { ElementBody } from '@/components/elements/ElementBody';
import { fmtPremium } from '@/components/elements/format';
import { PriceMovementTable } from '@/components/elements/PriceMovementTable';
import { ProvenanceTable } from '@/components/elements/ProvenanceTable';
import { ReferencePriceCard } from '@/components/elements/ReferencePriceCard';
import { RegulatoryNotice } from '@/components/elements/RegulatoryNotice';

const PROVENANCE_INCLUDE = /\{%\s*include\s+provenance-table\.html/;

type Params = { symbol: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getElements().map((e) => ({ symbol: e.symbol }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const element = getElementBySymbol(params.symbol);
  const fm = getElementContent(params.symbol)?.frontMatter;
  if (!element && !fm) return {};
  return {
    title: fm?.title ?? `${element?.name ?? params.symbol} Price`,
    description: fm?.description,
    keywords: fm?.keywords,
    alternates: { canonical: `/elements/${params.symbol}/` },
  };
}

export default function ElementDetailPage({ params }: { params: Params }) {
  const element = getElementBySymbol(params.symbol);
  if (!element) notFound();

  const allElements = getElements();
  const records = getPriceRecords(element.symbol);
  const { retailRef, bulkRef, retailPremium } = getReferencePrices(
    element.symbol,
  );
  const fluctuation = getFluctuation(element.symbol);
  const content = getElementContent(element.symbol);

  const cat = CATEGORY_STYLE[element.category];
  const latestDate = records.reduce<string | null>(
    (max, r) => (max == null || r.quote_date > max ? r.quote_date : max),
    null,
  );
  const premium = retailPremium != null ? fmtPremium(retailPremium) : null;

  // The 24 bodies that embed the provenance include render it inline; bodies
  // without it (and the empty-body fallback) get a dedicated "All Offers"
  // section so every page surfaces the full provenance ledger.
  const hasInlineProvenance =
    !!content && PROVENANCE_INCLUDE.test(content.body);

  const related = relatedElements(allElements, element);
  const ordered = orderedElements(allElements);
  const idx = ordered.findIndex((e) => e.symbol === element.symbol);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return (
    <main className="mx-auto max-w-content px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-dim">
        <Link href="/" className="hover:text-fg">
          Home
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <Link href="/elements/" className="hover:text-fg">
          Elements
        </Link>
        <span className="px-2 text-border-strong">/</span>
        <span className="text-fg">
          {element.symbol} — {element.name}
        </span>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-4 border-b border-border-strong pb-6 md:flex-row md:items-start md:gap-6">
        <div className="flex flex-1 items-start gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center border border-t-2 border-border ${cat.borderTop} bg-surface`}
          >
            <span className="font-mono text-xs text-fg-dim">
              #{element.atomic_number}
            </span>
            <span className="font-sans text-3xl font-bold leading-none text-fg">
              {element.symbol}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold text-fg">
              {element.name} Price
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${cat.badge}`}
              >
                {cat.badgeLabel}
              </span>
              {element.regulatory_status !== 'none' && (
                <Link
                  href="/regulatory/"
                  className={`inline-block rounded-sm px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide ${REGULATORY_BADGE[element.regulatory_status].classes}`}
                >
                  {REGULATORY_BADGE[element.regulatory_status].label}
                </Link>
              )}
            </div>

            {element.notes && (
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {element.notes}
              </p>
            )}

            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {element.trade_form && (
                <>
                  <dt className="font-semibold text-fg-dim">Main trade forms</dt>
                  <dd className="text-fg-muted">{element.trade_form}</dd>
                </>
              )}
              {element.origin_countries.length > 0 && (
                <>
                  <dt className="font-semibold text-fg-dim">Available from</dt>
                  <dd className="text-fg-muted">
                    {element.origin_countries.join(', ')}
                  </dd>
                </>
              )}
              {element.purity_range && (
                <>
                  <dt className="font-semibold text-fg-dim">Purity range</dt>
                  <dd className="font-mono text-fg-muted">
                    {element.purity_range}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        <div className="shrink-0 font-mono text-sm text-fg-dim md:text-right">
          {latestDate && (
            <>
              Last update: {latestDate}
              <br />
            </>
          )}
          {records.length} record{records.length !== 1 ? 's' : ''}
        </div>
      </header>

      {/* ── Two reference-price cards ──────────────────────────────────── */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <ReferencePriceCard
          label="Retail Reference"
          record={retailRef}
          emptyText="No qualifying retail record"
          kind="retail"
          premium={premium}
        />
        <ReferencePriceCard
          label="Bulk Benchmark"
          record={bulkRef}
          emptyText="No commodity benchmark available"
          kind="bulk"
        />
      </div>

      {/* ── Price Movement % table ─────────────────────────────────────── */}
      <PriceMovementTable fluctuation={fluctuation} symbol={element.symbol} />

      {/* ── Inline regulatory notice ───────────────────────────────────── */}
      {element.regulatory_status !== 'none' && (
        <RegulatoryNotice
          status={element.regulatory_status}
          name={element.name}
        />
      )}

      {/* ── Editorial body + provenance ────────────────────────────────── */}
      {content && <ElementBody body={content.body} records={records} />}

      {!hasInlineProvenance && (
        <section className="mt-8">
          <h2 className="mb-4 border-b border-border-strong pb-2 font-serif text-lg font-semibold text-fg">
            All Offers
          </h2>
          <ProvenanceTable records={records} />
        </section>
      )}

      {/* ── Related elements ───────────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="mt-8 flex flex-wrap items-baseline gap-2 border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-fg-dim">
            Related elements
          </span>
          {related.map((rel, i) => (
            <span key={rel.symbol} className="flex items-baseline gap-2">
              <Link
                href={`/elements/${rel.symbol}/`}
                className="font-medium text-fg hover:text-accent-strong"
              >
                {rel.name}
              </Link>
              {i < related.length - 1 && (
                <span className="text-fg-dim">·</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Previous / Next ────────────────────────────────────────────── */}
      {(prev || next) && (
        <nav
          aria-label="Element navigation"
          className="mt-8 flex items-center justify-between border-t border-border py-4 text-sm"
        >
          {prev ? (
            <Link
              href={`/elements/${prev.symbol}/`}
              className="font-medium text-fg-muted hover:text-accent-strong"
            >
              ← {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/elements/${next.symbol}/`}
              className="ml-auto text-right font-medium text-fg-muted hover:text-accent-strong"
            >
              {next.name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* ── All-element navigation chips ───────────────────────────────── */}
      <nav className="mt-12 border-t border-border-strong pt-4">
        <div className="flex flex-wrap justify-center gap-1">
          {ordered.map((e) => {
            const cstyle = CATEGORY_STYLE[e.category];
            if (e.symbol === element.symbol) {
              return (
                <span
                  key={e.symbol}
                  aria-current="page"
                  className={`inline-flex h-7 w-9 items-center justify-center border border-t-2 border-fg ${cstyle.borderTop} bg-fg font-sans text-xs font-bold text-base`}
                >
                  {e.symbol}
                </span>
              );
            }
            return (
              <Link
                key={e.symbol}
                href={`/elements/${e.symbol}/`}
                className={`inline-flex h-7 w-9 items-center justify-center border border-t-2 border-border ${cstyle.borderTop} bg-surface font-sans text-xs font-bold text-fg-muted transition-colors hover:bg-fg hover:text-base`}
              >
                {e.symbol}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

// ── Ordering helpers (ported from element-detail.html's Liquid) ──────────────

/** All elements in category order, each category sorted by atomic number. */
function orderedElements(all: Element[]): Element[] {
  return CATEGORY_ORDER.flatMap((cat) =>
    all
      .filter((e) => e.category === cat)
      .sort((a, b) => a.atomic_number - b.atomic_number),
  );
}

/**
 * Up to four related elements in the same category: the two nearest below the
 * current atomic number, then filled up to four from those above.
 */
function relatedElements(all: Element[], current: Element): Element[] {
  const sameCat = all
    .filter((e) => e.category === current.category && e.symbol !== current.symbol)
    .sort((a, b) => a.atomic_number - b.atomic_number);
  const before = sameCat
    .filter((e) => e.atomic_number < current.atomic_number)
    .slice(-2);
  const after = sameCat.filter((e) => e.atomic_number > current.atomic_number);
  return [...before, ...after].slice(0, 4);
}
