"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
  duplicateSubmitLabel?: ReactNode;
  variant?: "primary" | "success" | "secondary" | "danger";
};

const buttonVariant = {
  primary: "default",
  success: "default",
  secondary: "outline",
  danger: "destructive",
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
      <Button
        {...props}
        type={type}
        disabled={disabled}
        aria-disabled={isDisabled}
        onClick={handleClick}
        variant={buttonVariant[variant]}
        className={cn("h-auto min-h-11 rounded-full px-5 py-3 text-sm font-semibold", isDisabled && "cursor-not-allowed opacity-70", className)}
      >
        {pending ? pendingLabel : children}
      </Button>
      {showDuplicateNotice ? (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-sm font-semibold text-popover-foreground shadow-lg"
        >
          {duplicateSubmitLabel}
        </span>
      ) : null}
    </>
  );
}
