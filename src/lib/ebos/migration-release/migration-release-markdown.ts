import type {
  EbosMigrationReleaseChecklistItem,
  EbosMigrationReleaseRiskAudit,
  EbosMigrationReleaseRunbook
} from "./migration-release-types";

export function renderMigrationReleaseRunbookMarkdown(runbook: EbosMigrationReleaseRunbook) {
  return [
    "# EBOS Migration Release Mode Runbook",
    "",
    "## 1. 当前结论",
    list([
      `targetDate: ${runbook.targetDate}`,
      "当前只是 runbook，不执行 migration，不运行 Prisma 命令，不打印 secret。",
      "页面、文案、报告、外部发布包、synthetic report 更新默认不需要 migration。"
    ]),
    "",
    "## 2. Migration Guard 规则",
    list([
      `migrationGuardVariable: ${runbook.migrationGuardVariable}`,
      `defaultMigrationBehavior: ${runbook.defaultMigrationBehavior}`,
      `explicitEnableValue: ${runbook.explicitEnableValue}`,
      "RUN_PRISMA_MIGRATE 不是 1 时，app entrypoint 必须跳过 prisma migrate deploy。"
    ]),
    "",
    "## 3. 什么时候允许 RUN_PRISMA_MIGRATE=1",
    list(runbook.allowedUseCases),
    "",
    "## 4. 什么时候禁止运行 migration",
    list(runbook.forbiddenUseCases),
    "",
    "## 5. 专用确认句",
    list([
      "专用确认句：确认执行数据库迁移",
      "确认执行真实部署命令 不等于允许 migration。",
      "确认部署验证页 不等于允许 migration。",
      "只有 确认执行数据库迁移 才允许进入 migration release mode。"
    ]),
    "",
    "## 6. 迁移前检查清单",
    list([
      ...runbook.approvalChecklist.map(formatChecklistItem),
      ...runbook.preMigrationChecklist.map(formatChecklistItem)
    ]),
    "",
    "## 7. 执行计划",
    list(runbook.executionPlan.map(formatChecklistItem)),
    "",
    "## 8. 迁移后验证",
    list(runbook.postMigrationVerification.map(formatChecklistItem)),
    "",
    "## 9. 回滚方案",
    list(runbook.rollbackPlan.map(formatChecklistItem)),
    "",
    "## 10. 风险与阻塞项",
    list(runbook.warnings),
    "",
    "## 11. 下一步操作",
    list(runbook.nextActions)
  ].join("\n");
}

export function renderMigrationReleaseRiskAuditMarkdown(audit: EbosMigrationReleaseRiskAudit) {
  return [
    "# EBOS Migration Release Risk Audit",
    "",
    "## 当前结论",
    list([
      `targetDate: ${audit.targetDate}`,
      `safeToRunMigration: ${audit.safeToRunMigration}`,
      `migrationFilesDetected: ${audit.migrationFilesDetected.length}`,
      `backupEvidenceRequired: ${audit.backupEvidenceRequired}`,
      `approvalRequired: ${audit.approvalRequired}`,
      "This audit is read-only and does not execute migration, SQL, or Prisma commands.",
      "No secret values or .env contents are printed."
    ]),
    "",
    "## Migration 文件扫描",
    list(audit.migrationFilesDetected.map((file) =>
      `${file.relativePath} | destructiveRisks=${file.destructiveRisks.length}`
    )),
    "",
    "## 命令风险",
    list(audit.destructiveCommandRisks.map((risk) =>
      `${risk.riskLevel} | ${risk.riskType} | ${risk.command}`
    )),
    "",
    "## 阻塞项",
    list(audit.blockers),
    "",
    "## Warnings",
    list(audit.warnings),
    "",
    "## 下一步",
    list(audit.safeToRunMigration
      ? ["Do not run migration until the user explicitly enters migration release mode."]
      : ["Keep RUN_PRISMA_MIGRATE unset or 0. Do not run migration until blockers are cleared."])
  ].join("\n");
}

function formatChecklistItem(item: EbosMigrationReleaseChecklistItem) {
  return `${item.status} | ${item.title} | required=${item.required} | blockerIfMissing=${item.blockerIfMissing} | ${item.description}`;
}

function list(items: string[] = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

