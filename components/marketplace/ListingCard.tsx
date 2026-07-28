/**
 * ListingCard: one marketplace listing tile. Purely presentational — it
 * receives a serialised `ListingSummaryDto` plus label/variant maps, imports
 * nothing server-only, and therefore renders identically under the client
 * filter island (`MarketplaceView`) and in plain server grids (seller page,
 * "more from this seller").
 *
 * The whole card is ONE link (to the listing page), so the element badges are
 * non-interactive spans here — the linked badges live on the detail page.
 * Colour discipline: element badges reuse the site-catalog category variants,
 * the category is a neutral Chip; figures are mono/tabular, price prominent,
 * meta quieter.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { ListingSummaryDto } from '@/lib/marketplace/serialize';
import { Badge, Card, Chip } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import {
  type ElementVariantMap,
  type MarketplaceLabels,
  fmtCents,
  fmtMassRange,
  provenanceLine,
} from './marketplace';

export function ListingCard({
  dto,
  labels,
  elementVariants,
}: {
  dto: ListingSummaryDto;
  labels: MarketplaceLabels;
  elementVariants: ElementVariantMap;
}) {
  const sizesLabel = `${dto.variant_count} size${dto.variant_count === 1 ? '' : 's'}`;
  const origin = provenanceLine(dto.provenance_summary, labels.sourceTypes);
  const ledger = dto.ledger_comparison;

  return (
    <Card as="article" padding="none" interactive className="overflow-hidden">
      <Link href={dto.url} className="flex h-full flex-col">
        {/* Fixed-aspect media box; object-contain never crops the specimen. */}
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-white">
          <Image
            src={dto.primary_image.path}
            alt={dto.primary_image.alt}
            width={dto.primary_image.width}
            height={dto.primary_image.height}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-fg">
            {dto.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            {dto.elements.map((sym) => (
              <Badge
                key={sym}
                variant={
                  dto.catalog_elements.includes(sym)
                    ? elementVariants[sym] ?? 'default'
                    : 'default'
                }
              >
                {sym}
              </Badge>
            ))}
            <Chip>{labels.categories[dto.category]}</Chip>
          </div>

          <div className="mt-auto pt-1">
            <p className="font-mono text-base font-semibold tabular-nums text-fg">
              From {fmtCents(dto.price_from_cents)}
            </p>
            <p className="mt-0.5 font-mono text-2xs tabular-nums text-fg-dim">
              {fmtMassRange(dto.mass_min_g, dto.mass_max_g)} · {sizesLabel}
            </p>
            {/* Position against the sourced ledger — colour encodes meaning.
                Deltas under 100% read as a whole percent; larger ones as a
                multiple of the ledger mid (only reachable above the band). */}
            {ledger ? (
              ledger.zone === 'within' ? (
                <p className="mt-0.5 text-2xs text-fg-dim">Within ledger range</p>
              ) : (
                <p
                  className={cn(
                    'mt-0.5 text-2xs',
                    ledger.zone === 'below' ? 'text-up' : 'text-down',
                  )}
                >
                  {Math.abs(ledger.delta_vs_mid_pct) >= 100 ? (
                    <>
                      <span className="numeric">
                        {(1 + Math.abs(ledger.delta_vs_mid_pct) / 100).toFixed(1)}×
                      </span>{' '}
                      ledger reference
                    </>
                  ) : (
                    <>
                      <span className="numeric">
                        {Math.round(Math.abs(ledger.delta_vs_mid_pct))}%
                      </span>{' '}
                      {ledger.zone} ledger reference
                    </>
                  )}
                </p>
              )
            ) : null}
          </div>

          {origin ? <p className="text-xs text-fg-dim">{origin}</p> : null}

          <p className="text-xs font-medium text-fg-muted">
            {dto.seller_handle} <span aria-hidden="true">→</span>
          </p>
        </div>
      </Link>
    </Card>
  );
}
