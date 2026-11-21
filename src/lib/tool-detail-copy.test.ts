import { describe, expect, it } from "vitest";
import { getToolOverviewHeading, getWorkflowDeliveryCopy } from "./tool-detail-copy";

describe("tool detail overview heading", () => {
  it.each([
    ["software", "zh", "工具介绍"],
    ["ai_skill", "zh", "技能说明"],
    ["skill_learning", "zh", "课程介绍"],
    ["ai_workflow", "zh", "项目介绍"],
    ["online", "zh", "服务介绍"],
    ["software", "en", "Tool Overview"],
    ["ai_skill", "en", "Skill Overview"],
    ["skill_learning", "en", "Course Overview"],
    ["ai_workflow", "en", "Project Overview"],
    ["online", "en", "Service Overview"],
  ] as const)("uses a content-type-specific title for %s in %s", (type, locale, expected) => {
    expect(getToolOverviewHeading(type, locale)).toBe(expected);
  });
});

describe("repository-only workflow delivery copy", () => {
  it("distinguishes the original repository, source archive, and installer status in Chinese", () => {
    expect(getWorkflowDeliveryCopy("zh")).toEqual({
      originalProject: "查看原项目",
      sourceArchive: "下载上游源码 ZIP（需自行部署）",
      noVerifiedInstaller: "未提供已验证安装包；运行方式和部署要求请查看原仓库说明。",
      delivery: "原仓库链接与上游源码 ZIP；需自行部署",
    });
  });

  it("distinguishes the original repository, source archive, and installer status in English", () => {
    expect(getWorkflowDeliveryCopy("en")).toEqual({
      originalProject: "View Original Project",
      sourceArchive: "Download Source ZIP — Deployment Required",
      noVerifiedInstaller: "No verified installer is provided. Check the upstream repository for setup and deployment requirements.",
      delivery: "Upstream repository and source ZIP; deployment required",
    });
  });
});
