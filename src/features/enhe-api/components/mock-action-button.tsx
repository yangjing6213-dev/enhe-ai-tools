"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function MockActionButton({
  label,
  message,
  variant = "primary",
  className
}: {
  label: string;
  message: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const tone =
    variant === "primary"
      ? "border-[var(--marketing-accent)] bg-[var(--marketing-accent)] text-white hover:bg-[#ff6c47]"
      : variant === "danger"
        ? "border-red-300/25 bg-red-400/10 text-red-100 hover:border-red-200/60"
        : "border-white/14 bg-white/8 text-[var(--marketing-text)] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]";

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        className={cn("cursor-target rounded-full border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5", tone, className)}
        onClick={() => setLastMessage(message)}
      >
        {label}
      </button>
      {lastMessage ? <span className="text-xs font-semibold text-[var(--marketing-muted)]" aria-live="polite">{lastMessage}</span> : null}
    </span>
  );
}
