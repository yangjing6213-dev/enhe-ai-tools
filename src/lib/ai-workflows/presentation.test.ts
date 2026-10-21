import { describe, expect, it } from "vitest";
import {
  aiWorkflowPresentationSchema,
  buildAiWorkflowPresentationFields,
  buildAiWorkflowGeneratedCoverUrl,
} from "@/lib/ai-workflows/presentation";

const presentation = {
  zh: { name: "研究工作流", shortDescription: "整理公开资料的研究流程。", content: "项目介绍\n整理公开资料并汇总来源。" },
  en: { name: "Research workflow", shortDescription: "A workflow for organizing public research.", content: "Overview\nOrganize public research and summarize its sources." },
  cover: { url: "https://raw.githubusercontent.com/example/flow/abcdef/banner.png", source: "repository" as const, sourceUrl: "https://github.com/example/flow/blob/abcdef/README.md" },
};

describe("AI Workflow presentation contract", () => {
  it("stores both languages in the existing localized fields and retains the cover source", () => {
    const value = aiWorkflowPresentationSchema.parse(presentation);
    expect(buildAiWorkflowPresentationFields(value)).toEqual({
      name: "研究工作流",
      englishName: "Research workflow",
      shortDescription: "[[zh]]整理公开资料的研究流程。[[/zh]]\n[[en]]A workflow for organizing public research.[[/en]]",
      content: "[[zh]]项目介绍\n整理公开资料并汇总来源。[[/zh]]\n[[en]]Overview\nOrganize public research and summarize its sources.[[/en]]",
      coverImage: presentation.cover.url,
    });
  });

  it("accepts the local generated route and known static image origins", () => {
    const generated = buildAiWorkflowGeneratedCoverUrl("123", "Agent Flow");
    expect(generated).toBe("/api/ai-workflows/covers/ai-workflow-123-agent-flow");
    expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, cover: { url: generated, source: "generated" } }).success).toBe(true);
    for (const url of [
      "https://user-images.githubusercontent.com/123/cover.png",
      "https://github.com/user-attachments/assets/1234-5678",
      "https://static.enhe-tech.com.cn/ai-workflows/banner.webp",
      "https://enhe-static-1303691623.cos.ap-shanghai.myqcloud.com/ai-workflows/banner.png",
    ]) expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, cover: { ...presentation.cover, url } }).success).toBe(true);
  });

  it("rejects untrusted URLs, signed URLs, wrong sources and language block injection", () => {
    for (const url of [
      "https://attacker.example/banner.png",
      "https://raw.githubusercontent.com.attacker.example/banner.png",
      "https://username:secret@raw.githubusercontent.com/example/banner.png",
      "https://raw.githubusercontent.com:8443/example/banner.png",
      "https://raw.githubusercontent.com/example/banner.png?token=private",
      "https://github.com/example/flow/issues/1",
      "http://raw.githubusercontent.com/example/banner.png",
      "//raw.githubusercontent.com/example/banner.png",
      "/api/internal/private",
    ]) expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, cover: { ...presentation.cover, url } }).success).toBe(false);
    expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, cover: { url: presentation.cover.url, source: "generated" } }).success).toBe(false);
    expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, en: { ...presentation.en, content: "[[/zh]] injected" } }).success).toBe(false);
    expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, zh: { ...presentation.zh, content: "" } }).success).toBe(false);
    expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, en: { ...presentation.en, content: "x".repeat(14001) } }).success).toBe(false);
    for (const content of ["<script>alert(1)</script>", "[Click](javascript:alert)", "API_KEY=private-value", "English title, 中文正文"]) {
      expect(aiWorkflowPresentationSchema.safeParse({ ...presentation, en: { ...presentation.en, content } }).success).toBe(false);
    }
  });
});
