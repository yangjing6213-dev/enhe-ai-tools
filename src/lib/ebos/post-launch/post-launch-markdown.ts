import type {
  EbosPostLaunchCheckItem,
  EbosPostLaunchLiveCheckReport
} from "./post-launch-types";

export function renderPostLaunchLiveCheckMarkdown(report: EbosPostLaunchLiveCheckReport) {
  return [
    "# ENHE Post-launch Live Check Report",
    "",
    "## 1. 验证结论",
    `- overallStatus: ${report.overallStatus}`,
    `- canTransitionToVerified: ${report.canTransitionToVerified}`,
    `- 是否进入 verified: ${report.statusTransition.updated && report.statusTransition.nextStatus === "verified" ? "yes" : "no"}`,
    "",
    "## 2. 当前部署状态",
    `- currentDeploymentStatus: ${report.currentDeploymentStatus}`,
    `- previousStatus: ${report.statusTransition.previousStatus}`,
    `- nextStatus: ${report.statusTransition.nextStatus}`,
    `- transitionUpdated: ${report.statusTransition.updated}`,
    `- reason: ${report.statusTransition.reason}`,
    report.statusTransition.backupPath ? `- backupPath: ${report.statusTransition.backupPath}` : "- backupPath: none",
    "",
    "## 3. 检查的线上 URL",
    ...report.routeResults.map((result) => `- ${result.route}: ${result.url}`),
    "",
    "## 4. HTTP 状态检查",
    ...report.routeResults.map((result) => `- ${result.route}: HTTP ${result.httpStatus}, ok=${result.ok}, finalUrl=${result.finalUrl ?? result.url}`),
    "",
    "## 5. 页面内容检查",
    ...report.routeResults.flatMap((result) => [
      `### ${result.route}`,
      renderItems(result.contentChecks)
    ]),
    "",
    "## 6. CTA / FAQ / 合规提示检查",
    ...report.routeResults.flatMap((result) => [
      `### ${result.route}`,
      "CTA:",
      renderItems(result.ctaChecks),
      "FAQ:",
      renderItems(result.faqChecks),
      "合规提示:",
      renderItems(result.complianceChecks)
    ]),
    "",
    "## 7. Metadata 检查",
    ...report.routeResults.flatMap((result) => [
      `### ${result.route}`,
      renderItems(result.metadataChecks)
    ]),
    "",
    "## 8. 状态流转",
    `- previousStatus: ${report.statusTransition.previousStatus}`,
    `- nextStatus: ${report.statusTransition.nextStatus}`,
    `- updated: ${report.statusTransition.updated}`,
    `- reason: ${report.statusTransition.reason}`,
    report.statusTransition.backupPath ? `- backupPath: ${report.statusTransition.backupPath}` : "- backupPath: none",
    "",
    "## 9. 阻塞项与警告",
    "Blockers:",
    list(report.blockers),
    "",
    "Warnings:",
    list([...report.warnings, ...report.statusTransition.warnings]),
    "",
    "## 10. 下一步操作",
    list(report.nextActions)
  ].join("\n");
}

function renderItems(items: EbosPostLaunchCheckItem[]) {
  if (items.length === 0) return "- none";
  return items.map((item) => [
    `- [${item.status}] ${item.title}`,
    `  - expected: ${item.expected}`,
    `  - actual: ${item.actual}`,
    `  - evidence: ${item.evidence || "none"}`
  ].join("\n")).join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
