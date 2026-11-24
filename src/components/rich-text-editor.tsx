"use client";

import { useRef, useState } from "react";

type RichTextEditorProps = {
  name: string;
  locale: "zh" | "en";
  id?: string;
  ariaLabel?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  className?: string;
  emojiPicker?: boolean;
  newsMedia?: boolean;
};

export function insertTextAtSelection(textarea: HTMLTextAreaElement, inserted: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.setRangeText(inserted, start, end, "end");
  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

export function wrapTextSelection(value: string, start: number, end: number, prefix: string, suffix: string, fallback: string) {
  const selected = value.slice(start, end) || fallback;
  const replacement = `${prefix}${selected}${suffix}`;
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    replacement,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

export function RichTextEditor({ name, locale, id, ariaLabel, defaultValue, value, onChange, required, minLength, maxLength, rows = 10, placeholder, className, emojiPicker = false, newsMedia = false }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const english = locale === "en";

  async function insertNewsMedia(file: File) {
    const editor = textareaRef.current;
    if (!editor || uploading) return;
    const kind = /^video\/(mp4|webm|quicktime)$/i.test(file.type) ? "video" : /^image\/(png|jpeg|webp|gif)$/i.test(file.type) ? "image" : null;
    if (!kind) {
      setUploadError(english ? "Choose a PNG, JPEG, WebP, GIF, MP4, WebM or MOV file." : "请选择 PNG、JPEG、WebP、GIF、MP4、WebM 或 MOV 文件。");
      return;
    }
    setUploading(true);
    setUploadError("");
    editor.setCustomValidity(english ? "Please wait for the upload." : "请等待上传完成。");
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      if (!response.ok) throw new Error();
      const { fileUrl } = await response.json();
      if (typeof fileUrl !== "string" || !/^(?:https?:\/\/|\/uploads\/)/i.test(fileUrl) || /[\s\\]/u.test(fileUrl)) throw new Error();
      const label = file.name.replace(/[\r\n[\]]/g, " ");
      const url = fileUrl.replace(/\(/g, "%28").replace(/\)/g, "%29");
      insertTextAtSelection(editor, `\n\n!${kind === "video" ? "video" : ""}[${label}](${url})\n\n`);
      onChange?.(editor.value);
    } catch {
      setUploadError(english ? "Upload failed. Please try again." : "上传失败，请重试。");
    } finally {
      editor.setCustomValidity("");
      setUploading(false);
    }
  }

  function wrapSelection(prefix: string, suffix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const formatted = wrapTextSelection(textarea.value, start, end, prefix, suffix, english ? "text" : "文字");
    textarea.setRangeText(formatted.replacement, start, end, "select");
    textarea.setSelectionRange(formatted.selectionStart, formatted.selectionEnd);
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    onChange?.(textarea.value);
  }

  function addLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || (english ? "link text" : "链接文字");
    const url = window.prompt(english ? "Enter an http(s) link" : "输入 http(s) 链接", "https://");
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    const value = `[${selected}](${url.trim()})`;
    textarea.setRangeText(value, start, end, "select");
    textarea.setSelectionRange(start + 1, start + 1 + selected.length);
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    onChange?.(textarea.value);
  }

  const buttonBaseClass = "rounded-lg border border-[var(--enhe-border,#d8d8d8)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600";
  const buttonClass = `${buttonBaseClass} bg-white text-[var(--enhe-text,#080808)] hover:bg-slate-50`;
  const actionButtonClass = `${buttonBaseClass} bg-white text-[var(--enhe-text,#080808)] rich-text-editor__action`;
  return (
    <div className="rich-text-editor grid min-w-0 gap-2">
      <div className="rich-text-editor__toolbar flex flex-wrap items-center gap-2" role="toolbar" aria-label={english ? "Text formatting" : "文字格式工具"}>
        <button type="button" className={actionButtonClass} onClick={() => wrapSelection("**", "**")}>{english ? "Bold" : "加粗"}</button>
        <label className="flex items-center gap-1 text-sm text-[var(--enhe-text,#080808)]">
          <span className="sr-only">{english ? "Font size" : "字体大小"}</span>
          <select className={buttonClass} defaultValue="" onChange={(event) => { if (event.target.value) wrapSelection(`[[size=${event.target.value}]]`, "[[/size]]"); event.currentTarget.value = ""; }}>
            <option value="" disabled>{english ? "Size" : "字号"}</option>
            {[14, 16, 18, 24, 32].map((size) => <option key={size} value={size}>{size}px</option>)}
          </select>
        </label>
        <button type="button" className={actionButtonClass} onClick={addLink}>{english ? "Link" : "超链接"}</button>
        <label className="flex items-center gap-1 text-sm text-[var(--enhe-text,#080808)]">
          <span className="sr-only">{english ? "Text background" : "文字背景"}</span>
          <select className={buttonClass} defaultValue="" onChange={(event) => { if (event.target.value) wrapSelection(`[[bg=${event.target.value}]]`, "[[/bg]]"); event.currentTarget.value = ""; }}>
            <option value="" disabled>{english ? "Highlight" : "背景色"}</option>
            <option value="#fff3cd">{english ? "Yellow" : "黄色"}</option>
            <option value="#dbeafe">{english ? "Blue" : "蓝色"}</option>
            <option value="#fce7f3">{english ? "Pink" : "粉色"}</option>
          </select>
        </label>
        <button type="button" className={actionButtonClass} onClick={() => wrapSelection("`", "`")}>{english ? "Inline code" : "行内代码"}</button>
        <button type="button" className={actionButtonClass} onClick={() => wrapSelection("```\n", "\n```")}>{english ? "Code block" : "代码块"}</button>
        {newsMedia && <label className={`${buttonClass} cursor-pointer focus-within:outline`}>
          {uploading ? (english ? "Uploading…" : "上传中…") : (english ? "Insert image or video" : "插入图片或视频")}
          <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" disabled={uploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void insertNewsMedia(file);
            }} />
        </label>}
      </div>
      {uploadError && <p role="alert">{uploadError}</p>}
      <textarea
        ref={textareaRef}
        name={name}
        id={id}
        aria-label={ariaLabel}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        data-emoji-picker={emojiPicker ? "on" : undefined}
        className={className ?? "min-h-48 w-full rounded-xl border border-[var(--enhe-border,#d8d8d8)] bg-white p-3 text-[var(--enhe-text,#080808)]"}
      />
    </div>
  );
}
