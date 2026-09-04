import type {
  EbosDeploymentAuditedCommand,
  EbosDeploymentCommandAudit,
  EbosDeploymentOperatorChecklistItem,
  EbosDeploymentOperatorChecklistReport
} from "./deployment-operator-types";

export function renderDeploymentCommandAuditMarkdown(audit: EbosDeploymentCommandAudit) {
  return [
    "# ENHE Deployment Command Audit",
    "",
    `- commandsAudited: ${audit.commandsAudited}`,
    `- dangerousCommandsDetected: ${audit.dangerousCommandsDetected.length}`,
    `- migrationCommandsDetected: ${audit.migrationCommandsDetected.length}`,
    `- secretExposureRisks: ${audit.secretExposureRisks.length}`,
    `- manualRequiredCommands: ${audit.manualRequiredCommands.length}`,
    `- safeToProceed: ${audit.safeToProceed}`,
    "",
    "## Manual Required Commands",
    commandList(audit.manualRequiredCommands),
    "",
    "## Warnings",
    list(audit.warnings)
  ].join("\n");
}

export function renderDeploymentOperatorChecklistMarkdown(report: EbosDeploymentOperatorChecklistReport) {
  return [
    "# ENHE Production Deployment Operator Checklist",
    "",
    "## 1. 当前部署状态",
    `- currentDeploymentStatus: ${report.currentDeploymentStatus}`,
    `- approvedByUser: ${report.approvedByUser}`,
    "- 这表示已批准进入部署准备，但不表示生产已经完成部署。",
    "",
    "## 2. 本次部署范围",
    list(report.deploymentScope),
    "",
    "## 3. 命令安全审计",
    `- commandsAudited: ${report.commandAudit.commandsAudited}`,
    `- safeToProceed: ${report.commandAudit.safeToProceed}`,
    `- dangerousCommandsDetected: ${report.commandAudit.dangerousCommandsDetected.length}`,
    `- migrationCommandsDetected: ${report.commandAudit.migrationCommandsDetected.length}`,
    `- secretExposureRisks: ${report.commandAudit.secretExposureRisks.length}`,
    `- manualRequiredCommands: ${report.commandAudit.manualRequiredCommands.length}`,
    "",
    "## 4. 本地预检查步骤",
    checklist(report.operatorChecklist.filter((item) => item.phase === "local_precheck")),
    "",
    "## 5. 服务器部署步骤",
    checklist(report.operatorChecklist.filter((item) => item.phase === "server_deploy")),
    "",
    "## 6. Docker / Nginx 步骤",
    checklist(report.operatorChecklist.filter((item) => item.phase === "docker_restart" || item.phase === "nginx_reload")),
    "",
    "## 7. 上线后验证步骤",
    checklist(report.operatorChecklist.filter((item) => item.phase === "post_launch_check")),
    "",
    "## 8. 状态更新规则",
    list(report.statusUpdateTemplate.statusUpdateRules),
    "",
    "## 9. 回滚步骤",
    checklist(report.operatorChecklist.filter((item) => item.phase === "rollback")),
    "",
    "## 10. 禁止事项",
    list([
      "不要 SSH，除非用户明确提供可执行环境并再次确认。",
      "不要运行 Docker/Nginx/server 命令。",
      "不要打印 secret 或 .env 内容。",
      "不要运行 Prisma migration/reset/deploy。",
      "不要在 post-launch check 通过前写 verified。",
      "不要声称生产已经完成。"
    ]),
    "",
    "## 11. 下一步确认",
    list(report.nextActions),
    "",
    "## Blockers",
    list(report.blockers),
    "",
    "## Warnings",
    list(report.warnings)
  ].join("\n");
}

function checklist(items: EbosDeploymentOperatorChecklistItem[]) {
  if (items.length === 0) return "- none";
  return items.map((item) => [
    `- ${item.status} | ${item.actor} | ${item.title}`,
    `  - riskLevel: ${item.riskLevel}`,
    `  - approvalRequired: ${item.approvalRequired}`,
    ...(item.command ? [`  - command: ${redactCommand(item.command)}`] : []),
    `  - evidence: ${item.evidence}`
  ].join("\n")).join("\n");
}

function commandList(commands: EbosDeploymentAuditedCommand[]) {
  if (commands.length === 0) return "- none";
  return commands.map((command) => `- ${command.category} | ${redactCommand(command.command)}`).join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function redactCommand(command: string) {
  return /(\.env|printenv|^env$)/i.test(command) ? "[redacted secret-risk command]" : command;
}
