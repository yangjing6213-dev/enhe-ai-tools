"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export type FormSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
  duplicateSubmitLabel?: ReactNode;
  variant?: "primary" | "success" | "secondary" | "danger";
};

const baseClass =
  "inline-flex items-center justify-center rounded-full font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

const variantClass = {
  primary:
    "bg-[#050505] px-5 py-3 text-sm text-white shadow-[0_14px_34px_rgba(0,0,0,0.22)] hover:bg-[#161616]",
  success:
    "bg-[var(--marketing-accent)] px-5 py-3 text-sm text-white hover:bg-[#ff6844]",
  secondary:
    "border border-white/14 bg-white/7 px-5 py-3 text-sm text-[var(--marketing-text)] hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]",
  danger:
    "border border-red-400/35 bg-red-400/10 px-4 py-2 text-sm text-red-100 hover:border-red-300 hover:bg-red-400/15"
} as const;

export function FormSubmitButton({
  children,
  pendingLabel = "处理中...",
  duplicateSubmitLabel = "已经提交，请勿重复提交",
  variant = "primary",
  className,
  disabled,
  onClick,
  type = "submit",
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmitButton = type === "submit";
  const isDisabled = Boolean(disabled || pending || hasSubmitted);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  function showDuplicateSubmitNotice() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setShowDuplicateNotice(true);
    noticeTimerRef.current = setTimeout(() => setShowDuplicateNotice(false), 2600);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (isSubmitButton && (pending || hasSubmitted || form?.dataset.submitted === "true")) {
      event.preventDefault();
      showDuplicateSubmitNotice();
      return;
    }

    onClick?.(event);
    if (event.defaultPrevented || !isSubmitButton) return;

    if (form && !form.checkValidity()) return;

    if (form) form.dataset.submitted = "true";
    setHasSubmitted(true);
    setShowDuplicateNotice(false);
  }

  return (
    <>
      <button
        {...props}
        type={type}
        disabled={disabled}
        aria-disabled={isDisabled}
        onClick={handleClick}
        className={cn(baseClass, variantClass[variant], isDisabled && "cursor-not-allowed opacity-70", className)}
      >
        {pending ? pendingLabel : children}
      </button>
      {showDuplicateNotice ? (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-[var(--marketing-accent)]/35 bg-[#202229]/95 px-4 py-2 text-sm font-semibold text-[var(--marketing-text)] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
        >
          {duplicateSubmitLabel}
        </span>
      ) : null}
    </>
  );
}
