'use client';

/**
 * OffersFeed: the interactive shell for the screened-offer feed (Prompt 21).
 * Owns the multi-dimension filter state (element · category · form · source type
 * · a medium-plus-confidence toggle) and renders the dense, sortable offer table,
 * value-ranked by default.
 *
 * Everything is server-rendered in the initial HTML (this island is SSR'd with
 * EMPTY_FILTERS, i.e. all offers visible, sorted by value), so the feed is fully
 * readable and crawlable without JS; filtering + re-sorting are pure progressive
 * enhancement. Composes the shared SortableTable + FilterChips primitives; colour
 * stays on the system's meaning axes only (category/regulatory badges), with the
 * value rank and confidence shown MONOCHROME (they are not a colour axis).
 */
import { useMemo, useState } from 'react';
import {
  Badge,
  cn,
  FilterChips,
  SortableTable,
  type Column,
} from '@/components/ui';
import { capitalize, fmtUsdPrice } from '@/lib/format';
import type { Confidence, ElementCategory } from '@/lib/types';
import {
  buildOfferFilterOptions,
  EMPTY_FILTERS,
  filterOffers,
  valueBand,
  type OfferDTO,
  type OfferFilters,
} from './offers';

const SELECT =
  'rounded-sm border border-border-strong bg-base px-2.5 py-1.5 text-sm text-fg transition-colors duration-fast focus-visible:border-accent focus-visible:outline-none';
const LABEL =
  'mb-1 block text-2xs font-semibold uppercase tracking-caps text-fg-dim';

export function OffersFeed({ offers }: { offers: OfferDTO[] }) {
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_FILTERS);

  const options = useMemo(() => buildOfferFilterOptions(offers), [offers]);
  const filtered = useMemo(() => filterOffers(offers, filters), [offers, filters]);

  const set = <K extends keyof OfferFilters>(key: K, value: OfferFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const anyActive =
    filters.element !== null ||
    filters.category !== null ||
    filters.form !== null ||
    filters.sourceType !== null ||
    filters.mediumPlusOnly;

  return (
    <div>
      {/* ── Filter toolbar ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border border-border bg-surface px-4 py-3">
          <div>
            <label htmlFor="of-element" className={LABEL}>
              Element
            </label>
            <select
              id="of-element"
              className={cn(SELECT, 'min-w-[12rem]')}
              value={filters.element ?? ''}
              onChange={(e) => set('element', e.target.value || null)}
            >
              <option value="">All elements</option>
              {options.elements.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="of-source" className={LABEL}>
              Source type
            </label>
            <select
              id="of-source"
              className={cn(SELECT, 'min-w-[12rem]')}
              value={filters.sourceType ?? ''}
              onChange={(e) => set('sourceType', e.target.value || null)}
            >
              <option value="">All source types</option>
              {options.sourceTypes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            aria-pressed={filters.mediumPlusOnly}
            onClick={() => set('mediumPlusOnly', !filters.mediumPlusOnly)}
            className={cn(
              'rounded-sm border px-2.5 py-1.5 font-mono text-2xs font-semibold uppercase tracking-caps transition-colors duration-fast',
              filters.mediumPlusOnly
                ? 'border-accent bg-accent text-white'
                : 'border-border-strong bg-raised text-fg-muted hover:border-accent hover:text-accent-strong',
            )}
            title="Hide low-confidence offers (keep medium and high, confidence ≥ 0.50)"
          >
            {filters.mediumPlusOnly ? '✓ ' : ''}Medium+ confidence
          </button>

          {anyActive ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-2xs font-medium text-fg-dim underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <FilterChips
          label="Category"
          options={options.categories}
          value={filters.category}
          onChange={(v) => set('category', v as ElementCategory | null)}
        />
        <FilterChips
          label="Form"
          options={options.forms}
          value={filters.form}
          onChange={(v) => set('form', v)}
        />
      </div>

      {/* ── Results count ────────────────────────────────────────────────── */}
      <p className="mt-4 font-mono text-2xs text-fg-dim">
        Showing{' '}
        <span className="text-fg-muted">{filtered.length}</span> of{' '}
        <span className="text-fg-muted">{offers.length}</span> offers
        {anyActive ? ' (filtered)' : ''} · ranked by value
      </p>

      {/* ── Sortable feed ────────────────────────────────────────────────── */}
      <div className="mt-2">
        <SortableTable
          columns={COLUMNS}
          rows={filtered}
          getRowKey={(o) => o.id}
          initialSort={{ key: 'valueScore', dir: 'desc' }}
          emptyMessage="No offers match these filters."
          footnote={
            <>
              Value rank = how far the offer sits below (＋) or above (－) its
              element&rsquo;s same-form median, scaled by source confidence, the
              seed&rsquo;s <span className="text-fg-muted">valueScore</span>.
              Click any column header to re-sort; confidence and value are shown
              monochrome (not a colour axis).
            </>
          }
        />
      </div>
    </div>
  );
}

// ── Columns ─────────────────────────────────────────────────────────────────

