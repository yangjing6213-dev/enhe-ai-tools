import type {
  EbosDeploymentCommandResult,
  EbosProductionDeploymentExecutionReport
} from "./deployment-real-execution-types";

export function renderProductionDeploymentExecutionMarkdown(report: EbosProductionDeploymentExecutionReport) {
  return [
    "# ENHE Production Deployment Execution Report",
    "",
    "## 1. 当前执行状态",
    `- deploymentStatus: ${report.executionStatus.deploymentStatus}`,
    `- approvedByUser: ${report.executionStatus.approvedByUser}`,
    `- postLaunchCheckStatus: ${report.executionStatus.postLaunchCheckStatus}`,
    "",
    "## 2. 本地命令执行结果",
    commandResults(report.localCommandResults),
    "",
    "## 3. 服务器命令执行要求",
    commandResults(report.serverCommandResults),
    "",
    "## 4. Docker / Nginx 手工执行结果",
    commandResults([...report.dockerCommandResults, ...report.nginxCommandResults]),
    "",
    "## 5. 状态流转记录",
    `- previousStatus: ${report.statusTransition.previousStatus}`,
    `- nextStatus: ${report.statusTransition.nextStatus}`,
    `- updated: ${report.statusTransition.updated}`,
    `- reason: ${report.statusTransition.reason}`,
    `- backupPath: ${report.statusTransition.backupPath ?? "none"}`,
    `- forbiddenStatuses: ${report.statusTransition.forbiddenStatuses.join(", ")}`,
    "",
    "## 6. 阻塞项",
    list(report.blockers),
    "",
    "## 7. 下一步：服务器执行或上线后验证",
    `- postLaunchCheckAllowed: ${report.verificationReadiness.postLaunchCheckAllowed}`,
    `- reason: ${report.verificationReadiness.reason}`,
    `- command: ${report.verificationReadiness.command}`,
    "",
    "## 8. 回滚提示",
    list([
      "如果本地命令失败，保持 failed 并修复后重新审计。",
      "如果服务器命令失败，只执行 scoped rollback，不做数据库 reset。",
      "保留 reports/ebos 作为部署审计证据。"
    ]),
    "",
    "## 9. 安全边界",
    list([
      "Codex 不 SSH，除非用户后续明确提供可执行服务器环境和授权。",
      "Codex 不运行 server/docker/nginx 命令。",
      "Codex 不伪造服务器执行结果。",
      "post-launch check 通过前不得写 verified。",
      "不打印 secret 或 .env 内容。"
    ]),
    "",
    "## Warnings",
    list(report.warnings),
    "",
    "## Next Actions",
    list(report.nextActions)
  ].join("\n");
}

function commandResults(results: EbosDeploymentCommandResult[]) {
  if (results.length === 0) return "- none";
  return results.map((result) => [
    `- ${result.status} | ${result.environment} | ${result.command}`,
    `  - exitCode: ${result.exitCode ?? "n/a"}`,
    `  - summary: ${result.summary}`,
    ...(result.warnings.length > 0 ? [`  - warnings: ${result.warnings.join("; ")}`] : [])
  ].join("\n")).join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
