import type {
  EbosValidationLaunchExecutionReport,
  EbosValidationPostLaunchCheckReport
} from "./validation-launch-execution-types";

export function renderValidationLaunchExecutionMarkdown(report: EbosValidationLaunchExecutionReport) {
  return [
    "# ENHE Validation Launch Execution Report",
    "",
    "## 1. 当前发布状态",
    list([
      `targetDate: ${report.targetDate}`,
      `generatedAt: ${report.generatedAt}`,
      `launchStatus: ${report.launchStatus}`,
      `readinessReportPath: ${report.readinessReportPath ?? "not provided"}`,
      `runbookPath: ${report.runbookPath ?? "not provided"}`,
      "Codex 可以执行发布前检查、报告生成、dry-run 和数据回填整理。",
      "用户必须确认真实部署、外部平台发布和真实数据来源。",
      "不伪造数据：浏览、点击、消息、订单、收入、退款、反馈都只能来自真实观察。"
    ]),
    "",
    "## 2. 发布前检查清单",
    list(report.deploymentChecklist.map((item) => `${item.status} | ${item.category} | ${item.title} | ${item.command ?? item.evidence}`)),
    "",
    "## 3. 验证页路由",
    list(report.deploymentChecklist
      .filter((item) => item.category === "route")
      .map((item) => `${item.title}: ${item.evidence}`)),
    "",
    "## 4. SEO/GEO 与 CTA Tracking",
    list(report.deploymentChecklist
      .filter((item) => item.category === "seo" || item.category === "tracking")
      .map((item) => `${item.title}: ${item.evidence}`)),
    "",
    "## 5. 外部平台复制发布包",
    list(report.externalPublishPack.map((asset) => `${asset.channel}: ${asset.title}; 用户动作: ${asset.requiredUserAction}; 记录字段: ${asset.dataFieldsToRecord.join(", ")}`)),
    "",
    "## 6. 上线后 Smoke Test",
    list(report.smokeTestPlan.map((item) => `${item.status} | ${item.checkType} | ${item.url} | expected=${item.expectedStatus} | ${item.notes}`)),
    "",
    "## 7. 外部数据回填流程",
    list(report.dataIntakeWorkflow.map((step) => `${step.owner}: ${step.title}${step.command ? ` - ${step.command}` : ""}`)),
    "",
    "## 8. Codex 可执行步骤",
    list(report.codexExecutableSteps.map((step) => `${step.title}: ${step.command ?? step.description}`)),
    "",
    "## 9. 用户最少动作",
    list(report.userMinimumActions),
    "",
    "## 10. 回滚方案",
    list(report.deploymentChecklist
      .filter((item) => item.category === "rollback")
      .map((item) => `${item.title}: ${item.evidence}`)),
    "",
    "## 11. 下一步命令",
    list(report.nextCommands),
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Blockers",
    list(report.blockers)
  ].join("\n");
}

export function renderValidationPostLaunchCheckMarkdown(report: EbosValidationPostLaunchCheckReport) {
  return [
    "# ENHE Validation Post-Launch Check",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- siteUrl: ${report.siteUrl}`,
    `- dryRun: ${report.dryRun}`,
    `- status: ${report.status}`,
    "",
    "## Checks",
    list(report.checks.map((check) => `${check.status} | ${check.checkType} | ${check.url} | expected=${check.expectedStatus}${check.actualStatus ? ` | actual=${check.actualStatus}` : ""} | ${check.notes}`)),
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Next Actions",
    list(report.nextActions)
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
