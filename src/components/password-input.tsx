"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  showLabel?: string;
  hideLabel?: string;
  wrapperClassName?: string;
};

export function PasswordInput({
  showLabel = "Show password",
  hideLabel = "Hide password",
  wrapperClassName = "",
  className = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const buttonLabel = visible ? hideLabel : showLabel;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        aria-label={buttonLabel}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 inline-flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--marketing-muted)] transition hover:bg-white/10 hover:text-[var(--marketing-text)] focus:outline-none focus:ring-2 focus:ring-[var(--marketing-accent)]/70"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
