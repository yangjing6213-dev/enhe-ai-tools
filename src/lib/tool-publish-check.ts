export type ToolPublishCheckInput = {
  type: "software" | "online" | "skill_learning";
  categoryId: string | null;
  shortDescription: string | null;
  content: string | null;
  coverImage: string | null;
  downloadFileId: string | null;
  downloadFile?: { filePath: string; fileUrl: string | null } | null;
  downloadFileUrl?: string | null;
  onlineUrl: string | null;
  isDownloadPaid: boolean;
  downloadPrice: unknown;
  tutorials?: { id: string; title: string }[];
};

export function getToolPublishIssues(tool: ToolPublishCheckInput) {
  const issues: string[] = [];

  if (!tool.categoryId) issues.push("未选择分类");
  if (!tool.coverImage?.trim()) issues.push("未设置封面图");
  if (!tool.shortDescription?.trim()) issues.push("未填写简介");
  if (!tool.content?.trim()) issues.push("未填写详细介绍");

  const directDownloadContent = tool.downloadFile?.fileUrl || tool.downloadFile?.filePath || "";
  if (tool.type === "skill_learning") {
    const hasTutorials = Array.isArray(tool.tutorials) && tool.tutorials.length > 0;
    if (!hasTutorials) issues.push("缺少教程内容");
    return issues;
  }
  if (tool.type === "software" && !directDownloadContent.trim() && !tool.downloadFileUrl?.trim()) issues.push("未填写下载链接");
  if (tool.type === "software" && tool.isDownloadPaid && Number(tool.downloadPrice) <= 0) {
    issues.push("付费下载价格需大于 0");
  }

  return issues;
}
