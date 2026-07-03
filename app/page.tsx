/**
 * Home (/). The landing page and the price ledger, consolidated (2026-07): the
 * hero with the site's one big action (add a price), then all 31 elements as
 * category-grouped tile sections, the legend, the active controls banner, and
 * the recent articles. The old /elements index 301s here and its category
 * anchors survive (section id = category key, kept through the redirect since
 * fragments are reattached client-side). Every number and list comes from the
 * data layer; nothing is fabricated (CLAUDE.md hard rule #1).
 */
import type { Metadata } from 'next';
import {
  getControlledElementCount,
  getElements,
  getElementsByCategory,
  getPriceRecords,
  getReferencePrices,
  getRegulatedElements,
  getSources,
} from '@/lib/data';
import { getAllArticles } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';
import { FaqJsonLd } from '@/components/seo';
import { Container } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import {
  CATEGORY_ORDER,
  CATEGORY_STYLE,
} from '@/components/elements/categories';
import { ElementCard } from '@/components/elements/ElementCard';
import { Hero } from '@/components/home/Hero';
import { RegulatoryBanner } from '@/components/regulatory/RegulatoryBanner';
import { ArticleCard } from '@/components/news/ArticleCard';

const TITLE =
  'lanthanides.io: Rare Earth Prices, Export Controls, and Strategic Materials Intelligence';

const DESCRIPTION =
  'Current prices per kg for all 31 rare earth elements, strategic metals, and semiconductor materials, with source provenance and Chinese export-control tracking. Open data, CC BY 4.0.';

export const metadata: Metadata = buildMetadata({
  // absoluteTitle bypasses the "%s · lanthanides.io" template so the home title
  // is not double-branded. Site-wide WebSite + Organization JSON-LD lives in the
  // root layout; the home page carries the FAQPage entity.
  absoluteTitle: TITLE,
  description: DESCRIPTION,
  keywords:
    'rare earth prices, rare earth element directory, strategic metal prices, retail vs bulk price, MOFCOM announcements, critical minerals data, open data rare earth',
  path: '/',
});

export default function HomePage() {
  const totalElements = getElements().length;
  const records = getPriceRecords().length;
  const controlled = getControlledElementCount();
  const sources = getSources().length;
  const regulated = getRegulatedElements();
  const recentArticles = getAllArticles().slice(0, 3);
  const byCategory = getElementsByCategory();

  return (
    <Container as="main" className="pb-16">
      <FaqJsonLd records={records} elements={totalElements} />

      {/* 1. Hero: lede, the big Add-a-price action, stat ribbon */}
      <Hero
        totalElements={totalElements}
        records={records}
        controlled={controlled}
        sources={sources}
      />

      {/* 2. The price ledger: all elements, grouped by category. Section ids
          are the category keys so old /elements/#<category> deep links keep
          resolving through the 301. */}
      {CATEGORY_ORDER.map((cat) => {
        const elements = [...byCategory[cat]].sort(
          (a, b) => a.atomic_number - b.atomic_number,
        );
        if (elements.length === 0) return null;
        const style = CATEGORY_STYLE[cat];

        return (
          <section key={cat} id={cat} className="mt-12 scroll-mt-24">
            <SectionHeading
              swatch={style.swatch}
              title={style.label}
              count={elements.length}
            />

            <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {elements.map((element) => {
                const { retailRef, bulkRef } = getReferencePrices(
                  element.symbol,
                );
                return (
                  <ElementCard
                    key={element.symbol}
                    element={element}
                    retail={retailRef}
                    bulk={bulkRef}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* 3. Legend for the tile marks */}
      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-risk-high"
          />
          Export licence required
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-risk-medium"
          />
          Under surveillance
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">🔥</span> High demand
        </span>
        <span className="text-fg-dim">
          Latest retail and bulk references, USD per kg
        </span>
      </div>

      {/* 4. Active controls banner */}
      <RegulatoryBanner elements={regulated} />

      {/* 5. Recent articles */}
      {recentArticles.length > 0 && (
        <section className="mt-12">
          <SectionHeading title="Recent Articles" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

