"use client";

import { Children, cloneElement, isValidElement, useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";

export function EmojiTextarea({ locale: _locale, ...props }: Omit<ComponentProps<"textarea">, "value"> & { locale?: "zh" | "en" }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div className="min-w-0">
      <textarea {...props} readOnly={!ready || props.readOnly} className={`${props.className ?? ""} enhe-authored-text`} />
    </div>
  );
}

// Associate wrapped client fields with the label, leaving native help text alone.
export function EmojiField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`enhe-admin-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {Children.map(children, child => isValidElement<ComponentProps<typeof EmojiTextarea>>(child) && typeof child.type !== "string" ? cloneElement(child, { id }) : child)}
    </div>
  );
}
