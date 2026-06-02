/**
 * Element formatting helpers, kept as a thin re-export so existing element
 * components don't churn. The canonical implementations (and the shared date
 * formatter) live in `lib/format.ts`; import from there in new code.
 */
export {
  capitalize,
  humanize,
  fmtUsd,
  fmtUsdPrice,
  fmtQuantity,
  fmtPremium,
  formatDate,
} from '@/lib/format';
