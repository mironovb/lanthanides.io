/**
 * SellerRail: a compact horizontal row of seller cards under the browse
 * masthead — avatar, display name, country, listing count, Verified badge —
 * each linking to the seller profile. Presentational server component; the
 * page derives the items from `lib/marketplace` and passes plain props.
 * Scrolls horizontally on narrow viewports (quiet scrollbar via the global
 * `.overflow-x-auto` styling).
 */
import Link from 'next/link';
import type { SellerAvatar } from '@/lib/marketplace/types';
import { Badge, Card } from '@/components/ui';
import { SellerAvatarImage } from './SellerAvatarImage';

export interface SellerRailItem {
  handle: string;
  displayName: string;
  country: string;
  verified: boolean;
  listingCount: number;
  avatar: SellerAvatar;
}

export function SellerRail({ sellers }: { sellers: SellerRailItem[] }) {
  if (sellers.length === 0) return null;
  return (
    <section aria-label="Sellers" className="mt-8">
      <h2 className="sr-only">Sellers</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {sellers.map((seller) => (
          <Card
            key={seller.handle}
            padding="none"
            interactive
            className="min-w-[15rem] shrink-0"
          >
            <Link
              href={`/marketplace/sellers/${seller.handle}/`}
              className="flex items-center gap-3 p-3"
            >
              <SellerAvatarImage avatar={seller.avatar} className="h-10 w-10" />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-serif text-sm font-semibold text-fg">
                    {seller.displayName}
                  </span>
                  {seller.verified ? (
                    <Badge variant="accent">Verified</Badge>
                  ) : null}
                </span>
                <span className="mt-0.5 block font-mono text-2xs tabular-nums text-fg-dim">
                  {seller.country} · {seller.listingCount} listing
                  {seller.listingCount === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
