/**
 * Structured-data (JSON-LD) components (Prompt 24).
 *
 * Server-first ports of the four legacy `_includes/structured-data-*.html`
 * blocks (WebSite + FAQPage, BreadcrumbList, Article, Product/Offer), plus a
 * Dataset entity for the open dataset and a WebApplication entity for the
 * tool surfaces. Each builds a plain schema.org object and renders it through
 * the shared <JsonLd>. Pages compose these instead of hand-writing `<script>`
 * blocks, so the rendering/escaping is identical everywhere.
 */
import type { Element, PriceRecord } from '@/lib/types';
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
} from '@/lib/seo';
import { JsonLd, abs, ORG_ID, SITE_URL } from './JsonLd';

export { JsonLd, abs, SITE_URL } from './JsonLd';

const CC_BY_40 = 'https://creativecommons.org/licenses/by/4.0/';
const REPO_URL = 'https://github.com/mironovb/lanthanides.io';

/** The shared Organization node (full definition lives in <SiteJsonLd>). */
const ORG_REF = {
  '@type': 'Organization',
  name: 'lanthanides.io',
  url: `${SITE_URL}/`,
};

// ── Site-wide: WebSite + Organization (rendered once in the root layout) ────
export function SiteJsonLd() {
  return (
    <JsonLd
      data={[
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          alternateName: 'lanthanides.io',
          url: `${SITE_URL}/`,
          description: DEFAULT_DESCRIPTION,
          inLanguage: 'en',
          license: CC_BY_40,
          publisher: { '@id': ORG_ID },
          about: [
            { '@type': 'Thing', name: 'Rare earth element prices' },
            { '@type': 'Thing', name: 'Strategic metal pricing' },
            { '@type': 'Thing', name: 'Chinese export controls' },
          ],
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': ORG_ID,
          name: 'lanthanides.io',
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/assets/images/logo-128.png`,
          description:
            'Open reference for rare-earth and strategic-metal pricing and Chinese export-control intelligence.',
          sameAs: [REPO_URL],
        },
      ]}
    />
  );
}

// ── BreadcrumbList (detail + section pages) ─────────────────────────────────
export interface BreadcrumbCrumb {
  name: string;
  /** Site-relative path; omit on the trailing (current-page) crumb. */
  path?: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbCrumb[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          ...(c.path ? { item: abs(c.path) } : {}),
        })),
      }}
    />
  );
}

// ── FAQPage (home): ported verbatim from structured-data-site.html ─────────
export function FaqJsonLd({
  records,
  elements,
}: {
  records: number;
  elements: number;
}) {
  const mainEntity = [
    {
      q: 'What is the current price of rare earth elements?',
      a: `Rare earth prices vary widely by element, form, and market tier. Light rare earths like lanthanum and cerium trade at $30-200/kg for oxide, while heavy rare earths like terbium ($800-1,200/kg oxide) and dysprosium ($280-350/kg oxide) command higher prices due to scarcity and export controls. Retail metal prices carry a 5-100x premium over bulk benchmarks. lanthanides.io tracks ${records} price records across ${elements} elements with both retail and bulk pricing.`,
    },
    {
      q: 'How much does neodymium cost per kilogram?',
      a: 'Neodymium metal costs approximately $70-120/kg at bulk/industrial benchmark pricing for 99% oxide. Retail neodymium metal from established suppliers ranges from $1,200-20,000/kg depending on form, purity, and quantity. The wide spread reflects the difference between commodity-scale FOB China pricing and small-lot Western retail. NdFeB permanent magnet materials trade at different prices. See our neodymium page for current verified prices with full provenance.',
    },
    {
      q: 'Why are rare earth prices increasing?',
      a: 'Rare earth prices have been driven higher by Chinese export controls introduced since April 2025 (MOFCOM Announcement No. 18/2025), which restrict seven medium and heavy rare earths including samarium, gadolinium, terbium, dysprosium, lutetium, scandium, and yttrium. These controls created a two-tier pricing structure where FOB China export prices trade 30-50% above domestic Chinese levels, and Western retail prices are 3-8x higher. Additional controls on gallium, germanium, tungsten, tellurium, and other strategic metals further tightened supply.',
    },
    {
      q: "What are China's rare earth export controls?",
      a: "China has implemented multiple layers of rare earth export controls since 2023: Announcement No. 23/2023 (gallium and germanium), No. 33/2024 (antimony), No. 46/2024 (Ga/Ge/Sb US ban), No. 10/2025 (tungsten, tellurium, bismuth, molybdenum, indium), and No. 18/2025 (seven heavy rare earths). The October 2025 escalation measures (Nos. 55-58, 61, 62) adding five more elements were suspended until November 2026. These controls require MOFCOM export licences with 4-6 month processing times.",
    },
  ];

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: mainEntity.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      }}
    />
  );
}

// ── Article (news/[slug]): ported from structured-data-article.html ────────
export function ArticleJsonLd({
  slug,
  title,
  description,
  datePublished,
  dateModified,
  image,
}: {
  slug: string;
  title: string;
  description?: string;
  datePublished: string;
  dateModified?: string;
  /** Bare filename under /assets/images/, e.g. the article hero. */
  image?: string;
}) {
  const url = abs(`/news/${slug}/`);
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        ...(description ? { description } : {}),
        url,
        datePublished,
        dateModified: dateModified ?? datePublished,
        author: ORG_REF,
        publisher: ORG_REF,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        inLanguage: 'en',
        about: [
          { '@type': 'Thing', name: 'Rare earth prices' },
          { '@type': 'Thing', name: 'Strategic metal market' },
        ],
        ...(image ? { image: abs(`/assets/images/${image}`) } : {}),
      }}
    />
  );
}

// ── Product + Offer[] (elements/[symbol]): from structured-data-element.html ─
const CATEGORY_LABEL: Record<Element['category'], string> = {
  rare_earth_light: 'Light Rare Earth Element',
  rare_earth_heavy: 'Heavy Rare Earth Element',
  strategic_metal: 'Strategic Metal',
  semiconductor_metal: 'Semiconductor Metal',
};

/** quote_date (YYYY-MM-DD) + 90 days, in UTC, mirrors the legacy +7776000s. */
function priceValidUntil(quoteDate: string): string {
  const d = new Date(`${quoteDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 90);
  return d.toISOString().slice(0, 10);
}

function offerNode(name: string, ref: PriceRecord) {
  return {
    '@type': 'Offer',
    name,
    priceCurrency: 'USD',
    price: ref.normalized_usd_per_kg,
    unitCode: 'KGM',
    priceValidUntil: priceValidUntil(ref.quote_date),
    availability: 'https://schema.org/InStock',
    seller: { '@type': 'Organization', name: ref.seller_name },
    itemCondition: 'https://schema.org/NewCondition',
  };
}

export function ElementJsonLd({
  element,
  retailRef,
  bulkRef,
  description,
}: {
  element: Element;
  retailRef: PriceRecord | null;
  bulkRef: PriceRecord | null;
  description?: string;
}) {
  const offers = [];
  if (retailRef)
    offers.push(
      offerNode(`Retail Reference: ${element.name} metal price per kg`, retailRef),
    );
  if (bulkRef)
    offers.push(
      offerNode(
        `Bulk Benchmark: ${element.name} industrial price per kg`,
        bulkRef,
      ),
    );

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${element.name} (${element.symbol}): Price per kg`,
        ...(description ? { description } : {}),
        url: abs(`/elements/${element.symbol}/`),
        brand: { '@type': 'Brand', name: element.name },
        category: CATEGORY_LABEL[element.category],
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'Atomic Number',
            value: String(element.atomic_number),
          },
          {
            '@type': 'PropertyValue',
            name: 'Chemical Symbol',
            value: element.symbol,
          },
          ...(element.export_control_status === 'restricted'
            ? [
                {
                  '@type': 'PropertyValue',
                  name: 'Export Control Status',
                  value: 'Chinese export licence required',
                },
              ]
            : []),
        ],
        ...(offers.length ? { offers } : {}),
      }}
    />
  );
}

// ── Dataset (open data: /data, /regulatory, /offers) ────────────────────────
export interface DatasetDistribution {
  encodingFormat: string;
  contentUrl: string;
  name?: string;
}

export function DatasetJsonLd({
  name,
  description,
  path,
  keywords,
  temporalCoverage,
  distribution,
}: {
  name: string;
  description: string;
  path: string;
  keywords?: string | string[];
  temporalCoverage?: string;
  distribution?: DatasetDistribution[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name,
        description,
        url: abs(path),
        license: CC_BY_40,
        inLanguage: 'en',
        isAccessibleForFree: true,
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        ...(keywords ? { keywords } : {}),
        ...(temporalCoverage ? { temporalCoverage } : {}),
        ...(distribution
          ? {
              distribution: distribution.map((d) => ({
                '@type': 'DataDownload',
                encodingFormat: d.encodingFormat,
                contentUrl: abs(d.contentUrl),
                ...(d.name ? { name: d.name } : {}),
              })),
            }
          : {}),
      }}
    />
  );
}

// ── WebApplication (tool surfaces: price-gauge, sell, alerts) ───────────────
export function WebApplicationJsonLd({
  name,
  description,
  path,
  applicationCategory = 'BusinessApplication',
}: {
  name: string;
  description: string;
  path: string;
  applicationCategory?: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name,
        description,
        url: abs(path),
        applicationCategory,
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': ORG_ID },
      }}
    />
  );
}
