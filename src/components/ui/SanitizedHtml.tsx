import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils/cn";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "p", "strong", "em", "u", "a", "ul", "ol", "li",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td", "br", "hr",
];

/**
 * Renders Tiptap-authored rich text. This is now the ONLY sanitization
 * boundary — there is no server-side re-sanitization pass on write anymore
 * (terms create/publish is a plain admin-authenticated client write, not a
 * Cloud Function). Only admins can write terms content, so the residual
 * risk is a compromised admin session, not an arbitrary client.
 */
export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return (
    <div
      className={cn(
        "prose-content max-w-none text-sm leading-relaxed text-neutral-700 [&_a]:text-brand-700 [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-neutral-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc [&_blockquote]:border-l-2 [&_blockquote]:border-brand-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:w-full [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
