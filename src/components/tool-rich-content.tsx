import { cn } from "@/lib/utils";
import { linkifyDownloadLinkContent } from "@/lib/tool-download-link";

export function ToolRichContent({ content, className, tone = "primary" }: {
  content: string;
  className?: string;
  tone?: "primary" | "muted";
}) {
  if (!content.trim()) return null;
  return (
    <div className={cn("enhe-authored-text whitespace-pre-wrap break-words text-base leading-8", tone === "primary" ? "text-[#C5D0E2]" : "text-[#8F9DB2]", className)}>
      {linkifyDownloadLinkContent(content).map((segment, index) => segment.type === "link" ? (
        <a key={index} href={segment.href} target="_blank" rel="nofollow noopener noreferrer" className="break-all text-[var(--marketing-accent)] underline underline-offset-4">{segment.text}</a>
      ) : <span key={index}>{segment.text}</span>)}
    </div>
  );
}
