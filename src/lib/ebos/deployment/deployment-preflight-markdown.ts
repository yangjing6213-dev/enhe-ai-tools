import type {
  EbosProductionDeploymentPlanReport,
  EbosProductionDeploymentPreflightReport
} from "./deployment-types";

export function renderProductionDeploymentPreflightMarkdown(report: EbosProductionDeploymentPreflightReport) {
  return [
    "# ENHE Production Deployment Preflight Report",
    "",
    "## 1. 部署前结论",
    list([
      `targetDate: ${report.targetDate}`,
      `siteUrl: ${report.siteUrl}`,
      `readinessScore: ${report.readinessScore}`,
      `readinessStatus: ${report.readinessStatus}`,
      "本报告只做只读预检和部署计划，不声称已部署，不打印 secret。"
    ]),
    "",
    "## 2. 本次要上线的内容",
    list(report.validationRoutes.map((route) => `Validation route: ${route}`)),
    "",
    "## 3. 构建与质量检查",
    list(report.buildChecks.map(formatCheck)),
    "",
    "## 4. 路由检查",
    list(report.routeChecks.map(formatCheck)),
    "",
    "## 5. 环境变量键名检查",
    list(report.environmentChecks.map(formatCheck)),
    "",
    "## 6. Docker / Nginx / 部署配置检查",
    list([
      `Dockerfile: ${report.configSummary.dockerfileDetected}`,
      `Docker Compose: ${report.configSummary.dockerComposeDetected}`,
      `Nginx config: ${report.configSummary.nginxConfigDetected}`,
      `Deploy docs: ${report.configSummary.deployDocsDetected}`,
      ...report.dockerChecks.map(formatCheck),
      ...report.nginxChecks.map(formatCheck)
    ]),
    "",
    "## 7. 部署命令计划",
    list([
      ...report.deploymentPlan.localCommands.map(formatCommand),
      ...report.deploymentPlan.serverCommands.map(formatCommand),
      ...report.deploymentPlan.dockerCommands.map(formatCommand)
    ]),
    "",
    "## 8. 上线后 Smoke Test",
    list([
      ...report.postDeploySmokeTests.map(formatCheck),
      ...report.deploymentPlan.verificationCommands.map(formatCommand)
    ]),
    "",
    "## 9. 回滚方案",
    list([
      report.rollbackPlan.rollbackStrategy,
      ...report.rollbackPlan.filesToRevert.map((file) => `Review rollback file: ${file}`),
      ...report.rollbackPlan.dataSafetyNotes
    ]),
    "",
    "## 10. 风险与阻塞项",
    list([...report.blockers, ...report.warnings]),
    "",
    "## 11. 下一步操作",
    list(report.nextActions ?? [])
  ].join("\n");
}

export function renderProductionDeploymentPlanMarkdown(report: EbosProductionDeploymentPlanReport) {
  return [
    "# ENHE Production Deployment Plan",
    "",
    `- targetDate: ${report.targetDate}`,
    `- siteUrl: ${report.siteUrl}`,
    `- preflightStatus: ${report.preflightStatus ?? "unknown"}`,
    "",
    "## Local Commands",
    list(report.deploymentPlan.localCommands.map(formatCommand)),
    "",
    "## Server Commands",
    list(report.deploymentPlan.serverCommands.map(formatCommand)),
    "",
    "## Docker Commands",
    list(report.deploymentPlan.dockerCommands.map(formatCommand)),
    "",
    "## Verification Commands",
    list(report.deploymentPlan.verificationCommands.map(formatCommand)),
    "",
    "## Rollback Steps",
    list([
      report.rollbackPlan.rollbackStrategy,
      ...report.rollbackPlan.commands,
      ...report.rollbackPlan.dataSafetyNotes
    ]),
    "",
    "## User Confirmations",
    list(report.userConfirmations),
    "",
    "## Warnings",
    list(report.warnings)
  ].join("\n");
}

function formatCheck(item: { status: string; title: string; evidence: string; command?: string }) {
  return `${item.status} | ${item.title} | ${item.command ?? item.evidence}`;
}

function formatCommand(item: { status: string; title: string; command?: string; notes: string }) {
  return `${item.status} | ${item.title} | ${item.command ?? item.notes}`;
}

function list(items: string[] = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
