import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { insertMarkdownTableAtSelection, RichTextEditor, wrapTextSelection } from "./rich-text-editor";
import { RichTextContent } from "./rich-text-content";

Object.assign(globalThis, { React });

describe("rich text editor", () => {
  it("exposes localized formatting tools and keeps the named textarea in the form", () => {
    const html = renderToStaticMarkup(<RichTextEditor name="content" locale="zh" required maxLength={5000} />);
    for (const label of ["加粗", "字号", "超链接", "背景色", "行内代码", "代码块", "插入表格"]) expect(html).toContain(label);
    expect(html.match(/rich-text-editor__action/g)).toHaveLength(5);
    expect(html).toContain('name="content"');
    expect(html).toContain("maxLength=");
  });

  it("offers the same formatting actions in English", () => {
    const html = renderToStaticMarkup(<RichTextEditor name="englishContent" locale="en" />);
    for (const label of ["Bold", "Size", "Link", "Highlight", "Inline code", "Code block", "Insert table"]) expect(html).toContain(label);
    expect(html.match(/rich-text-editor__action/g)).toHaveLength(5);
    expect(html).toContain('name="englishContent"');
  });

  it("exposes a stable label on the editable textarea", () => {
    const html = renderToStaticMarkup(<RichTextEditor name="content" locale="zh" id="forum-post-content" ariaLabel="内容" />);
    expect(html).toContain('id="forum-post-content"');
    expect(html).toContain('aria-label="内容"');
  });

  it.each([
    { prefix: "**", suffix: "**", marker: "<strong><span>ENHE</span></strong>" },
    { prefix: "[[size=24]]", suffix: "[[/size]]", marker: "font-size:24px" },
    { prefix: "[[bg=#dbeafe]]", suffix: "[[/bg]]", marker: "background-color:#dbeafe" },
  ])("applies $prefix formatting and renders it in saved topic content", ({ prefix, suffix, marker }) => {
    const formatted = wrapTextSelection("ENHE", 0, 4, prefix, suffix, "文字");
    const html = renderToStaticMarkup(<RichTextContent content={formatted.value} />);

    expect(formatted.value).toBe(`${prefix}ENHE${suffix}`);
    expect(formatted.selectionStart).toBe(prefix.length);
    expect(formatted.selectionEnd).toBe(prefix.length + 4);
    expect(html).toContain(marker);
  });

  it("inserts an editable markdown table at the current selection", () => {
    let focused = false;
    let inputDispatched = false;
    const textareaStub: {
      value: string;
      selectionStart: number;
      selectionEnd: number;
      setRangeText(inserted: string, start: number, end: number): void;
      focus(): void;
      dispatchEvent(event: Event): boolean;
    } = {
      value: "前后",
      selectionStart: 1,
      selectionEnd: 1,
      setRangeText(inserted: string, start: number, end: number) {
        this.value = `${this.value.slice(0, start)}${inserted}${this.value.slice(end)}`;
        this.selectionStart = this.selectionEnd = start + inserted.length;
      },
      focus() { focused = true; },
      dispatchEvent(event: Event) { inputDispatched = event.type === "input"; return true; },
    };
    const textarea = textareaStub as unknown as HTMLTextAreaElement;

    insertMarkdownTableAtSelection(textarea, "zh");

    expect(textareaStub.value).toBe("前\n\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n\n后");
    expect(focused).toBe(true);
    expect(inputDispatched).toBe(true);
  });

  it("renders inserted markdown tables as accessible HTML tables", () => {
    const html = renderToStaticMarkup(<RichTextContent content={"| 名称 | 用途 |\n| --- | --- |\n| ENHE | AI 工具 |"} />);

    expect(html).toContain('<table class="rich-text-table">');
    expect(html).toContain("<th scope=\"col\"><span>名称</span></th>");
    expect(html).toContain("<td><span>AI 工具</span></td>");
  });
});
