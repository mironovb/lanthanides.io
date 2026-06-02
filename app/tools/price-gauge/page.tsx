/**
 * /tools/price-gauge: Price Gauge tool (Prompt 19). A buyer or seller enters an
 * element, form, purity, and quantity and gets an estimated fair-price RANGE with
 * a confidence grade and a full basis disclosure, computed live by the engine
 * (`lib/price-gauge` → `estimatePrice`) over the sourced price records.
 *
 * The page is a Server Component that reads the request query: the form submits
 * via a plain `method="get"`, so the whole tool works with NO JavaScript. The
 * engine runs server-side and the result is server-rendered (JS only enhances the
 * form's element→form constraint). It never fabricates a price: a zero-match
 * query renders the engine's explicit "insufficient data" path (hard rule #1).
 *
 * Dynamic by construction (it reads `searchParams` and transitively touches `fs`
 * via lib/data), so it is request-rendered, not statically optimised.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { BreadcrumbJsonLd, WebApplicationJsonLd } from '@/components/seo';
import {
  getElementBySymbol,
  getElements,
  getPriceRecords,
} from '@/lib/data';
import { estimatePrice } from '@/lib/price-gauge';
import { Container, PageHeader, StoryLink } from '@/components/layout';
import { Callout, Panel } from '@/components/ui';
import { PriceGaugeForm } from '@/components/tools/PriceGaugeForm';
import { PriceGaugeResult } from '@/components/tools/PriceGaugeResult';
import { buildElementOptions, parseGaugeQuery } from '@/components/tools/gauge';

const DESCRIPTION =
  'Estimate a fair price range for a rare-earth or strategic-metal purchase. Pick the element, form, purity, and quantity and get a transparent low/mid/high band, a confidence grade, and the exact sourced records behind it. No opaque index, no fabricated number.';

export const metadata: Metadata = buildMetadata({
  title: 'Price Gauge: Benchmark a Rare-Earth or Strategic-Metal Quote',
  description: DESCRIPTION,
  keywords:
    'rare earth price estimate, rare earth fair price, strategic metals price gauge, oxide metal price per kg, dysprosium price estimate, neodymium price benchmark, rare earth quote check',
  path: '/tools/price-gauge/',
});

type SearchParams = Record<string, string | string[] | undefined>;

export default function PriceGaugePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const elements = getElements();
  const records = getPriceRecords();
  const options = buildElementOptions(elements, records);
  const knownForms = [
    ...new Set(records.map((r) => r.form.toLowerCase())),
  ].sort();

  const parse = parseGaugeQuery(searchParams ?? {}, {
    symbols: elements.map((e) => e.symbol),
    forms: knownForms,
  });

  const element = parse.input ? getElementBySymbol(parse.input.symbol) : null;
  const result =
    parse.input && element ? estimatePrice(parse.input, records) : null;
  const blocked = parse.submitted && !parse.input;

  // The "view as JSON" link mirrors the current query so a developer sees the
  // exact engine response behind the page. Trailing slash on the handler path
  // avoids the trailingSlash 308 hop; no query → the API's usage doc.
  const apiHref = parse.input
    ? `/api/price-gauge/?${new URLSearchParams(
        Object.entries({
          symbol: parse.input.symbol,
          form: parse.input.form ?? '',
          purity: parse.input.purity ?? '',
          quantityKg:
            parse.input.quantityKg != null ? String(parse.input.quantityKg) : '',
          tier: parse.input.tier ?? '',
        }).filter(([, v]) => v !== ''),
      ).toString()}`
    : '/api/price-gauge/';

  return (
    <Container as="main" className="py-10">
      <WebApplicationJsonLd
        name="Price Gauge · lanthanides.io"
        description={DESCRIPTION}
        path="/tools/price-gauge/"
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Price Gauge', path: '/tools/price-gauge/' },
        ]}
      />

      <PageHeader
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Price Gauge' }]}
        eyebrow="Tools"
        title="Price Gauge"
        lead="Estimate a fair price for a rare-earth or strategic-metal purchase. Enter what you're buying or selling and the gauge returns a low/mid/high range, how confident it is, and the exact sourced records behind the number."
        actions={
          <div className="flex flex-col items-start gap-1 text-xs md:items-end">
            <Link
              href="/methodology/#display-price"
              className="text-accent hover:text-accent-strong"
            >
              How prices are set →
            </Link>
            <Link
              href={apiHref}
              className="font-mono text-fg-dim hover:text-fg"
            >
              {parse.input ? 'View as JSON →' : 'JSON API →'}
            </Link>
          </div>
        }
      >
        <StoryLink>
          The estimate is built from the same provenanced records behind every{' '}
          <Link href="/elements/">element page</Link> and the{' '}
          <Link href="/data/">Open Data</Link> exports. Nothing is interpolated.
        </StoryLink>
      </PageHeader>

      {/* ── Form + result ────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div>
          <PriceGaugeForm
            options={options}
            forms={knownForms}
            values={parse.values}
            fieldErrors={parse.fieldErrors}
          />
        </div>

        <div>
          {result && element ? (
            <PriceGaugeResult result={result} element={element} />
          ) : blocked ? (
            <Panel title="Check your inputs" eyebrow="Result">
              <Callout tone="warning" title="The request couldn't be run">
                <ul className="space-y-1">
                  {Object.values(parse.fieldErrors).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </Callout>
            </Panel>
          ) : (
            <GaugeIntro />
          )}
        </div>
      </div>
    </Container>
  );
}

/** Pre-submit empty state: sets expectations for the three outputs. */
function GaugeIntro() {
  return (
    <Panel title="What you'll get" eyebrow="Result">
      <p className="text-sm leading-relaxed text-fg-muted">
        Fill in the form and submit to see a fair-price estimate for that
        element. Every estimate has three parts:
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-fg-muted">
        <li>
          <span className="font-semibold text-fg">A range, not a point.</span> A
          low / mid / high band in USD per kg, the robust interquartile spread
          of the matching sourced records.
        </li>
        <li>
          <span className="font-semibold text-fg">A confidence grade.</span> Low,
          medium, or high, from how many records matched, how many distinct
          sellers, how recent, and how closely they agree.
        </li>
        <li>
          <span className="font-semibold text-fg">A full basis.</span> The record
          count, seller count, date span, method, and the contributing record ids,
          each traceable to the element&rsquo;s provenance table.
        </li>
      </ul>
      <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-fg-dim">
        If too few records match your request, the gauge tells you plainly and
        suggests how to widen it. It never fabricates a price.
      </p>
    </Panel>
  );
}
