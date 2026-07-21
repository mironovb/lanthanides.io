'use client';

/**
 * Price Map: the interactive strip plot of every sourced observation.
 *
 * Client island in the ProvenanceTable/RegulatoryView tradition: the server
 * renders the complete default view (grouped by category, both tiers, all
 * forms) as real HTML, so the whole chart exists without JavaScript; hydration
 * only adds the filter, tier, and sort controls. Filtering re-derives every
 * strip, band, median, and count through the same pure helpers that built the
 * initial view, and never repaints a colour: retail and bulk are told apart by
 * shape (solid dot vs hollow ring), category only ever appears as a swatch
 * beside text.
 *
 * The geometric layer is aria-hidden; the label text, the printed medians,
 * and the summary table below carry the same numbers accessibly, so the
 * native-title tooltips on marks only ever enhance.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '@/components/elements/categories';
import { FilterChips, SectionHeading, SortableTable, cn } from '@/components/ui';
import { fmtUsdPrice } from '@/lib/format';
import {
  CHART_MIN_PX,
  LABEL_COL_PX,
  MIN_QUARTILE_N,
  MIN_STRIP_N,
  VALUE_COL_PX,
  deriveTierStats,
  dupOffsets,
  filterByForm,
  type AxisTick,
  type MapMark,
  type MapRow,
  type PriceMapModel,
  type TierStats,
} from './price-map';

type TierChoice = 'both' | 'retail' | 'bulk';
type SortKey = 'category' | 'median' | 'spread';

const SORT_LABEL: Record<SortKey, string> = {
  category: 'Category order',
  median: 'Median price, high to low',
  spread: 'Widest spread first',
};

/** Export-control marks, the ElementCard vocabulary (shape, not hue alone). */
const CONTROL_DOT: Partial<
  Record<MapRow['exportControlStatus'], { classes: string; title: string }>
> = {
  restricted: {
    classes: 'h-2 w-2 rounded-full bg-risk-high',
    title: 'Export licence required',
  },
  monitored: {
    classes: 'h-2 w-2 rounded-full border-2 border-risk-medium',
    title: 'Under surveillance',
  },
};

interface RowView {
  row: MapRow;
  retailMarks: MapMark[];
  bulkMarks: MapMark[];
  retail: TierStats | null;
  bulk: TierStats | null;
}

/** Ordering value for a tier: the median, else the observed midpoint. */
function sortValue(stats: TierStats | null): number | null {
  if (!stats) return null;
  return stats.median ?? (stats.min + stats.max) / 2;
}

/** Ordering value for spread: max over min ratio, needs a real span. */
function spreadValue(stats: TierStats | null): number | null {
  if (!stats || stats.n < MIN_STRIP_N || !(stats.min > 0)) return null;
  return stats.max / stats.min;
}

