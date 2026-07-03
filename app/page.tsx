/**
 * Home (/). A true overview since the 2026-07 simplification: the hero (with
 * the site's two actions, add a price and browse all prices), the active
 * controls banner, and the recent articles. The full 31-element grid lives in
 * ONE place, /elements (the canonical directory and /prices 301 target); home
 * no longer duplicates it. Every number comes from the data layer; nothing is
 * fabricated (CLAUDE.md hard rule #1).
 */
import type { Metadata } from 'next';
import {
  getControlledElementCount,
  getElements,
  getPriceRecords,
  getRegulatedElements,
  getSources,
} from '@/lib/data';
import { getAllArticles } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';
import { FaqJsonLd } from '@/components/seo';
import { Container } from '@/components/layout';
import { SectionHeading } from '@/components/ui';
import { Hero } from '@/components/home/Hero';
import { RegulatoryBanner } from '@/components/regulatory/RegulatoryBanner';
import { ArticleCard } from '@/components/news/ArticleCard';

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
  const regulated = getRegulatedElements();
  const recentArticles = getAllArticles().slice(0, 3);

  return (
    <Container as="main" className="pb-16">
      <FaqJsonLd records={records} elements={totalElements} />

      {/* 1. Hero: stat ribbon + the two actions (add a price, browse prices) */}
      <Hero
        totalElements={totalElements}
        records={records}
        controlled={controlled}
        sources={sources}
      />

      {/* 2. Active controls banner */}
      <RegulatoryBanner elements={regulated} />

      {/* 3. Recent articles */}
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
