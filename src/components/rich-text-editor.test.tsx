import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

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
});
