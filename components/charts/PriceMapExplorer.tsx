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
 * The form law governs every statistic here: each row draws one track per
 * element x tier x FORM group (metal and oxide are different commodities), so
 * strips, bands, medians, sorts, premiums, and the summary table never pool
 * across forms.
 *
 * The geometric layer is aria-hidden; the label text, the printed medians,
 * and the summary table below carry the same numbers accessibly, so mark
 * tooltips only ever enhance. Server HTML carries native title attributes as
 * the no-JS fallback; hydration strips them and one shared styled tooltip
 * (`MapTooltip`, ref-driven, event-delegated) takes over.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import Link from 'next/link';
import { CATEGORY_ORDER, CATEGORY_STYLE } from '@/components/elements/categories';
import { FilterChips, SectionHeading, SortableTable, cn } from '@/components/ui';
import { fmtPremium, fmtUsdPrice } from '@/lib/format';
import {
  CAPTION_COL_PX,
  CHART_MIN_PX,
  LABEL_COL_PX,
  MIN_QUARTILE_N,
  MIN_STRIP_N,
  VALUE_COL_PX,
  deriveTierStats,
  dupOffsets,
  filterByForm,
  groupTracks,
  type AxisTick,
  type MapMark,
  type MapRow,
  type PriceMapModel,
  type TierStats,
  type Track,
} from './price-map';

type TierChoice = 'both' | 'retail' | 'bulk';
type SortKey = 'category' | 'median' | 'spread';

const SORT_LABEL: Record<SortKey, string> = {
  category: 'Category order',
  median: 'Median price, high to low',
  spread: 'Widest spread first',
};

/**
 * Every line in the caption, plot, and value stacks. The three columns stay
 * aligned only because every line kind shares this height and the block gap
 * below; a column that skips or resizes a line desyncs the whole row.
 */
const LINE_H = 'h-4';
/**
 * Extra gap before the bulk block and before the premium block, applied
 * identically in all three stacks.
 */
const BLOCK_GAP = 'mt-1';

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

/** One track (a single element x tier x form group) with its statistics. */
interface TrackView {
  track: Track;
  stats: TierStats | null;
}

/** A same-form retail/bulk median pair: the only honest premium. */
interface PairView {
  form: string;
  ratio: number;
}

interface RowView {
  row: MapRow;
  retailTracks: TrackView[];
  bulkTracks: TrackView[];
  pairs: PairView[];
}

