import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiWorkflowContent } from "./workflow-content";

const headings = {
  zh: ["项目简介", "项目使用场景", "项目作用与解决的问题", "项目使用方法", "项目安装方法"],
  en: ["Project overview", "Use cases", "What it does and problems it solves", "How to use", "Installation"],
};

describe("workflow structured description", () => {
  beforeEach(() => vi.stubGlobal("React", React));
  afterEach(() => vi.unstubAllGlobals());

  it.each(["zh", "en"] as const)("renders all five %s headings as separate content sections", (locale) => {
    const content = headings[locale].map((heading, index) => `## ${heading}\n${locale === "zh" ? "项目内容" : "Project detail"} ${index + 1}`).join("\n\n");
    const html = renderToStaticMarkup(<AiWorkflowContent content={content} />);
    expect(html.match(/<h3(?:\s[^>]*)?>/g)).toHaveLength(5);
    expect(html.match(/<section(?:\s[^>]*)?>/g)).toHaveLength(5);
    for (const heading of headings[locale]) expect(html).toContain(`>${heading}</h3>`);
    expect(html).not.toContain("## ");
    expect(html).toContain(locale === "zh" ? "项目内容 5" : "Project detail 5");
  });

  it("retains source links, legacy paragraphs and escaped text without interpreting HTML", () => {
    const html = renderToStaticMarkup(<AiWorkflowContent content={'Legacy introduction.\n\n## Source and usage notes\nhttps://github.com/example/workflow\n<script>alert(1)</script>'} />);
    expect(html).toContain("Legacy introduction.");
    expect(html).toContain(">Source and usage notes</h3>");
    expect(html).toContain('href="https://github.com/example/workflow"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps an existing unstructured workflow description readable", () => {
    const html = renderToStaticMarkup(<AiWorkflowContent content="原有项目介绍。\n使用前请查看原仓库。" />);
    expect(html).toContain("原有项目介绍。");
    expect(html).toContain("使用前请查看原仓库。");
    expect(html).not.toContain("<h3");
  });
});
