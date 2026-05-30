/**
 * /movements.xml — the Market Movements Atom feed (Prompt 7). A faithful port of
 * the legacy Jekyll `movements.xml` template: same feed metadata, same entry
 * shape (title, tag-scheme id, categories, text summary + HTML content), and the
 * same 50-event cap, regenerated from _data/movements.yml.
 *
 * The URL is preserved exactly (`/movements.xml`, no trailing slash — a
 * machine-readable endpoint, CLAUDE.md URL contract). `force-static` emits it as
 * a build-time file alongside the SSG pages.
 */
import { getMovements } from '@/lib/data';
import type { MovementEvent } from '@/lib/types';

export const dynamic = 'force-static';

const SITE = 'https://www.lanthanides.io';
const SITE_TITLE =
  'lanthanides.io — Rare Earth Prices, Export Controls & Strategic Materials Intelligence';
const SITE_AUTHOR = 'Bogdan Mironov';
// Host for the tag: URI scheme — scheme and all slashes stripped (legacy logic).
const HOST = SITE.replace(/^https?:\/\//, '').replace(/\//g, '');
const FEED_LIMIT = 50;

const KIND: Record<string, string> = {
  price_spike: 'Price spike',
  price_drop: 'Price drop',
  regulatory_change: 'Regulatory change',
  new_data: 'New data',
};

/** Escape the five XML metacharacters (mirrors Jekyll's `xml_escape`). */
function xmlEscape(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Ruby `Float#to_s`: integer-valued floats keep one decimal ('8.0'), else natural form. */
function rubyFloat(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

/** Signed prefix: '+' up, U+2212 minus down, none otherwise (matches the legacy feed). */
function sign(direction?: string): string {
  if (direction === 'up') return '+';
  if (direction === 'down') return '−';
  return '';
}

function entryTitle(e: MovementEvent): string {
  let title = `${KIND[e.type] ?? 'Movement'} · ${e.element_name} (${e.element})`;
  if (e.tier_label) title += ` — ${e.tier_label}`;
  if (e.abs_magnitude_pct != null) {
    title += ` ${sign(e.direction)}${rubyFloat(e.abs_magnitude_pct)}%`;
  }
  return title;
}

function renderEntry(e: MovementEvent): string {
  const url = `${SITE}/movements/#mv-${e.id}`;
  const elementUrl = `${SITE}${e.element_url}`;

  const categories = [`    <category term="${xmlEscape(e.type)}"/>`];
  if (e.tier) categories.push(`    <category term="tier-${xmlEscape(e.tier)}"/>`);
  if (e.element)
    categories.push(`    <category term="element-${xmlEscape(e.element)}"/>`);

  const content = [`      &lt;p&gt;${xmlEscape(e.description)}&lt;/p&gt;`];
  if (e.start_price_per_kg != null && e.end_price_per_kg != null) {
    content.push(
      `      &lt;p&gt;&lt;strong&gt;Window:&lt;/strong&gt; ${e.start_date} → ${e.end_date} (${e.actual_span_days} days)&lt;br/&gt;`,
      `      &lt;strong&gt;Price:&lt;/strong&gt; $${rubyFloat(e.start_price_per_kg)}/kg → $${rubyFloat(e.end_price_per_kg)}/kg (${sign(e.direction)}${rubyFloat(e.abs_magnitude_pct as number)}%)&lt;br/&gt;`,
      `      &lt;strong&gt;Observations:&lt;/strong&gt; ${e.observation_count} across ${e.distinct_days} day(s) · confidence: ${xmlEscape(e.confidence)}&lt;/p&gt;`,
    );
  }
  content.push(
    `      &lt;p&gt;See &lt;a href="${elementUrl}"&gt;${xmlEscape(e.element_name)} on lanthanides.io&lt;/a&gt;.&lt;/p&gt;`,
  );

  return [
    '  <entry>',
    `    <title>${xmlEscape(entryTitle(e))}</title>`,
    `    <link href="${url}" rel="alternate" type="text/html"/>`,
    `    <id>tag:${HOST},${e.date}:movement/${e.id}</id>`,
    `    <published>${e.date}T00:00:00Z</published>`,
    `    <updated>${e.date}T00:00:00Z</updated>`,
    ...categories,
    `    <summary type="text">${xmlEscape(e.description)}</summary>`,
    '    <content type="html">',
    ...content,
    '    </content>',
    '  </entry>',
  ].join('\n');
}

export function GET(): Response {
  const { state, events } = getMovements();
  const updated =
    state?.last_run ??
    (events[0] ? `${events[0].date}T00:00:00Z` : '1970-01-01T00:00:00Z');
  const entries = events.slice(0, FEED_LIMIT).map(renderEntry).join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <title>${xmlEscape(`${SITE_TITLE} — Market Movements`)}</title>
  <subtitle>Auto-generated price-movement and regulatory-change alerts for rare earth and strategic metals.</subtitle>
  <link href="${SITE}/movements.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE}/movements/" rel="alternate" type="text/html"/>
  <id>${SITE}/movements.xml</id>
  <updated>${updated}</updated>
  <generator uri="https://github.com/mironovb/lanthanides.io" version="1.0">scripts/detect_movements.py</generator>
  <author>
    <name>${xmlEscape(SITE_AUTHOR)}</name>
    <uri>${SITE}/</uri>
  </author>
  <rights>CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/</rights>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
