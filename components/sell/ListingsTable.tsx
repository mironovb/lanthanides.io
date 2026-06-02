/**
 * ListingsTable: the server-rendered view of submitted listings (Prompt 20),
 * demonstrating the seller loop end-to-end: a submission appears here the moment
 * it is saved (the form calls `router.refresh()`). Presentational only, the page
 * reads the DB via `lib/db` and passes the SAFE projection (`ListingDTO`), which
 * never carries the private `sellerContact` (schema contract: contact is never
 * published).
 *
 * Status is a workflow state (pending → reviewed → published), NOT one of the
 * design system's meaning axes (price / regulatory / category), so it renders as
 * a neutral monochrome pill rather than a semantic Badge; colour stays reserved.
 * The table states plainly that publishing is a maintainer step, consistent with
 * the contributor-pipeline ethos.
 */
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { capitalize, fmtUsd, fmtUsdPrice, formatDate } from '@/lib/format';
import type { ListingDTO } from './sell';

/** Neutral, non-semantic workflow-state pill (no price/regulatory colour). */
function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-sm border border-border bg-raised px-1.5 py-0.5 font-mono text-2xs uppercase tracking-caps text-fg-muted">
      {status}
    </span>
  );
}

function gaugeRange(l: ListingDTO): string {
  if (l.gaugeLow == null || l.gaugeHigh == null) return 'n/a';
  return `${fmtUsdPrice(l.gaugeLow)} to ${fmtUsdPrice(l.gaugeHigh)}`;
}

export function ListingsTable({ listings }: { listings: ListingDTO[] }) {
  if (listings.length === 0) {
    return (
      <div className="border border-border bg-surface px-4 py-8 text-center">
        <p className="text-sm text-fg-muted">No listings submitted yet.</p>
        <p className="mt-1 text-xs text-fg-dim">
          Submit the form above and your listing appears here instantly, marked
          pending until a maintainer reviews it.
        </p>
      </div>
    );
  }

  return (
    <Table caption={`${listings.length} most recent submission${listings.length === 1 ? '' : 's'} · newest first`}>
      <THead>
        <TR hover={false}>
          <TH>Submitted</TH>
          <TH>Seller</TH>
          <TH>Element</TH>
          <TH>Form</TH>
          <TH>Purity</TH>
          <TH numeric>Qty (kg)</TH>
          <TH numeric>Asking / kg</TH>
          <TH numeric>Gauge range (USD/kg)</TH>
          <TH>Conf.</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {listings.map((l) => (
          <TR key={l.id}>
            <TD className="whitespace-nowrap text-fg-dim">
              {formatDate(l.createdAt)}
            </TD>
            <TD className="max-w-[12rem] text-fg">
              <span className="block truncate" title={l.sellerName}>
                {l.sellerName}
              </span>
            </TD>
            <TD>
              <a
                href={`/elements/${l.elementSymbol}/`}
                className="font-mono font-semibold text-fg hover:text-accent-strong"
              >
                {l.elementSymbol}
              </a>
            </TD>
            <TD>{capitalize(l.form)}</TD>
            <TD className="whitespace-nowrap font-mono text-xs text-fg-muted">
              {l.purity}
            </TD>
            <TD numeric>{l.quantityKg.toLocaleString('en-US')}</TD>
            <TD numeric>
              {l.currency === 'USD' ? (
                fmtUsdPrice(l.askingPricePerKg)
              ) : (
                <>
                  {fmtUsd(l.askingPricePerKg)}
                  <span className="ml-1 text-2xs text-fg-dim">{l.currency}</span>
                </>
              )}
            </TD>
            <TD numeric className="text-fg-muted">
              {gaugeRange(l)}
            </TD>
            <TD className="font-mono text-2xs uppercase text-fg-dim">
              {l.gaugeConfidence ?? 'n/a'}
            </TD>
            <TD>
              <StatusPill status={l.status} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
