import { describe, expect, it } from "vitest";

import { AI_WORKFLOW_CATEGORIES, filterAiWorkflowCategories } from "./workflow-catalog";

describe("AI Workflow direction catalog", () => {
  it("keeps the ten application directions from the supplied reference", () => {
    expect(AI_WORKFLOW_CATEGORIES.map(({ label }) => label.zh)).toEqual([
      "工作效率",
      "视频生成",
      "内容创作",
      "编程开发",
      "学习教育",
      "搜索研究",
      "营销销售",
      "办公自动化",
      "情感陪伴",
      "财务法律辅助",
    ]);
    expect(new Set(AI_WORKFLOW_CATEGORIES.map(({ slug }) => slug)).size).toBe(10);
  });

  it("searches the direction name and its task examples without changing the source list", () => {
    const result = filterAiWorkflowCategories(AI_WORKFLOW_CATEGORIES, "会议纪要", "zh");

    expect(result.map(({ slug }) => slug)).toEqual(["office-automation"]);
    expect(filterAiWorkflowCategories(AI_WORKFLOW_CATEGORIES, "  ", "zh")).toBe(AI_WORKFLOW_CATEGORIES);
  });
});
