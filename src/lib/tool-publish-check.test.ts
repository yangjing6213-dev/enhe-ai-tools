import { describe, expect, it } from "vitest";
import { getToolPublishIssues } from "@/lib/tool-publish-check";

const baseTool = {
  type: "software" as const,
  categoryId: "cat-1",
  shortDescription: "Short",
  content: "Content",
  coverImage: "/cover.jpg",
  downloadFileId: "file-1",
  downloadFile: { filePath: "https://example.com/app.zip", fileUrl: "https://example.com/app.zip" },
  downloadFileUrl: null,
  onlineUrl: null,
  isDownloadPaid: false,
  downloadPrice: 0
};

describe("getToolPublishIssues", () => {
  it("requires software download-link content before publishing confidently", () => {
    expect(getToolPublishIssues({ ...baseTool, downloadFileId: null, downloadFile: null })).toContain("未填写下载链接");
  });

  it("accepts a direct software download URL as a publishable download source", () => {
    expect(getToolPublishIssues({ ...baseTool, downloadFileId: null, downloadFile: null, downloadFileUrl: "https://example.com/app.zip" })).not.toContain("未填写下载链接");
  });

  it("does not require account services to configure an online URL", () => {
    expect(getToolPublishIssues({ ...baseTool, type: "online", downloadFileId: null, onlineUrl: null })).not.toContain("未配置在线地址");
  });

  it("requires positive price for paid downloads", () => {
    expect(getToolPublishIssues({ ...baseTool, isDownloadPaid: true, downloadPrice: 0 })).toContain("付费下载价格需大于 0");
  });

  it("returns no issues for a complete software tool", () => {
    expect(getToolPublishIssues(baseTool)).toEqual([]);
  });

  const baseCourse = {
    type: "skill_learning" as const,
    categoryId: "cat-1",
    shortDescription: "A course on AI prompting",
    content: "Full course content here",
    coverImage: "/cover.jpg",
    downloadFileId: null,
    downloadFile: null,
    downloadFileUrl: null,
    onlineUrl: null,
    isDownloadPaid: false,
    downloadPrice: 0,
    tutorials: [] as { id: string; title: string }[]
  };

  it("skill_learning course without tutorials has publish issue", () => {
    const issues = getToolPublishIssues(baseCourse);
    expect(issues).toContain("缺少教程内容");
  });

  it("skill_learning course with tutorials is publishable", () => {
    const issues = getToolPublishIssues({ ...baseCourse, tutorials: [{ id: "t1", title: "Getting Started" }] });
    expect(issues).toEqual([]);
  });

  it("skill_learning does not require download link", () => {
    const issues = getToolPublishIssues(baseCourse);
    expect(issues).not.toContain("未填写下载链接");
  });
});
