/**
 * Seller avatar via next/image with the stored intrinsic dimensions. The seed
 * avatar is a local SVG; SVGs must bypass the image optimizer (there is no
 * `images.dangerouslyAllowSVG` config in this repo, deliberately), so `.svg`
 * paths render `unoptimized` — served as-is from `public/`.
 */
import Image from 'next/image';
import type { SellerAvatar } from '@/lib/marketplace/types';
import { cn } from '@/components/ui/cn';

export function SellerAvatarImage({
  avatar,
  className,
}: {
  avatar: SellerAvatar;
  /** Sizing classes, e.g. `h-14 w-14`. */
  className?: string;
}) {
  return (
    <Image
      src={avatar.path}
      alt={avatar.alt}
      width={avatar.width}
      height={avatar.height}
      unoptimized={avatar.path.endsWith('.svg')}
      className={cn('shrink-0 rounded-md border border-border bg-surface', className)}
    />
  );
}
