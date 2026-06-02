/**
 * Base component library: the terminal-grade primitives every page composes
 * from (Prompt 11). Import from `@/components/ui`:
 *
 *   import { Panel, Stat, StatGrid, Badge, SortableTable } from '@/components/ui';
 *
 * See docs/DESIGN-SYSTEM.md for tokens, usage, and the visual principles.
 */
export { cn } from './cn';
export type { ClassValue } from './cn';

export { SectionHeading } from './SectionHeading';
export type { SectionHeadingProps } from './SectionHeading';

export { Breadcrumbs } from './Breadcrumbs';
export type { Crumb } from './Breadcrumbs';

export { Card, Panel } from './Card';
export type { CardProps, PanelProps } from './Card';

export { Badge, Chip } from './Badge';
export type { BadgeProps, BadgeVariant, ChipProps } from './Badge';

export { Stat, StatGrid } from './Stat';
export type { StatProps, StatGridProps } from './Stat';

export { Button, LinkButton, buttonClasses } from './Button';
export type {
  ButtonProps,
  LinkButtonProps,
  ButtonVariant,
  ButtonSize,
} from './Button';

export { Callout } from './Callout';
export type { CalloutProps, CalloutTone } from './Callout';

export { Table, THead, TBody, TR, TH, TD } from './Table';
export type { THProps, TDProps } from './Table';

export { SortableTable, useSortable } from './SortableTable';
export type { Column, SortableTableProps, SortDir } from './SortableTable';

export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';

export { FilterChips } from './FilterChips';
export type { ChipOption } from './FilterChips';

export { Tooltip } from './Tooltip';
