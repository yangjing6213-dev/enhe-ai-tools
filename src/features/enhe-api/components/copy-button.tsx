"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label = "复制", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "cursor-target inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-black text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]",
        className
      )}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "已复制" : label}
    </button>
  );
}
