import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextEditor, wrapTextSelection } from "./rich-text-editor";
import { RichTextContent } from "./rich-text-content";

Object.assign(globalThis, { React });

describe("rich text editor", () => {
  it("exposes localized formatting tools and keeps the named textarea in the form", () => {
    const html = renderToStaticMarkup(<RichTextEditor name="content" locale="zh" required maxLength={5000} />);
    for (const label of ["加粗", "字号", "超链接", "背景色", "行内代码", "代码块"]) expect(html).toContain(label);
    expect(html.match(/rich-text-editor__action/g)).toHaveLength(4);
    expect(html).toContain('name="content"');
    expect(html).toContain("maxLength=");
  });

  it("offers the same formatting actions in English", () => {
    const html = renderToStaticMarkup(<RichTextEditor name="englishContent" locale="en" />);
    for (const label of ["Bold", "Size", "Link", "Highlight", "Inline code", "Code block"]) expect(html).toContain(label);
    expect(html.match(/rich-text-editor__action/g)).toHaveLength(4);
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
});
