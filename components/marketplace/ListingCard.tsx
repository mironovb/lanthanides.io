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
 * everything else is a neutral Chip; the price line is `.numeric` mono.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { ListingSummaryDto } from '@/lib/marketplace/serialize';
import { Badge, Card, Chip } from '@/components/ui';
import {
  type ElementVariantMap,
  type MarketplaceLabels,
  fmtCents,
  fmtMassRange,
  isVerificationPending,
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
  const pending = isVerificationPending(dto);
  const sizesLabel = `${dto.variant_count} size${dto.variant_count === 1 ? '' : 's'}`;

  return (
    <Card as="article" padding="none" interactive className="overflow-hidden">
      <Link href={dto.url} className="flex h-full flex-col">
        {/* Fixed-aspect media box; object-contain never crops the specimen. */}
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-surface">
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
            {pending ? (
              <Chip>{labels.verification[dto.provenance_summary.verification_status]}</Chip>
            ) : null}
          </div>

          <p className="numeric mt-auto pt-1 text-left">
            <span className="text-base font-semibold text-fg">
              From {fmtCents(dto.price_from_cents)}
            </span>{' '}
            <span className="text-xs text-fg-dim">
              · {fmtMassRange(dto.mass_min_g, dto.mass_max_g)} · {sizesLabel}
            </span>
          </p>

          <p className="text-xs text-fg-dim">
            {provenanceLine(dto.provenance_summary, labels.sourceTypes)}
          </p>

          <p className="text-xs font-medium text-fg-muted">
            {dto.seller_handle} <span aria-hidden="true">→</span>
          </p>
        </div>
      </Link>
    </Card>
  );
}
