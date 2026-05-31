/**
 * Trust signals — the credibility surfaces formalized in Prompt 16: per-record
 * provenance, the intake-path mix, the "how we verify" signpost, the live
 * Telegram alert bot, and the contributor pipeline. Import from
 * `@/components/trust`.
 */
export { ProvenanceBadge, confidenceLevel } from './ProvenanceBadge';
export type { ConfidenceLevel } from './ProvenanceBadge';

export { SourceBreakdownPanel } from './SourceBreakdownPanel';
export { MethodologyCallout } from './MethodologyCallout';
export { TelegramBadge, getTelegramBotUrl } from './TelegramBadge';
export { ContributePanel } from './ContributePanel';
