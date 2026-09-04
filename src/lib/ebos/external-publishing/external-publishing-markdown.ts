import type {
  EbosExternalChannelPublishAsset,
  EbosExternalDataBackfillReport,
  EbosExternalPublishingPack
} from "./external-publishing-types";

const CHANNEL_HEADINGS: Record<string, string> = {
  xianyu: "## 3. 闲鱼发布包",
  taobao: "## 4. 淘宝发布包",
  whop: "## 5. Whop 发布包",
  xiaohongshu: "## 6. 小红书发布包",
  wechat: "## 7. 微信发布包",
  manual_outreach: "## 8. 人工触达话术",
  other: "## Other Channel"
};

export function renderExternalPublishingPackMarkdown(pack: EbosExternalPublishingPack) {
  const assets = new Map(pack.publishAssets.map((asset) => [asset.channel, asset]));

  return [
    "# ENHE External Channel Publishing Pack",
    "",
    "## 1. 当前状态",
    `- targetDate: ${pack.targetDate}`,
    `- generatedAt: ${pack.generatedAt}`,
    `- channels: ${pack.channels.length}`,
    `- publishAssets: ${pack.publishAssets.length}`,
    "- 数据原则：不伪造外部浏览、点击、收藏、私信、订单、收入、退款或反馈。",
    "",
    "## 2. 已验证的落地页",
    list(pack.verifiedLandingPages),
    "",
    ...pack.channels.flatMap((channel) => renderAssetSection(assets.get(channel))),
    "",
    "## 9. 数据记录字段",
    ...pack.channels.flatMap((channel) => [
      `- ${channel}: ${pack.trackingFields[channel].join(", ")}`
    ]),
    "",
    "## 10. 回填流程",
    "- 用户先在真实外部平台手动发布或触达。",
    "- 用户把真实 publishedUrl、views、clicks、messages、orders、revenue、refunds 和 feedback 填入 result input。",
    "- Codex 先运行 check 和 dry-run backfill。",
    "- 只有 hasRealSignals=true、canBackfill=true 且显式 --apply 时才写入 external intake。",
    "",
    "## 11. 下一步命令",
    list(pack.nextCommands),
    "",
    "## Safety Warnings",
    list(pack.safetyWarnings)
  ].join("\n");
}

export function renderExternalDataBackfillReportMarkdown(report: EbosExternalDataBackfillReport) {
  return [
    "# ENHE External Channel Data Backfill Report",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- dryRun: ${String(report.dryRun)}`,
    `- applied: ${String(report.applied)}`,
    `- hasRealSignals: ${String(report.validation.hasRealSignals)}`,
    `- canBackfill: ${String(report.validation.canBackfill)}`,
    `- publishCoverage: ${report.validation.publishCoverage}`,
    `- dataCoverage: ${report.validation.dataCoverage}`,
    report.backupPath ? `- backupPath: ${report.backupPath}` : "- backupPath: none",
    "",
    "## Summary",
    report.summary,
    "",
    "## Inputs",
    `- publish result input: ${report.inputPath}`,
    `- external intake input: ${report.externalIntakeInputPath}`,
    "",
    "## Mapped Records",
    `- mappedRecordsCount: ${report.mappedRecordsCount}`,
    `- mergedRecordsCount: ${report.mergedRecordsCount}`,
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Safety",
    "- No external data was invented.",
    "- No platform login, SSH, server, Docker, Nginx, Prisma migration, or dependency install was performed."
  ].join("\n");
}

function renderAssetSection(asset: EbosExternalChannelPublishAsset | undefined) {
  if (!asset) return [];
  return [
    CHANNEL_HEADINGS[asset.channel] ?? `## ${asset.channel}`,
    `- title: ${asset.title}`,
    `- language: ${asset.language}`,
    `- urlToPromote: ${asset.urlToPromote}`,
    asset.priceSuggestion ? `- priceSuggestion: ${asset.priceSuggestion}` : "",
    `- CTA: ${asset.callToAction}`,
    "",
    "### 简介",
    asset.shortDescription,
    "",
    "### 详情文案",
    asset.longDescription,
    "",
    "### 标签",
    list(asset.tags),
    "",
    "### 合规提示",
    asset.complianceNotice,
    "",
    "### 最小发布动作",
    asset.userMinimumAction,
    "",
    "### 发布步骤",
    list(asset.publishSteps),
    "",
    "### 需要记录的数据",
    list(asset.dataFieldsToRecord),
    "",
    "### Warnings",
    list(asset.warnings),
    ""
  ].filter((line) => line !== "");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
