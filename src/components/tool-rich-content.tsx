import { cn } from "@/lib/utils";
import { buildToolContentBlocks } from "@/lib/tool-content";

export function ToolRichContent({
  content,
  className,
  tone = "primary"
}: {
  content: string;
  className?: string;
  tone?: "primary" | "muted";
}) {
  const blocks = buildToolContentBlocks(content);
  if (!blocks.length) return null;

  const textClass = tone === "primary" ? "text-[#C5D0E2]" : "text-[#8F9DB2]";

  return (
    <div className={cn("space-y-5 text-base leading-8", textClass, className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={`${block.type}-${index}`} className="text-lg font-semibold leading-7 text-[#F6FAFF]">
              {block.text}
            </h3>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-2 border-l border-white/10 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="relative pl-4">
                  <span className="absolute left-0 top-[0.82em] h-1.5 w-1.5 rounded-full bg-[var(--marketing-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          const startNumber = block.start ?? 1;

          return (
            <ol key={`${block.type}-${index}`} className="space-y-3 border-l border-white/10 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="grid grid-cols-[1.75rem_1fr] gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/8 text-xs font-semibold text-[var(--marketing-accent)]">
                    {startNumber + itemIndex}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          );
        }

        return <p key={`${block.type}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}
