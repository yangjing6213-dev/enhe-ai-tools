"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { defaultEmojis, emojiImageSource, parseEmojiCatalog, type EmojiEntry } from "@/lib/emojis";
import { insertEmojiAtCaret, isOrdinaryTextField } from "@/lib/emojis-input";

const EmojiContext = createContext<readonly EmojiEntry[]>(defaultEmojis);
export const useEmojiCatalog = () => useContext(EmojiContext);
type TextField = HTMLInputElement | HTMLTextAreaElement;

export function EmojiProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<readonly EmojiEntry[]>(defaultEmojis);
  const [field, setField] = useState<TextField | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const refreshCatalogRef = useRef<() => void>(() => {});
  const selectionRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/emojis", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { entries?: unknown };
        if (!controller.signal.aborted) setEntries(parseEmojiCatalog(JSON.stringify(body.entries)));
      } catch {
        // Bundled stickers remain available when the catalog cannot be reached.
      }
    };
    refreshCatalogRef.current = () => { void refresh(); };
    void refresh();
    window.addEventListener("enhe:emojis-updated", refresh);
    return () => { controller.abort(); window.removeEventListener("enhe:emojis-updated", refresh); };
  }, []);

  useEffect(() => {
    const focus = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && pickerRef.current?.contains(target)) return;
      if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && isOrdinaryTextField(target)) {
        setField(target);
        selectionRef.current = { start: target.selectionStart, end: target.selectionEnd };
        setMessage("");
      } else {
        setField(null);
        setOpen(false);
      }
    };
    const rememberSelection = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        selectionRef.current = { start: target.selectionStart, end: target.selectionEnd };
      }
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); field?.focus(); }
    };
    const submit = () => { setOpen(false); setField(null); };
    document.addEventListener("focusin", focus);
    document.addEventListener("select", rememberSelection, true);
    document.addEventListener("keyup", rememberSelection, true);
    document.addEventListener("pointerup", rememberSelection, true);
    document.addEventListener("input", rememberSelection, true);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("submit", submit, true);
    return () => {
      document.removeEventListener("focusin", focus);
      document.removeEventListener("select", rememberSelection, true);
      document.removeEventListener("keyup", rememberSelection, true);
      document.removeEventListener("pointerup", rememberSelection, true);
      document.removeEventListener("input", rememberSelection, true);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("submit", submit, true);
    };
  }, [field]);

  const insert = (entry: EmojiEntry) => {
    if (!field?.isConnected || !isOrdinaryTextField(field)) { setField(null); setOpen(false); return; }
    const next = insertEmojiAtCaret(field.value, selectionRef.current.start, selectionRef.current.end, `:${entry.id}:`, field.maxLength);
    if (!next) { setMessage("这个输入框的字数已不够放入此表情，请先删减一些文字。"); return; }
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, next.value);
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: `:${entry.id}:` }));
    selectionRef.current = { start: next.caret, end: next.caret };
    setOpen(false);
    setMessage("");
    requestAnimationFrame(() => { if (field.isConnected) { field.focus(); field.setSelectionRange(next.caret, next.caret); } });
  };

  return (
    <EmojiContext.Provider value={entries}>
      {children}
      {field ? createPortal(
        <div className="enhe-emoji-picker" ref={pickerRef}>
          {open ? (
            <div className="enhe-emoji-popover" id="enhe-emoji-picker-panel" role="dialog" aria-label="选择站内表情">
              <div className="enhe-emoji-heading"><strong>站内表情</strong><button type="button" aria-label="关闭表情选择器" onClick={() => { setOpen(false); field.focus(); }}>×</button></div>
              <div className="enhe-emoji-grid">
                {entries.filter((entry) => entry.enabled).map((entry) => (
                  <button type="button" key={entry.id} title={entry.label} aria-label={`插入${entry.label}表情`} onClick={() => insert(entry)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={emojiImageSource(entry)} alt="" width={64} height={64} loading="lazy" decoding="async" />
                    <span>{entry.label}</span>
                  </button>
                ))}
              </div>
              {!entries.some((entry) => entry.enabled) ? <p>暂时没有可用的表情。</p> : null}
              <p className="enhe-emoji-hint">将插入当前文字输入框的光标位置。</p>
              {message ? <p role="status" className="enhe-emoji-error">{message}</p> : null}
            </div>
          ) : null}
          <button className="enhe-emoji-toggle" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "enhe-emoji-picker-panel" : undefined} onClick={() => { if (!open) refreshCatalogRef.current(); setOpen(!open); }}>
            <span aria-hidden="true">☺</span> 插入表情
          </button>
        </div>, field.closest("dialog, [role='dialog']") ?? document.body
      ) : null}
    </EmojiContext.Provider>
  );
}
