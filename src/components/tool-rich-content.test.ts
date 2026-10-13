import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ToolRichContent } from "@/components/tool-rich-content";

describe("ToolRichContent authored formatting", () => {
  it("keeps line breaks, spaces, literal list markers and emoji without adding headings", () => {
    vi.stubGlobal("React", React);
    const content = "Hello 👨‍👩‍👧‍👦\n\n  Steps:\n1. Download ✅\n2. Open 👍🏽\n\n\n  Done";
    const html = renderToStaticMarkup(React.createElement(ToolRichContent, { content }));
    expect(html).toContain(content);
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).not.toContain("<h3");
    expect(html).not.toContain("<ol");
  });
  it("keeps clickable URLs and escapes authored HTML", () => {
    vi.stubGlobal("React", React);
    const html = renderToStaticMarkup(React.createElement(ToolRichContent, { content: 'Hi ✅\nhttps://example.test/file?x=1&y=2\n<script>alert(1)</script>' }));
    expect(html).toContain('href="https://example.test/file?x=1&amp;y=2"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
