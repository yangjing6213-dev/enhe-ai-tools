import type {
  EbosValidationLaunchReadinessReport,
  EbosValidationLaunchRunbook
} from "./validation-launch-types";

export function renderValidationLaunchReadinessMarkdown(report: EbosValidationLaunchReadinessReport) {
  return [
    "# ENHE Validation Launch Readiness",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- readinessScore: ${report.readinessScore}`,
    `- readinessStatus: ${report.readinessStatus}`,
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Validation Pages",
    list(report.validationPages.map((page) => `${page.path}: exists=${page.exists}, CTA=${page.hasCTA}, tracking=${page.hasTrackingEvent}, metadata=${page.hasSeoMetadata}`)),
    "",
    "## Tracking Checks",
    list(report.trackingChecks.map((check) => `${check.eventName}: found=${check.found}`)),
    "",
    "## Asset Checks",
    list(report.assetFiles.map((asset) => `${asset.filePath}: ready=${asset.readyForUse}`)),
    "",
    "## External Intake Checks",
    list(report.externalIntakeChecks.map((check) => `${check.key}: exists=${check.exists}, readyForUse=${check.readyForUse}`)),
    "",
    "## Next Actions",
    list(report.nextActions)
  ].join("\n");
}

export function renderValidationLaunchRunbookMarkdown(runbook: EbosValidationLaunchRunbook) {
  const readiness = runbook.readinessReport;

  return [
    "# ENHE Validation Launch Operator Runbook",
    "",
    "## 1. 发布目标",
    runbook.launchObjective,
    "",
    "## 2. 当前准备状态",
    readiness
      ? list([
          `readinessStatus=${readiness.readinessStatus}`,
          `readinessScore=${readiness.readinessScore}`,
          `blockers=${readiness.blockers.length}`,
          `warnings=${readiness.warnings.length}`
        ])
      : "- 尚未读取 readiness report。先运行 readiness check。",
    "",
    "## 3. 验证页检查",
    readiness
      ? list(readiness.validationPages.map((page) => `${page.path}: exists=${page.exists}, hero=${page.hasHero}, summary=${page.hasSummary}, CTA=${page.hasCTA}, FAQ=${page.hasFAQ}, compliance=${page.hasComplianceNotice}, tracking=${page.hasTrackingEvent}, metadata=${page.hasSeoMetadata}`))
      : "- 运行 readiness check 后查看 validationPages。",
    "",
    "## 4. CTA Tracking 检查",
    readiness
      ? list(readiness.trackingChecks.map((check) => `${check.eventName}: found=${check.found}`))
      : "- 运行 readiness check 后查看 trackingChecks。",
    "",
    "## 5. 验证素材检查",
    readiness
      ? list(readiness.assetFiles.map((asset) => `${asset.purpose}: ready=${asset.readyForUse}`))
      : "- 使用 docs/ebos/validation-assets 中的发布素材。",
    "",
    "## 6. 外部渠道发布步骤",
    list(runbook.externalChannelSteps.map((step) => `${step.title}: ${step.description}`)),
    "",
    "## 7. 数据填报与导入步骤",
    list(runbook.dataIntakeSteps.map((step) => `${step.title}: ${step.command ?? step.description}`)),
    "",
    "## 8. Codex 可执行命令",
    list([
      ...runbook.codexSteps.map((step) => step.command ?? step.description),
      ...runbook.postLaunchCommands
    ]),
    "",
    "## 9. 用户最少动作",
    list(runbook.userMinimumActions),
    "",
    "Codex 不会替你编造外部平台数据；用户只需要确认发布、复制文案、在真实发生数据后提供记录。",
    "",
    "## 10. 回滚与风险",
    list(runbook.rollbackNotes),
    "",
    "## 11. 下一步复盘",
    list([
      "发布后 24-72 小时收集真实 CTA、咨询、订单、退款和反馈。",
      "把外部渠道数据填入 external intake input。",
      "执行 dry-run import，确认无异常后 --apply。",
      "重新生成 validation / decision / weekly / monthly 报告。"
    ]),
    "",
    "## Warnings",
    list(runbook.warnings)
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
