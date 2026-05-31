/**
 * Container — the one content column. Centers at the `content` max-width
 * (72rem) with consistent gutters, so the header, footer, and every page align
 * to the same measure. Pages keep rendering their own <main>; the root layout
 * does NOT wrap children in a Container (pages own their vertical rhythm), it is
 * used by the header/footer and is available for pages to adopt in Prompt 12.
 */
import { cn } from '@/components/ui/cn';

export function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'header' | 'footer' | 'main' | 'section';
}) {
  return (
    <Tag className={cn('mx-auto w-full max-w-content px-6', className)}>
      {children}
    </Tag>
  );
}
