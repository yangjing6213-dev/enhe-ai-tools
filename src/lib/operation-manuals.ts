import { join, normalize, sep } from "node:path";

export type OperationManual = {
  slug: string;
  title: string;
  description: string;
  category: string;
  updatedAt: string;
  fileName: string;
};

export const operationManuals = [
  {
    slug: "geo-monthly-audit-operations",
    title: "月度 GEO 巡检操作说明",
    description: "记录 ChatGPT、Perplexity、Google、Bing、百度、豆包等平台的品牌可见度、官网引用和下一步内容动作。",
    category: "GEO 运营",
    updatedAt: "2026-06-21",
    fileName: "geo-monthly-audit-operations.html"
  },
  {
    slug: "enhe-gsc-seo-tutorial",
    title: "Google Search Console SEO 教程",
    description: "由原 PDF 逐页渲染为高清图片的 HTML 阅读版，用于后台查看 GSC 基础配置与提交操作。",
    category: "SEO 工具",
    updatedAt: "2026-06-21",
    fileName: "enhe-gsc-seo-tutorial.html"
  }
] as const satisfies readonly OperationManual[];

export const operationManualsRoot = join(process.cwd(), "docs", "operation-manuals");
const operationManualAssetsRoot = join(operationManualsRoot, "assets");

export function getOperationManualBySlug(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return operationManuals.find((manual) => manual.slug === slug) ?? null;
}

export function getOperationManualFilePath(manual: OperationManual) {
  return join(operationManualsRoot, manual.fileName);
}

export function getOperationManualAssetPath(assetPath: string) {
  const decodedPath = decodeURIComponent(assetPath).replaceAll("\\", "/");
  const normalizedPath = normalize(decodedPath);
  if (!decodedPath || decodedPath.startsWith("/") || normalizedPath.startsWith("..") || normalizedPath.includes(`..${sep}`)) {
    return null;
  }

  const fullPath = join(operationManualAssetsRoot, normalizedPath);
  const rootWithSeparator = `${operationManualAssetsRoot}${sep}`;
  return fullPath.startsWith(rootWithSeparator) ? fullPath : null;
}
