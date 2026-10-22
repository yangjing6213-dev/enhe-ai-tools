import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiWorkflowReviewPreview } from "./review-preview";

const headings = {
  zh: ["项目简介", "项目使用场景", "项目作用与解决的问题", "项目使用方法", "项目安装方法"],
  en: ["Project overview", "Use cases", "What it does and problems it solves", "How to use", "Installation"],
};
const presentation = {
  zh: { name: "中文项目", shortDescription: "中文简介", content: headings.zh.map((heading) => `## ${heading}\n中文内容。`).join("\n\n") },
  en: { name: "English project", shortDescription: "English summary", content: headings.en.map((heading) => `## ${heading}\nEnglish content.`).join("\n\n") },
  cover: { url: "/api/ai-workflows/covers/ai-workflow-123-demo", source: "generated" },
};
const tool = { slug: "ai-workflow-123-demo", name: "当前已编辑标题", englishName: "Edited title", shortDescription: "[[zh]]人工编辑中文摘要[[/zh]]\n[[en]]Edited English summary[[/en]]", content: "[[zh]]## 项目简介\n人工编辑正文[[/zh]]\n[[en]]## Project overview\nEdited content[[/en]]", coverImage: presentation.cover.url };

describe("admin workflow review preview", () => {
  beforeEach(() => vi.stubGlobal("React", React));
  afterEach(() => vi.unstubAllGlobals());

  it("shows the current editable draft in both languages without leaking block syntax", () => {
    const html = renderToStaticMarkup(<AiWorkflowReviewPreview tool={tool} repository="example/demo" />);
    expect(html).toContain("当前已编辑标题"); expect(html).toContain("人工编辑中文摘要"); expect(html).toContain("Edited English summary");
    expect(html).toContain("人工编辑正文"); expect(html).toContain("Edited content");
    expect(html).not.toContain("[[zh]]"); expect(html).not.toContain("[[en]]");
    expect(html).toContain("data:image/svg+xml;base64,"); expect(html).not.toContain('/api/ai-workflows/covers/');
    expect(html).toContain("AI 辅助整理"); expect(html).toContain("安装方法不等于已实际验证");
  });

  it("shows the pending upgrade presentation, including every section, before approval", () => {
    const html = renderToStaticMarkup(<AiWorkflowReviewPreview tool={tool} repository="example/demo" pendingReport={{ presentation }} />);
    expect(html).toContain("中文项目"); expect(html).toContain("English project"); expect(html).not.toContain("人工编辑正文");
    for (const heading of [...headings.zh, ...headings.en]) expect(html).toContain(`>${heading}</h3>`);
  });
});