export function PriceMapExplorer({ model }: { model: PriceMapModel }) {
  const [form, setForm] = useState<string | null>(null);
  const [tier, setTier] = useState<TierChoice>('both');
  const [sort, setSort] = useState<SortKey>('category');

  const { domain, ticks } = model;

  // One derivation feeds the chart, the printed labels, and the table twin.
  const view = useMemo<RowView[]>(
    () =>
      model.rows.map((row) => {
        const retailMarks =
          tier === 'bulk' ? [] : filterByForm(row.retail, form);
        const bulkMarks =
          tier === 'retail' ? [] : filterByForm(row.bulk, form);
        return {
          row,
          retailMarks,
          bulkMarks,
          retail: tier === 'bulk' ? null : deriveTierStats(retailMarks, domain),
          bulk: tier === 'retail' ? null : deriveTierStats(bulkMarks, domain),
        };
      }),
    [model.rows, domain, form, tier],
  );

  // Form chips count the marks in the current tier scope, so the numbers
  // always describe what a click would show.
  const formOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const row of model.rows) {
      const scoped = [
        ...(tier === 'bulk' ? [] : row.retail),
        ...(tier === 'retail' ? [] : row.bulk),
      ];
      for (const m of scoped) {
        counts.set(m.form, (counts.get(m.form) ?? 0) + 1);
        total += 1;
      }
    }
    const options = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, n]) => ({
        value,
        label: (
          <>
            {value} <span className="font-normal opacity-70">{n}</span>
          </>
        ),
      }));
    return { options, total };
  }, [model.rows, tier]);

  const sorted = useMemo(() => {
    if (sort === 'category') return view;
    const metric = sort === 'median' ? sortValue : spreadValue;
    // The visible tier drives the ranking; with both shown, retail leads
    // (every element has retail observations, so no row is unrankable).
    const pick = (v: RowView) =>
      tier === 'bulk' ? metric(v.bulk) : metric(v.retail);
    return [...view].sort((a, b) => {
      const av = pick(a);
      const bv = pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [view, sort, tier]);

  const sections: Array<{
    key: string;
    id?: string;
    title: string;
    swatch?: string;
    rows: RowView[];
  }> =
    sort === 'category'
      ? CATEGORY_ORDER.map((cat) => ({
          key: cat,
          id: cat,
          title: CATEGORY_STYLE[cat].label,
          swatch: CATEGORY_STYLE[cat].swatch,
          rows: sorted.filter((v) => v.row.category === cat),
        })).filter((s) => s.rows.length > 0)
      : [
          {
            key: 'ranked',
            title: `All elements · ${SORT_LABEL[sort].toLowerCase()}`,
            rows: sorted,
          },
        ];

  const visibleCount = view.reduce(
    (acc, v) => acc + v.retailMarks.length + v.bulkMarks.length,
    0,
  );

  return (
    <div>
      {/* ── Controls: one row, scoping everything below ──────────────────── */}
      <div className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-start">
        <FilterChips
          label="Form"
          options={formOptions.options}
          value={form}
          onChange={setForm}
          allLabel={
            <>
              All <span className="font-normal opacity-70">{formOptions.total}</span>
            </>
          }
        />
        <FilterChips
          label="Tier"
          showAll={false}
          options={[
            { value: 'both', label: 'Both' },
            { value: 'retail', label: 'Retail' },
            { value: 'bulk', label: 'Bulk' },
          ]}
          value={tier}
          onChange={(v) => setTier((v as TierChoice) ?? 'both')}
        />
        <label className="flex items-baseline gap-2 rounded-md border border-border bg-surface px-4 py-3 shadow-sm">
          <span className="shrink-0 text-2xs font-semibold uppercase tracking-caps text-fg-dim">
            Sort
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-border-field bg-surface px-2 py-0.5 font-mono text-2xs font-semibold text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── The map ──────────────────────────────────────────────────────── */}
      <div className="mt-2 overflow-x-auto">
        <div style={{ minWidth: CHART_MIN_PX }}>
          {sections.map((section) => (
            <section
              key={section.key}
              id={section.id}
              className="mt-8 scroll-mt-24 first:mt-6"
            >
              <SectionHeading
                title={section.title}
                swatch={section.swatch}
                count={`${section.rows.length} elements`}
              />
              <div className="relative">
                <Gridlines ticks={ticks} />
                <AxisRuler ticks={ticks} />
                <ol className="relative z-10">
                  {section.rows.map((v) => (
                    <MapRowItem key={v.row.symbol} view={v} tier={tier} form={form} />
                  ))}
                </ol>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Legend: the mandatory two-series decode, after the grid like the
             home ledger's legend row ─────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-fg" /> one
          retail observation
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full border-2 border-fg bg-surface"
          />{' '}
          one bulk observation
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-px w-6 bg-border-strong" /> observed min
          to max (from {MIN_STRIP_N})
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-6 bg-accent/25" /> middle half, P25
          to P75 (from {MIN_QUARTILE_N})
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 bg-accent-strong" /> median
          (from {MIN_QUARTILE_N})
        </span>
        <span className="text-fg-dim">
          Log scale: each gridline is 10 times the last. The figure at the end
          of a track is its median, or the value itself for a single
          observation.
        </span>
      </div>

      {/* ── The table twin: same stats, same scope, fully accessible ─────── */}
      <section className="mt-10">
        <SectionHeading
          title="Summary table"
          count={`${visibleCount} of ${model.totals.records} observations`}
          description={
            <>
              The same statistics as the map, one row per element and tier.
              Scope: {form ?? 'all forms'} ·{' '}
              {tier === 'both' ? 'both tiers' : `${tier} only`}. Per-record
              detail lives in each element&apos;s provenance table.
            </>
          }
        />
        <SummaryTable view={view} />
      </section>
    </div>
  );
}

/** Decade hairlines behind the rows, aligned to the plot column. */
function Gridlines({ ticks }: { ticks: AxisTick[] }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 z-0"
      style={{ left: LABEL_COL_PX, right: VALUE_COL_PX }}
    >
      {ticks.map((t) => (
        <div
          key={t.value}
          className="absolute inset-y-0 w-px bg-border"
          style={{ left: `${t.pct}%` }}
        />
      ))}
    </div>
  );
}

/** Tick labels at the top of each section (the axis band travels with rows). */
function AxisRuler({ ticks }: { ticks: AxisTick[] }) {
  return (
    <div aria-hidden="true" className="relative z-10 flex h-6 items-end">
      <div
        className="sticky left-0 z-20 flex shrink-0 items-end bg-base pb-0.5"
        style={{ width: LABEL_COL_PX }}
      >
        <span className="font-mono text-2xs text-fg-dim">USD/kg · log</span>
      </div>
      <div className="relative min-w-0 flex-1">
        {ticks.map((t) => (
          <span
            key={t.value}
            className={cn(
              'absolute bottom-0.5 font-mono text-2xs tabular-nums text-fg-dim',
              t.pct < 2
                ? 'translate-x-0'
                : t.pct > 98
                  ? '-translate-x-full'
                  : '-translate-x-1/2',
            )}
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div className="shrink-0" style={{ width: VALUE_COL_PX }} />
    </div>
  );
}

/** One element row: label cell, one or two tier tracks, value column. */
function MapRowItem({
  view,
  tier,
  form,
}: {
  view: RowView;
  tier: TierChoice;
  form: string | null;
}) {
  const { row, retail, bulk, retailMarks, bulkMarks } = view;
  const cat = CATEGORY_STYLE[row.category];
  const dot = CONTROL_DOT[row.exportControlStatus];
  const empty = retailMarks.length === 0 && bulkMarks.length === 0;

  const showRetail = tier !== 'bulk';
  const showBulk = tier !== 'retail';

  const missingText = (band: 'retail' | 'bulk') =>
    form == null
      ? `no ${band} observations`
      : `no ${band} ${form} observations`;

  return (
    <li
      id={row.symbol}
      className={cn(
        'flex items-stretch border-b border-border/60 target:bg-accent-dim/40',
        empty && 'opacity-50',
      )}
    >
      {/* Label cell (sticky so rows stay identifiable while the plot scrolls) */}
      <div
        className="sticky left-0 z-20 shrink-0 bg-base py-1.5 pl-2.5 pr-2"
        style={{ width: LABEL_COL_PX }}
      >
        <span
          aria-hidden="true"
          className={cn('absolute bottom-1.5 left-0 top-1.5 w-[3px]', cat.swatch)}
        />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-mono text-2xs tabular-nums text-fg-dim">
            {row.atomicNumber}
          </span>
          <Link
            href={`/elements/${row.symbol}/`}
            className="font-serif text-sm font-bold text-fg hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {row.symbol}
          </Link>
          <span className="min-w-0 truncate text-2xs text-fg-muted">
            {row.name}
          </span>
          {dot && (
            <span title={dot.title} className={cn('shrink-0', dot.classes)}>
              <span className="sr-only">{dot.title}</span>
            </span>
          )}
          {row.highDemand && (
            <span title="High demand" className="shrink-0 text-2xs leading-none">
              🔥<span className="sr-only">High demand</span>
            </span>
          )}
        </div>
        <div className="mt-1 font-mono text-2xs leading-none text-fg-dim">
          {showRetail && (
            <>
              {retailMarks.length > 0
                ? `${retailMarks.length} retail`
                : 'no retail'}
            </>
          )}
          {showRetail && showBulk && ' · '}
          {showBulk && (
            <>{bulkMarks.length > 0 ? `${bulkMarks.length} bulk` : 'no bulk'}</>
          )}
        </div>
        <span className="sr-only">
          {retail
            ? `Observed retail ${fmtUsdPrice(retail.min)} to ${fmtUsdPrice(retail.max)} per kg.`
            : ''}
          {bulk
            ? ` Observed bulk ${fmtUsdPrice(bulk.min)} to ${fmtUsdPrice(bulk.max)} per kg.`
            : ''}
        </span>
      </div>

      {/* Plot cell */}
      <div
        aria-hidden="true"
        className="flex min-w-0 flex-1 flex-col justify-center py-1.5"
      >
        {showRetail &&
          (retailMarks.length > 0 ? (
            <TierTrack marks={retailMarks} stats={retail} band="retail" />
          ) : (
            <div className="flex h-4 items-center">
              <span className="bg-base/80 px-1 text-2xs text-fg-dim">
                {missingText('retail')}
              </span>
            </div>
          ))}
        {showBulk &&
          (bulkMarks.length > 0 ? (
            <TierTrack marks={bulkMarks} stats={bulk} band="bulk" />
          ) : (
            <div className="flex h-4 items-center">
              <span className="bg-base/80 px-1 text-2xs text-fg-dim">
                {missingText('bulk')}
              </span>
            </div>
          ))}
      </div>

      {/* Value column: the selective label (median, or the lone value) */}
      <div
        className="flex shrink-0 flex-col justify-center py-1.5 text-right"
        style={{ width: VALUE_COL_PX }}
      >
        {showRetail && <TrackValue stats={retail} />}
        {showBulk && <TrackValue stats={bulk} />}
      </div>
    </li>
  );
}

/** One tier's strip, band, tick, and marks. Geometry only (aria-hidden). */
function TierTrack({
  marks,
  stats,
  band,
}: {
  marks: MapMark[];
  stats: TierStats | null;
  band: 'retail' | 'bulk';
}) {
  const offsets = dupOffsets(marks);
  return (
    <div className="relative h-4">
      {stats?.stripPct && (
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-border-strong"
          style={{
            left: `${stats.stripPct.left}%`,
            width: `${stats.stripPct.width}%`,
          }}
        />
      )}
      {stats?.bandPct && (
        <div
          className="absolute inset-y-1 bg-accent/25"
          style={{
            left: `${stats.bandPct.left}%`,
            width: `${stats.bandPct.width}%`,
          }}
        />
      )}
      {stats?.medianPct != null && (
        <div
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent-strong"
          style={{ left: `${stats.medianPct}%` }}
        />
      )}
      {marks.map((m) => (
        <span
          key={m.id}
          title={`${fmtUsdPrice(m.price)}/kg · ${m.form}${
            m.purity ? ` · ${m.purity}` : ''
          } · ${band} · ${m.date} · ${m.seller}`}
          className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{
            left: `${m.pct}%`,
            // Exact-duplicate prices stack vertically (y carries no meaning
            // inside a track; horizontal jitter would misstate the value).
            marginTop: (offsets.get(m.id) ?? 0) * 3,
          }}
        >
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full ring-2 ring-surface',
              band === 'retail' ? 'bg-fg' : 'border-2 border-fg bg-surface',
            )}
          />
        </span>
      ))}
    </div>
  );
}

/** The end-of-track figure: median from 3 observations, the value for 1. */
function TrackValue({ stats }: { stats: TierStats | null }) {
  let text = '';
  if (stats) {
    if (stats.median != null) text = fmtUsdPrice(stats.median);
    else if (stats.n === 1) text = fmtUsdPrice(stats.min);
  }
  return (
    <div className="flex h-4 items-center justify-end font-mono text-2xs tabular-nums text-fg">
      {text}
    </div>
  );
}

interface SummaryRow {
  key: string;
  symbol: string;
  name: string;
  band: string;
  n: number;
  min: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number;
  latest: string;
  forms: string;
}

/** The table-view twin over the exact same derived statistics. */
function SummaryTable({ view }: { view: RowView[] }) {
  const rows: SummaryRow[] = [];
  for (const v of view) {
    for (const [band, stats] of [
      ['retail', v.retail],
      ['bulk', v.bulk],
    ] as const) {
      if (!stats) continue;
      rows.push({
        key: `${v.row.symbol}-${band}`,
        symbol: v.row.symbol,
        name: v.row.name,
        band,
        n: stats.n,
        min: stats.min,
        p25: stats.p25,
        median: stats.median,
        p75: stats.p75,
        max: stats.max,
        latest: stats.latestDate,
        forms: stats.forms.join(', '),
      });
    }
  }

  const price = (x: number | null) => (
    <span className={x == null ? 'text-fg-dim' : undefined}>
      {x == null ? 'n/a' : fmtUsdPrice(x)}
    </span>
  );

  return (
    <SortableTable<SummaryRow>
      rows={rows}
      getRowKey={(r) => r.key}
      initialSort={{ key: 'median', dir: 'desc' }}
      columns={[
        {
          key: 'symbol',
          header: 'Element',
          render: (r) => (
            <Link
              href={`/elements/${r.symbol}/`}
              className="text-accent hover:text-accent-strong"
            >
              {r.symbol} <span className="text-fg-muted">{r.name}</span>
            </Link>
          ),
        },
        { key: 'band', header: 'Tier', render: (r) => r.band },
        { key: 'n', header: 'n', numeric: true, render: (r) => r.n },
        { key: 'min', header: 'Min', numeric: true, render: (r) => price(r.min) },
        { key: 'p25', header: 'P25', numeric: true, render: (r) => price(r.p25) },
        {
          key: 'median',
          header: 'Median',
          numeric: true,
          render: (r) => price(r.median),
        },
        { key: 'p75', header: 'P75', numeric: true, render: (r) => price(r.p75) },
        { key: 'max', header: 'Max', numeric: true, render: (r) => price(r.max) },
        { key: 'latest', header: 'Latest quote', render: (r) => r.latest },
        { key: 'forms', header: 'Forms', render: (r) => r.forms },
      ]}
      caption="Observed price statistics per element and tier, USD per kg"
      footnote={`${rows.length} element-tier groups · P25/median/P75 need ${MIN_QUARTILE_N}+ observations · click a column to sort`}
      emptyMessage="No observations match the current filters."
    />
  );
}
