/**
 * Offer-feed components (Prompt 21) — the demand-side screened-offer feed.
 * Import from `@/components/offers`.
 */
export { OffersBanner } from './OffersBanner';
export { OffersFeed } from './OffersFeed';
export {
  toOfferDTO,
  buildOfferFilterOptions,
  filterOffers,
  valueBand,
  confidenceBand,
  sourceTypeLabel,
  EMPTY_FILTERS,
  VALUE_NEAR_THRESHOLD,
} from './offers';
export type {
  OfferDTO,
  OfferRow,
  ElementMeta,
  OfferFilters,
  OfferFilterOptions,
  ValueBand,
  ValueBandKey,
  SelectOption,
} from './offers';
