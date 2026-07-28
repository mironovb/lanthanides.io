/**
 * Server-only marketplace prop builders (they touch `lib/data` /
 * `lib/marketplace`, which read the filesystem). Pages call these and pass the
 * resulting plain objects to the presentational components and the client
 * islands; nothing under the client boundary imports this file.
 */
import { getElements } from '@/lib/data';
import { getMarketplaceSettings } from '@/lib/marketplace';
import type { ElementVariantMap, MarketplaceLabels } from './marketplace';

/** Display labels from `_marketplace/settings.yml`, as one serialisable bag. */
export function buildMarketplaceLabels(): MarketplaceLabels {
  const settings = getMarketplaceSettings();
  return {
    categories: settings.categoryLabels,
    sourceTypes: settings.sourceTypeLabels,
  };
}

/**
 * Symbol → site-catalog category, for the element Badge variant. Only the 31
 * catalog symbols appear; every other element renders a neutral Badge.
 */
export function buildElementVariantMap(): ElementVariantMap {
  const map: ElementVariantMap = {};
  for (const element of getElements()) map[element.symbol] = element.category;
  return map;
}
