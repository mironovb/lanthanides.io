/**
 * Markdown renderer for seller-authored marketplace text (listing bodies,
 * seller bios). remark-gfm only — deliberately NO rehype-raw, unlike the
 * content-collection renderer: marketplace bodies are plain markdown imported
 * from the seller's catalog, and inline HTML must never execute here
 * (DESIGN §2.1).
 *
 * `whitespace-pre-line` on paragraphs preserves the seller's own line breaks
 * (the imported descriptions carry hand-broken "• Spec: value" lines that
 * would otherwise collapse into one run-on line). Server component; nothing
 * hydrates.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/components/ui/cn';

export function MarketplaceProse({
  children,
  className,
}: {
  /** The markdown source, verbatim. */
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-prose text-[0.9375rem] leading-relaxed text-fg-muted',
        '[&_p]:my-3 [&_p]:whitespace-pre-line [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
        '[&_strong]:font-semibold [&_strong]:text-fg',
        '[&_a]:text-accent [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2',
        '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