const COLUMNS: Column<OfferDTO>[] = [
  {
    key: 'valueScore',
    header: 'Value rank',
    numeric: true,
    align: 'left',
    render: (o) => <ValueCell score={o.valueScore} />,
  },
  {
    key: 'elementSymbol',
    header: 'Element',
    render: (o) => <ElementCell o={o} />,
  },
  { key: 'form', header: 'Form', render: (o) => capitalize(o.form) },
  {
    key: 'purity',
    header: 'Purity',
    render: (o) =>
      o.purity ? (
        <span className="whitespace-nowrap font-mono text-xs text-fg-muted">
          {o.purity}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    key: 'quantityKg',
    header: 'Qty (kg)',
    numeric: true,
    render: (o) =>
      o.quantityKg != null ? o.quantityKg.toLocaleString('en-US') : <Dash />,
  },
  {
    key: 'pricePerKg',
    header: 'Price / kg',
    numeric: true,
    render: (o) => fmtUsdPrice(o.pricePerKg),
  },
  {
    key: 'confidence',
    header: 'Confidence',
    render: (o) => <ConfBars score={o.confidence} band={o.confidenceBand} />,
  },
  {
    key: 'sellerName',
    header: 'Seller',
    render: (o) => <SellerCell o={o} />,
  },
  {
    key: 'sellerCountry',
    header: 'Country',
    render: (o) =>
      o.sellerCountry ? (
        <span className="font-mono text-xs text-fg-muted">{o.sellerCountry}</span>
      ) : (
        <Dash />
      ),
  },
  {
    key: 'sourceType',
    header: 'Source',
    render: (o) => <SourceCell o={o} />,
  },
  {
    key: 'observedDate',
    header: 'Observed',
    render: (o) => (
      <span className="whitespace-nowrap font-mono text-xs text-fg-dim">
        {o.observedDate}
      </span>
    ),
  },
];

// ── Cell components ───────────────────────────────────────────────────────────

function Dash() {
  return <span className="text-fg-dim">n/a</span>;
}

/** Diverging monochrome bar: center = median, right = below-median (favourable). */
function ValueCell({ score }: { score: number }) {
  const band = valueBand(score);
  const halfPct = Math.min(Math.abs(score), 1) * 50;
  const positive = score >= 0;
  return (
    <div
      className="flex flex-col gap-1"
      title={`valueScore ${score.toFixed(4)}: ${band.hint}`}
    >
      <span className="font-sans text-2xs font-semibold text-fg">
        {band.label}
      </span>
      <span
        className="relative block h-1.5 w-16 bg-border"
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border-strong" />
        <span
          className="absolute top-0 h-full bg-fg-muted"
          style={
            positive
              ? { left: '50%', width: `${halfPct}%` }
              : { right: '50%', width: `${halfPct}%` }
          }
        />
      </span>
      <span className="font-mono text-2xs tabular-nums text-fg-dim">
        {score >= 0 ? '+' : ''}
        {score.toFixed(2)}
      </span>
    </div>
  );
}

/** Element symbol (→ element page) + name + a single control-status annotation. */
function ElementCell({ o }: { o: OfferDTO }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <a
          href={`/elements/${o.elementSymbol}/`}
          className="font-mono font-semibold text-fg hover:text-accent-strong"
        >
          {o.elementSymbol}
        </a>
        <ControlBadge o={o} />
      </span>
      <span className="text-2xs text-fg-dim">{o.elementName}</span>
    </div>
  );
}

/** The single strongest control signal for the element, or nothing if unrestricted. */
function ControlBadge({ o }: { o: OfferDTO }) {
  if (o.regulatory === 'active') {
    return (
      <Badge variant="active" href="/regulatory/" title="Under an active China export-licence regime">
        Licence req.
      </Badge>
    );
  }
  if (o.exportControl === 'restricted') {
    return (
      <Badge variant="restricted" href="/regulatory/" title="China export-restricted">
        Restricted
      </Badge>
    );
  }
  if (o.regulatory === 'suspended') {
    return (
      <Badge variant="suspended" href="/regulatory/" title="Control suspended">
        Suspended
      </Badge>
    );
  }
  if (o.exportControl === 'monitored') {
    return (
      <Badge variant="monitored" href="/regulatory/" title="China export-monitored">
        Monitored
      </Badge>
    );
  }
  return null;
}

const CONF_FILLED: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

/** Compact monochrome confidence meter + the raw 0 to 1 score (matches ProvenanceBadge). */
function ConfBars({ score, band }: { score: number; band: Confidence }) {
  const filled = CONF_FILLED[band];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Confidence ${score.toFixed(2)}: ${capitalize(band)} (high ≥ 0.80, medium 0.50 to 0.79, low < 0.50). Assigned at ingestion.`}
    >
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'inline-block w-1',
              i === 0 ? 'h-2' : i === 1 ? 'h-2.5' : 'h-3',
              i < filled ? 'bg-fg-muted' : 'bg-border-strong',
            )}
          />
        ))}
      </span>
      <span className="font-mono text-2xs tabular-nums text-fg-dim">
        {score.toFixed(2)}
      </span>
    </span>
  );
}

/** Seller name, linked to the source URL when one is present (screened rows). */
function SellerCell({ o }: { o: OfferDTO }) {
  const name = (
    <span className="block max-w-[11rem] truncate" title={o.sellerName}>
      {o.sellerName}
    </span>
  );
  return o.sourceUrl ? (
    <a
      href={o.sourceUrl}
      target="_blank"
      rel="noopener nofollow"
      className="text-fg hover:text-accent-strong"
    >
      {name}
    </a>
  ) : (
    <span className="text-fg-muted">{name}</span>
  );
}

/** Source type label + an honest origin tag (seeded vs. screened). */
function SourceCell({ o }: { o: OfferDTO }) {
  const seeded = o.origin === 'seed';
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-fg-muted">{o.sourceTypeLabel}</span>
      <span
        className="rounded-sm border border-border bg-raised px-1 py-0.5 font-mono text-[0.625rem] uppercase leading-none tracking-caps text-fg-dim"
        title={
          seeded
            ? 'Seeded from the verified price dataset'
            : 'Discovered by live screening'
        }
      >
        {seeded ? 'seed' : 'screened'}
      </span>
    </span>
  );
}