/** Ordering value for a track: the median, else the observed midpoint. */
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
  const chartRef = useRef<HTMLDivElement>(null);

  const { domain, ticks } = model;

  // One derivation feeds the chart, the printed labels, and the table twin.
  // The form law is enforced here: marks group into per-form tracks BEFORE any
  // statistic is computed, so deriveTierStats only ever sees one commodity.
  const view = useMemo<RowView[]>(
    () =>
      model.rows.map((row) => {
        const retailMarks =
          tier === 'bulk' ? [] : filterByForm(row.retail, form);
        const bulkMarks =
          tier === 'retail' ? [] : filterByForm(row.bulk, form);
        const tracks: TrackView[] = groupTracks(retailMarks, bulkMarks).map(
          (track) => ({ track, stats: deriveTierStats(track.marks, domain) }),
        );
        const retailTracks = tracks.filter((t) => t.track.band === 'retail');
        const bulkTracks = tracks.filter((t) => t.track.band === 'bulk');
        // Premium pairs: same form on both sides, both medians present (the
        // median itself already needs 3 observations). Cross-form ratios are
        // never computed.
        const pairs: PairView[] = retailTracks
          .flatMap((r) => {
            const rm = r.stats?.median;
            if (rm == null) return [];
            const b = bulkTracks.find((t) => t.track.form === r.track.form);
            const bm = b?.stats?.median;
            return bm != null && bm > 0
              ? [{ form: r.track.form, ratio: rm / bm }]
              : [];
          })
          .sort((a, b) => a.form.localeCompare(b.form));
        return { row, retailTracks, bulkTracks, pairs };
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

  // Metric sorts rank one form at a time: medians of different forms are
  // different commodities and are never ranked against each other. Deriving
  // (not syncing) means clearing the form chip falls back to category order
  // and re-selecting a form restores the chosen ranking.
  const effectiveSort: SortKey =
    form == null && sort !== 'category' ? 'category' : sort;

  const sorted = useMemo(() => {
    if (effectiveSort === 'category') return view;
    const metric = effectiveSort === 'median' ? sortValue : spreadValue;
    // The visible tier drives the ranking; with both shown, retail leads
    // (every element has retail observations). With a form selected each
    // block holds at most one track.
    const pick = (v: RowView) => {
      const tracks = tier === 'bulk' ? v.bulkTracks : v.retailTracks;
      const t = tracks.find((x) => x.track.form === form);
      return metric(t?.stats ?? null);
    };
    return [...view].sort((a, b) => {
      const av = pick(a);
      const bv = pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [view, effectiveSort, tier, form]);

  const sections: Array<{
    key: string;
    id?: string;
    title: string;
    swatch?: string;
    rows: RowView[];
  }> =
    effectiveSort === 'category'
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
            title: `All elements · ${SORT_LABEL[effectiveSort].toLowerCase()}`,
            rows: sorted,
          },
        ];

  const visibleCount = view.reduce(
    (acc, v) =>
      acc +
      [...v.retailTracks, ...v.bulkTracks].reduce(
        (a, t) => a + t.track.marks.length,
        0,
      ),
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
            value={effectiveSort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded border border-border-field bg-surface px-2 py-0.5 font-mono text-2xs font-semibold text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k} disabled={k !== 'category' && form == null}>
                {SORT_LABEL[k]}
                {k !== 'category' && form == null ? ' (select a form)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-2xs leading-snug text-fg-dim">
        Median and spread sorts rank one form at a time: medians of different
        forms are different commodities and are not ranked against each other.
      </p>

      {/* ── The map ──────────────────────────────────────────────────────── */}
      <div ref={chartRef} className="mt-2 overflow-x-auto">
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

      <MapTooltip rootRef={chartRef} />

      {/* ── Legend: the mandatory two-series decode, after the grid like the
             home ledger's legend row ─────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-fg/80" /> one
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
          <span aria-hidden className="h-px w-6 bg-fg-dim/50" /> observed min to
          max, one form and market (from {MIN_STRIP_N})
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-6 rounded-[2px] bg-accent/30" />{' '}
          middle half, P25 to P75, one form and market (from {MIN_QUARTILE_N})
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 bg-accent-strong" /> median,
          one form and market (from {MIN_QUARTILE_N})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="font-mono font-semibold text-risk-medium"
          >
            n×
          </span>{' '}
          retail premium within one form, retail median over bulk median, when
          both medians exist
        </span>
        <span className="text-fg-dim">
          Log scale: each gridline is 10 times the last. Each row draws one
          track per form and market; the caption names the form and its count.
          The figure at the end of a track is its median, or the value itself
          for a single observation.
        </span>
      </div>

      {/* ── The table twin: same stats, same scope, fully accessible ─────── */}
      <section className="mt-10">
        <SectionHeading
          title="Summary table"
          count={`${visibleCount} of ${model.totals.records} observations`}
          description={
            <>
              The same statistics as the map, one row per element, tier, and
              form. Scope: {form ?? 'all forms'} ·{' '}
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
      style={{ left: LABEL_COL_PX + CAPTION_COL_PX, right: VALUE_COL_PX }}
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
      <div className="shrink-0" style={{ width: CAPTION_COL_PX }} />
      <div className="relative min-w-0 flex-1 border-b border-border">
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
        {ticks.map((t) => (
          <span
            key={`stem-${t.value}`}
            className="absolute bottom-0 h-[3px] w-px bg-border-strong"
            style={{ left: `${t.pct}%` }}
          />
        ))}
      </div>
      <div className="shrink-0" style={{ width: VALUE_COL_PX }} />
    </div>
  );
}

/**
 * One element row: sticky label (chip + name), per-track captions, per-track
 * plot lines, per-track values plus same-form premium lines. The four cells
 * are parallel stacks mapping the SAME arrays in the SAME order with LINE_H
 * and BLOCK_GAP, which is the entire alignment guarantee.
 */
function MapRowItem({
  view,
  tier,
  form,
}: {
  view: RowView;
  tier: TierChoice;
  form: string | null;
}) {
  const { row, retailTracks, bulkTracks, pairs } = view;
  const cat = CATEGORY_STYLE[row.category];
  const dot = CONTROL_DOT[row.exportControlStatus];
  const empty = retailTracks.length === 0 && bulkTracks.length === 0;
  const hasRetailBlock = retailTracks.length > 0;

  // Printed only when the CURRENT FILTERS leave the row track-less; under the
  // default Both view a missing bulk block is visible as a missing caption.
  const emptyText =
    form != null
      ? tier === 'both'
        ? `no ${form} observations`
        : `no ${tier} ${form} observations`
      : `no ${tier === 'both' ? '' : `${tier} `}observations`;

  return (
    <li
      id={row.symbol}
      className={cn(
        'group/row flex items-stretch border-b border-border/60 scroll-mt-24 target:bg-accent-dim/40 hover:bg-accent/[0.04]',
        empty && 'opacity-50',
      )}
    >
      {/* Label cell (sticky so rows stay identifiable while the plot scrolls).
          The opaque bg-base must stay to mask the scrolling plot; on row hover
          a uniform translucent gradient paints OVER it, compositing to the
          same wash as the li's hover so no seam shows at the column edge. */}
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-2 bg-base from-accent/[0.04] to-accent/[0.04] py-1.5 pl-2 pr-2 group-hover/row:bg-gradient-to-r"
        style={{ width: LABEL_COL_PX }}
      >
        <Link
          href={`/elements/${row.symbol}/`}
          className={cn(
            'inline-flex h-7 w-9 shrink-0 items-center justify-center border border-t-2 border-border bg-surface font-sans text-xs font-bold text-fg transition-colors duration-fast',
            cat.borderTop,
            'hover:bg-fg hover:text-base group-hover/row:bg-fg group-hover/row:text-base',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          {row.symbol}
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 leading-none">
          <span className="min-w-0 truncate text-xs text-fg-muted">
            {row.name}
          </span>
          {dot && (
            <span title={dot.title} className={cn('shrink-0', dot.classes)}>
              <span className="sr-only">{dot.title}</span>
            </span>
          )}
          {row.highDemand && (
            <span
              title="High demand"
              className="shrink-0 text-2xs leading-none"
            >
              🔥<span className="sr-only">High demand</span>
            </span>
          )}
        </div>
      </div>

      {/* Caption stack: one line per track (tier glyph + form + n). The text
          is the accessible per-track summary, so this cell is NOT aria-hidden
          (only the glyphs are). */}
      <div
        className="flex shrink-0 flex-col justify-center py-1.5"
        style={{ width: CAPTION_COL_PX }}
      >
        {retailTracks.map((t) => (
          <CaptionLine key={`r-${t.track.form}`} view={t} />
        ))}
        {bulkTracks.map((t, i) => (
          <CaptionLine
            key={`b-${t.track.form}`}
            view={t}
            className={i === 0 && hasRetailBlock ? BLOCK_GAP : undefined}
          />
        ))}
        {pairs.map((p, i) => (
          <div
            key={`p-${p.form}`}
            aria-hidden="true"
            className={cn(LINE_H, i === 0 && BLOCK_GAP)}
          />
        ))}
        {empty && <div aria-hidden="true" className={LINE_H} />}
      </div>

      {/* Plot stack: one track per element x tier x form group. */}
      <div
        aria-hidden="true"
        className="flex min-w-0 flex-1 flex-col justify-center py-1.5"
      >
        {retailTracks.map((t) => (
          <TierTrack
            key={`r-${t.track.form}`}
            marks={t.track.marks}
            stats={t.stats}
            band="retail"
          />
        ))}
        {bulkTracks.map((t, i) => (
          <TierTrack
            key={`b-${t.track.form}`}
            marks={t.track.marks}
            stats={t.stats}
            band="bulk"
            className={i === 0 && hasRetailBlock ? BLOCK_GAP : undefined}
          />
        ))}
        {pairs.map((p, i) => (
          <div key={`p-${p.form}`} className={cn(LINE_H, i === 0 && BLOCK_GAP)} />
        ))}
        {empty && (
          <div className={cn(LINE_H, 'flex items-center')}>
            <span className="bg-base/80 px-1 text-2xs text-fg-dim">
              {emptyText}
            </span>
          </div>
        )}
      </div>

      {/* Value stack: the selective label per track, then the same-form
          premium line(s). */}
      <div
        className="flex shrink-0 flex-col justify-center py-1.5 text-right"
        style={{ width: VALUE_COL_PX }}
      >
        {retailTracks.map((t) => (
          <TrackValue key={`r-${t.track.form}`} stats={t.stats} />
        ))}
        {bulkTracks.map((t, i) => (
          <TrackValue
            key={`b-${t.track.form}`}
            stats={t.stats}
            className={i === 0 && hasRetailBlock ? BLOCK_GAP : undefined}
          />
        ))}
        {pairs.map((p, i) => (
          <div
            key={`p-${p.form}`}
            title={
              pairs.length > 1
                ? `${p.form} retail premium: retail median over bulk median, ${fmtPremium(p.ratio)}×`
                : undefined
            }
            className={cn(
              LINE_H,
              i === 0 && BLOCK_GAP,
              'flex items-center justify-end overflow-hidden whitespace-nowrap font-mono text-2xs tabular-nums text-risk-medium',
            )}
          >
            {pairs.length > 1
              ? `${p.form} ${fmtPremium(p.ratio)}×`
              : `premium ${fmtPremium(p.ratio)}×`}
          </div>
        ))}
        {empty && <div className={LINE_H} />}
      </div>
    </li>
  );
}

/** One caption line: the tier glyph (the mark encoding at 8px), form, n. */
function CaptionLine({
  view,
  className,
}: {
  view: TrackView;
  className?: string;
}) {
  const { track, stats } = view;
  return (
    <div
      className={cn(
        LINE_H,
        'flex items-center justify-end gap-1.5 pl-2 pr-3 font-mono text-2xs leading-none text-fg-dim',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          track.band === 'retail' ? 'bg-fg/80' : 'border-2 border-fg bg-surface',
        )}
      />
      <span className="truncate">
        {track.form} {track.marks.length}
        <span className="sr-only">
          {stats && stats.n >= 2
            ? `: ${track.band}, ${fmtUsdPrice(stats.min)} to ${fmtUsdPrice(stats.max)} per kg`
            : `: ${track.band}, ${fmtUsdPrice(stats?.min ?? track.marks[0]?.price ?? null)} per kg`}
        </span>
      </span>
    </div>
  );
}

/**
 * One track's strip, band, tick, and marks: a single element x tier x form
 * group, so every statistic drawn here describes one commodity. Geometry only
 * (the parent stack is aria-hidden).
 */
function TierTrack({
  marks,
  stats,
  band,
  className,
}: {
  marks: MapMark[];
  stats: TierStats | null;
  band: 'retail' | 'bulk';
  className?: string;
}) {
  const offsets = dupOffsets(marks);
  return (
    <div className={cn('relative', LINE_H, className)}>
      {stats?.stripPct && (
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-fg-dim/50"
          style={{
            left: `${stats.stripPct.left}%`,
            width: `${stats.stripPct.width}%`,
          }}
        />
      )}
      {stats?.bandPct && (
        <div
          className="absolute inset-y-1 rounded-[2px] bg-accent/30"
          style={{
            left: `${stats.bandPct.left}%`,
            width: `${stats.bandPct.width}%`,
          }}
        />
      )}
      {stats?.medianPct != null && (
        <div
          className="absolute inset-y-[-2px] w-0.5 -translate-x-1/2 bg-accent-strong"
          style={{ left: `${stats.medianPct}%` }}
        />
      )}
      {marks.map((m) => (
        <span
          key={m.id}
          // The native title is the no-JS fallback; hydration strips it and
          // MapTooltip reads the data-* payload instead.
          title={`${fmtUsdPrice(m.price)}/kg · ${m.form}${
            m.purity ? ` · ${m.purity}` : ''
          } · ${band} · ${m.date} · ${m.seller}`}
          data-price={fmtUsdPrice(m.price)}
          data-form={m.form}
          data-purity={m.purity}
          data-tier={band}
          data-date={m.date}
          data-seller={m.seller}
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
              // Retail fill at 80% ink so stacked marks visibly darken where
              // observations pile up (an honest density read).
              band === 'retail' ? 'bg-fg/80' : 'border-2 border-fg bg-surface',
            )}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * The end-of-track figure: median from 3 observations, the value for 1. The
 * blank n=2 line still renders (skipping it would desync the three stacks).
 */
function TrackValue({
  stats,
  className,
}: {
  stats: TierStats | null;
  className?: string;
}) {
  let text = '';
  if (stats) {
    if (stats.median != null) text = fmtUsdPrice(stats.median);
    else if (stats.n === 1) text = fmtUsdPrice(stats.min);
  }
  return (
    <div
      className={cn(
        LINE_H,
        'flex items-center justify-end font-mono text-2xs tabular-nums text-fg',
        className,
      )}
    >
      {text}
    </div>
  );
}

interface SummaryRow {
  key: string;
  symbol: string;
  name: string;
  band: string;
  form: string;
  n: number;
  min: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number;
  latest: string;
}

/**
 * The table-view twin over the exact same derived statistics: one row per
 * element x tier x form group, never pooled across forms.
 */
function SummaryTable({ view }: { view: RowView[] }) {
  const rows: SummaryRow[] = [];
  for (const v of view) {
    for (const t of [...v.retailTracks, ...v.bulkTracks]) {
      const stats = t.stats;
      if (!stats) continue;
      rows.push({
        key: `${v.row.symbol}-${t.track.band}-${t.track.form}`,
        symbol: v.row.symbol,
        name: v.row.name,
        band: t.track.band,
        form: t.track.form,
        n: stats.n,
        min: stats.min,
        p25: stats.p25,
        median: stats.median,
        p75: stats.p75,
        max: stats.max,
        latest: stats.latestDate,
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
        { key: 'form', header: 'Form', render: (r) => r.form },
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
      ]}
      caption="Observed price statistics per element, tier, and form, USD per kg"
      footnote={`${rows.length} element-tier-form groups · P25/median/P75 need ${MIN_QUARTILE_N}+ observations · click a column to sort`}
      emptyMessage="No observations match the current filters."
    />
  );
}

/**
 * The shared mark tooltip: one fixed-position inverted bubble (the ui Tooltip
 * visual vocabulary) driven imperatively through refs so a pointer sweep
 * across 238 marks costs zero React re-renders. Events are delegated from the
 * chart root over the marks' 24px hit spans via their data-* payload; writes
 * go through textContent only. Marks stay non-focusable: the summary table is
 * the keyboard path, so this layer only ever enhances.
 */
function MapTooltip({ rootRef }: { rootRef: RefObject<HTMLDivElement> }) {
  const tipRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const sellerRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<() => void>(() => {});

  // After EVERY commit (no dependency array): strip native titles from the
  // mark hit spans so native and custom tooltips never double-show, and close
  // any tooltip left pointing at a re-filtered mark. Marks remounted by a
  // filter or sort change re-arrive with title=, hence the re-run. The
  // selector leaves the label-cell titles (control dot, high demand) alone.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root
      .querySelectorAll('[data-price][title]')
      .forEach((el) => el.removeAttribute('title'));
    hideRef.current();
  });

  useEffect(() => {
    const root = rootRef.current;
    const tip = tipRef.current;
    if (!root || !tip) return;

    const hide = () => {
      tip.style.opacity = '0';
    };
    hideRef.current = hide;

    const show = (el: HTMLElement) => {
      const d = el.dataset;
      if (valueRef.current) valueRef.current.textContent = `${d.price ?? ''}/kg`;
      if (metaRef.current)
        metaRef.current.textContent = [d.form, d.purity, d.tier, d.date]
          .filter(Boolean)
          .join(' · ');
      if (sellerRef.current) sellerRef.current.textContent = d.seller ?? '';
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      let x = r.left + r.width / 2 - w / 2;
      x = Math.max(8, Math.min(x, window.innerWidth - 8 - w));
      // Prefer above; flip below near the top so the sticky header (z-50,
      // 56px tall) never covers the bubble (the tooltip itself is z-40).
      let y = r.top - h - 8;
      if (y < 72) y = r.bottom + 8;
      y = Math.max(8, Math.min(y, window.innerHeight - 8 - h));
      tip.style.transform = `translate(${x}px, ${y}px)`;
      tip.style.opacity = '1';
    };

    const markOf = (t: EventTarget | null): HTMLElement | null => {
      const el =
        t instanceof Element ? t.closest<HTMLElement>('[data-price]') : null;
      return el && root.contains(el) ? el : null;
    };

    const onOver = (e: PointerEvent) => {
      const m = markOf(e.target);
      if (m) show(m);
    };
    const onOut = (e: PointerEvent) => {
      // Touch keeps the tip up until a tap elsewhere (onDocDown) or a scroll.
      if (e.pointerType === 'touch') return;
      const m = markOf(e.target);
      if (!m) return;
      if (e.relatedTarget instanceof Node && m.contains(e.relatedTarget)) return;
      hide();
    };
    const onDocDown = (e: PointerEvent) => {
      if (!markOf(e.target)) hide();
    };
    // Fixed coordinates go stale on any scroll, including the chart's own
    // horizontal pan, hence the capture-phase document listener.
    const onAnyScroll = () => hide();

    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('scroll', onAnyScroll, true);
    return () => {
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('scroll', onAnyScroll, true);
    };
  }, [rootRef]);

  return (
    <div
      ref={tipRef}
      role="tooltip"
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-40 w-max max-w-xs rounded-md bg-fg px-2.5 py-1.5 text-2xs leading-snug text-white opacity-0 shadow-md transition-opacity duration-fast"
    >
      <div ref={valueRef} className="font-mono text-sm font-semibold tabular-nums" />
      <div ref={metaRef} />
      <div ref={sellerRef} className="text-white/70" />
    </div>
  );
}
