/**
 * Home (/). The plain reference home from the last deployed static site
 * (_layouts/home.html), in its original block order: a hero with a stat ribbon,
 * the category legend, the full element grid, the active controls banner, the
 * recent articles, and the recent movements. Every number and list comes from
 * the data layer; nothing is fabricated (CLAUDE.md hard rule #1).
 */
import type { Metadata } from 'next';
import {
  getCategoryCounts,
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
import { CATEGORY_ORDER } from '@/components/elements/categories';
import { ElementCard } from '@/components/elements/ElementCard';
import { Hero } from '@/components/home/Hero';
import { CategoryLegend } from '@/components/home/CategoryLegend';
import { RegulatoryBanner } from '@/components/regulatory/RegulatoryBanner';
import { ArticleCard } from '@/components/news/ArticleCard';
import { HomeMovements } from '@/components/movements/HomeMovements';

const TITLE =
  'lanthanides.io: Rare Earth Prices, Export Controls, and Strategic Materials Intelligence';

const DESCRIPTION =
  'Rare earth and strategic metal prices with source provenance: retail surveys, bulk benchmarks, and Chinese export-control tracking by MOFCOM announcement. Open data, CC BY 4.0.';

export const metadata: Metadata = buildMetadata({
  // absoluteTitle bypasses the "%s · lanthanides.io" template so the home title
  // is not double-branded. Site-wide WebSite + Organization JSON-LD lives in the
  // root layout; the home page carries the FAQPage entity.
  absoluteTitle: TITLE,
  description: DESCRIPTION,
  keywords:
    'rare earth prices, rare earth export controls, MOFCOM announcements, strategic metals pricing, critical minerals data, gallium germanium controls, open data rare earth',
  path: '/',
});

export default function HomePage() {
  const totalElements = getElements().length;
  const records = getPriceRecords().length;
  const controlled = getControlledElementCount();
  const sources = getSources().length;
  const counts = getCategoryCounts();
  const regulated = getRegulatedElements();
  const recentArticles = getAllArticles().slice(0, 3);

  // All elements in one grid, ordered by category then atomic number, matching
  // the old home grid (element-grid.html) rather than the split category
  // sections used on /elements.
  const byCategory = getElementsByCategory();
  const orderedElements = CATEGORY_ORDER.flatMap((cat) =>
    [...byCategory[cat]].sort((a, b) => a.atomic_number - b.atomic_number),
  );

  return (
    <Container as="main" className="pb-16">
      <FaqJsonLd records={records} elements={totalElements} />

      {/* 1. Hero + stat ribbon */}
      <Hero
        totalElements={totalElements}
        records={records}
        controlled={controlled}
        sources={sources}
      />

      {/* 2. Grid legend */}
      <CategoryLegend counts={counts} />

      {/* 3. Element grid (all elements, one grid) */}
      <section className="mt-4" aria-label="Element price grid">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {orderedElements.map((element) => {
            const { retailRef, bulkRef } = getReferencePrices(element.symbol);
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

      {/* 6. Recent movements */}
      <HomeMovements />
    </Container>
  );
}
