"use client";

import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";

const emoji = ["😀", "😊", "👍", "✅", "⚠️", "❌", "🎉", "🚀", "💡", "📌", "📥", "❤️"];

export function EmojiTextarea({ locale = "zh", ...props }: Omit<ComponentProps<"textarea">, "value"> & { locale?: "zh" | "en" }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const field = useRef<HTMLTextAreaElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  function insert(value: string) {
    const input = field.current;
    if (!input || input.disabled || input.readOnly) return;
    input.setRangeText(value, input.selectionStart, input.selectionEnd, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    if (menu.current) menu.current.open = false;
  }
  return (
    <div className="min-w-0">
      <textarea {...props} readOnly={!ready || props.readOnly} ref={field} className={`${props.className ?? ""} enhe-authored-text`} />
      {!props.disabled && !props.readOnly ? (
        <details ref={menu} className="mt-2">
          <summary className="cursor-pointer text-sm text-[var(--enhe-action)]">{locale === "en" ? "😊 Insert emoji" : "😊 插入表情"}</summary>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={locale === "en" ? "Emoji" : "表情"}>
            {emoji.map(value => <button key={value} type="button" disabled={!ready} aria-label={`${locale === "en" ? "Insert" : "插入"} ${value}`} onClick={() => insert(value)} className="enhe-authored-text rounded-lg border p-2 text-xl focus-visible:outline-2 focus-visible:outline-offset-2">{value}</button>)}
          </div>
        </details>
      ) : null}
    </div>
  );
}

// Keep toolbar buttons outside the textarea label and preserve its accessible name.
export function EmojiField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`enhe-admin-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {Children.map(children, child => isValidElement<ComponentProps<typeof EmojiTextarea>>(child) && child.type === EmojiTextarea ? cloneElement(child, { id }) : child)}
    </div>
  );
}
