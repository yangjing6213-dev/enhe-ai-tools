import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { EbosExternalPublishAsset } from "./validation-launch-execution-types";

const COMMON_WARNINGS = [
  "Codex cannot log in to external platforms.",
  "Codex cannot fabricate views, clicks, messages, orders, revenue, refunds, or user feedback.",
  "Only real user-provided external platform results may be written back to EBOS."
];

export async function buildExternalPublishPack(options: {
  targetDate: string | Date;
  assetsDir?: string;
}): Promise<EbosExternalPublishAsset[]> {
  const targetDate = toDateKey(options.targetDate);
  const assetsDir = options.assetsDir ?? "docs/ebos/validation-assets";
  const marketplacePath = join(assetsDir, `${targetDate}-ai-prompt-kit-marketplace-listings.md`).replace(/\\/g, "/");
  const socialPath = join(assetsDir, `${targetDate}-social-promotion-copy.md`).replace(/\\/g, "/");
  const marketplaceSummary = await readAssetSummary(marketplacePath);
  const socialSummary = await readAssetSummary(socialPath);

  return [
    asset({
      channel: "xianyu",
      sourceAssetPath: marketplacePath,
      title: "AI Prompt Kit marketplace listing for Xianyu",
      copySummary: marketplaceSummary,
      requiredUserAction: "Copy the prepared title, description, FAQ, price test, and delivery notes into Xianyu manually.",
      dataFieldsToRecord: ["views", "messages", "orders", "revenue", "refundCount", "userFeedback"]
    }),
    asset({
      channel: "taobao",
      sourceAssetPath: marketplacePath,
      title: "AI Prompt Kit Taobao listing structure",
      copySummary: marketplaceSummary,
      requiredUserAction: "Copy the product title, detail-page structure, after-sales notes, and compliance copy into Taobao manually.",
      dataFieldsToRecord: ["views", "clicks", "messages", "orders", "revenue", "refundCount", "userFeedback"]
    }),
    asset({
      channel: "whop",
      sourceAssetPath: marketplacePath,
      title: "AI Prompt Kit Whop listing",
      copySummary: marketplaceSummary,
      requiredUserAction: "Copy the English title, description, delivery notes, content configuration, support notes, and pricing test into Whop manually.",
      dataFieldsToRecord: ["views", "clicks", "leads", "orders", "revenue", "refundCount", "userFeedback"]
    }),
    asset({
      channel: "xiaohongshu",
      sourceAssetPath: socialPath,
      title: "AI Prompt Kit Xiaohongshu notes",
      copySummary: socialSummary,
      requiredUserAction: "Choose one of the prepared note angles, publish it manually, and record only observed platform metrics.",
      dataFieldsToRecord: ["views", "saves", "shares", "messages", "leads"]
    }),
    asset({
      channel: "wechat",
      sourceAssetPath: socialPath,
      title: "AI Prompt Kit WeChat copy",
      copySummary: socialSummary,
      requiredUserAction: "Copy the prepared WeChat Moments, group, or direct-message copy manually and record only real replies.",
      dataFieldsToRecord: ["messages", "leads", "positiveReplies", "orders"]
    })
  ];
}

function asset(input: Omit<EbosExternalPublishAsset, "targetProductOrDirection" | "warnings">): EbosExternalPublishAsset {
  return {
    targetProductOrDirection: "AI Prompt Kit validation",
    warnings: COMMON_WARNINGS,
    ...input
  };
}

async function readAssetSummary(filePath: string) {
  try {
    const source = await readFile(filePath, "utf8");
    const lines = source
      .split(/\r?\n/)
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
    return lines.join(" ").slice(0, 700) || "Prepared validation asset is available for copy publishing.";
  } catch {
    return "Validation asset is missing or unreadable; regenerate validation assets before publishing.";
  }
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
