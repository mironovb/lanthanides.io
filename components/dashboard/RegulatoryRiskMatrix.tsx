/**
 * RegulatoryRiskMatrix: a cross-tab of element category (rows) against current
 * Chinese export-control posture (columns), with the element count in every
 * cell. Server component, presentational. Colour is semantic only: each
 * posture column reuses the regulatory risk scale via the shared <Badge>
 * variants and `risk-*` tokens. Every figure is a real tally of the catalog
 * rows passed in (CLAUDE.md hard rule #1).
 */
import Link from 'next/link';
import {
  Badge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  cn,
  type BadgeVariant,
} from '@/components/ui';
import { CATEGORY_STYLE } from '@/components/elements/categories';
import { POSTURE_ORDER, type ControlPosture, type RiskMatrix } from './lens';

interface PostureStyle {
  label: string;
  /** Regulatory risk-scale badge variant (high / medium / suspended / low). */
  badge: BadgeVariant;
  /** Faint same-hue column tint on a populated cell. */
  tint: string;
  /** Count text colour on a populated cell (the column's risk hue). */
  num: string;
}

const POSTURE_STYLE: Record<ControlPosture, PostureStyle> = {
  restricted: {
    label: 'Restricted',
    badge: 'restricted',
    tint: 'bg-risk-high/10',
    num: 'text-risk-high',
  },
  monitored: {
    label: 'Monitored',
    badge: 'monitored',
    tint: 'bg-risk-medium/10',
    num: 'text-risk-medium',
  },
  suspended: {
    label: 'Suspended',
    badge: 'suspended',
    tint: 'bg-risk-suspended/10',
    num: 'text-risk-suspended',
  },
  normal: {
    label: 'Unrestricted',
    badge: 'normal',
    tint: 'bg-risk-low/10',
    num: 'text-risk-low',
  },
};

/** One posture cell: the count (its sample size), tinted by the column's hue. */
function CountCell({
  posture,
  count,
  symbols,
}: {
  posture: ControlPosture;
  count: number;
  symbols: string[];
}) {
  if (count === 0) {
    // Show the zero explicitly, but dim and untinted so populated cells stand out.
    return (
      <TD numeric align="center">
        <span className="text-fg-dim">0</span>
      </TD>
    );
  }
  const style = POSTURE_STYLE[posture];
  return (
    <TD numeric align="center" className={style.tint}>
      <span
        title={`${count} ${style.label.toLowerCase()}: ${symbols.join(', ')}`}
        className={cn('text-lg font-semibold', style.num)}
      >
        {count}
      </span>
    </TD>
  );
}

/** "n / N", controlled count over the row (or table) total. */
function UnderControl({ controlled, total }: { controlled: number; total: number }) {
  return (
    <>
      <span className="text-fg">{controlled}</span>
      <span className="text-fg-dim"> / {total}</span>
    </>
  );
}

export function RegulatoryRiskMatrix({ matrix }: { matrix: RiskMatrix }) {
  const { rows, columnTotals, total, underControlTotal } = matrix;
  // A single category row equals the totals row, so omit the redundant footer.
  const showTotals = rows.length > 1;

  return (
    <div>
      <Table caption="Element count by category and current export-control posture">
        <THead>
          <TR hover={false}>
            <TH scope="col">Category</TH>
            {POSTURE_ORDER.map((posture) => (
              <TH key={posture} scope="col" align="center">
                <Badge variant={POSTURE_STYLE[posture].badge}>
                  {POSTURE_STYLE[posture].label}
                </Badge>
              </TH>
            ))}
            <TH scope="col" align="right">
              Under control
            </TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => {
            const style = CATEGORY_STYLE[row.category];
            return (
              <TR key={row.category}>
                {/* Row header: category, linking to its tiles in the directory. */}
                <th scope="row" className="px-3 py-2 text-left align-top">
                  <Link
                    href={`/elements/#${row.category}`}
                    title={`Browse the ${row.total} ${style.label} element${row.total === 1 ? '' : 's'}`}
                    className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors duration-fast hover:text-accent"
                  >
                    <span
                      className={cn('inline-block h-2 w-2 shrink-0 rounded-sm', style.swatch)}
                      aria-hidden="true"
                    />
                    {style.short}
                  </Link>
                </th>
                {row.cells.map((cell) => (
                  <CountCell
                    key={cell.posture}
                    posture={cell.posture}
                    count={cell.count}
                    symbols={cell.symbols}
                  />
                ))}
                <TD numeric align="right">
                  <UnderControl controlled={row.underControl} total={row.total} />
                </TD>
              </TR>
            );
          })}
          {showTotals ? (
            <TR hover={false} className="bg-raised">
              <th
                scope="row"
                className="px-3 py-2 text-left align-top text-sm font-semibold text-fg"
              >
                All elements
              </th>
              {POSTURE_ORDER.map((posture) => (
                <TD key={posture} numeric align="center">
                  <span className="font-semibold text-fg">{columnTotals[posture]}</span>
                </TD>
              ))}
              <TD numeric align="right" className="font-semibold">
                <UnderControl controlled={underControlTotal} total={total} />
              </TD>
            </TR>
          ) : null}
        </TBody>
      </Table>

      <p className="mt-3 text-2xs leading-snug text-fg-dim">
        <span className="text-fg-muted">Suspended</span> counts elements whose
        export listing is currently paused.{' '}
        <span className="text-fg-muted">Under control</span> sums every posture
        except unrestricted. Hover a cell for the elements it counts.
      </p>
    </div>
  );
}
