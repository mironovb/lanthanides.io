/**
 * RegulatorySnapshot — the dashboard's at-a-glance regulatory band (Prompt 17).
 * Two count breakdowns of all tracked elements: Chinese export-control posture
 * (restricted / monitored / unrestricted) and current regulatory state (active /
 * suspended / clear). Every tile links into the Regulatory Tracker — the crown-
 * jewel surface this band ties the dashboard into.
 *
 * Server component, presentational. Colour is semantic only — it reuses the
 * regulatory-risk scale via <Badge>, never an arbitrary palette. Counts come
 * straight from the catalog (getRegulatorySnapshot); nothing is fabricated.
 */
import Link from 'next/link';
import type { RegulatorySnapshot as Snapshot } from '@/lib/types';
import { Badge, type BadgeVariant } from '@/components/ui';

interface Cell {
  count: number;
  variant: BadgeVariant; // the regulatory/control state — drives the badge colour
  label: string;
  desc: string;
}

function SnapCard({ cell }: { cell: Cell }) {
  return (
    <Link
      href="/regulatory/"
      className="flex flex-col gap-2 border border-border bg-surface p-3 transition-colors duration-fast hover:border-border-strong"
    >
      <span className="font-mono text-3xl font-semibold leading-none tabular-nums text-fg">
        {cell.count}
      </span>
      <Badge variant={cell.variant}>{cell.label}</Badge>
      <span className="text-2xs leading-snug text-fg-dim">{cell.desc}</span>
    </Link>
  );
}

function SnapGroup({ eyebrow, cells }: { eyebrow: string; cells: Cell[] }) {
  return (
    <div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <SnapCard key={c.label} cell={c} />
        ))}
      </div>
    </div>
  );
}

export function RegulatorySnapshot({ snapshot }: { snapshot: Snapshot }) {
  const control: Cell[] = [
    {
      count: snapshot.export_control.restricted,
      variant: 'restricted',
      label: 'Restricted',
      desc: 'Export licence required',
    },
    {
      count: snapshot.export_control.monitored,
      variant: 'monitored',
      label: 'Monitored',
      desc: 'Customs reporting only',
    },
    {
      count: snapshot.export_control.normal,
      variant: 'normal',
      label: 'Unrestricted',
      desc: 'No control regime',
    },
  ];

  const state: Cell[] = [
    {
      count: snapshot.regulatory.active,
      variant: 'active',
      label: 'Active',
      desc: 'Control regime in force',
    },
    {
      count: snapshot.regulatory.suspended,
      variant: 'suspended',
      label: 'Suspended',
      desc: 'Listed but currently paused',
    },
    {
      count: snapshot.regulatory.none,
      variant: 'normal',
      label: 'Clear',
      desc: 'No active controls',
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SnapGroup eyebrow="Export-control posture" cells={control} />
      <SnapGroup eyebrow="Regulatory state" cells={state} />
    </div>
  );
}
