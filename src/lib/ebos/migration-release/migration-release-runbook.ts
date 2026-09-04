import {
  buildMigrationApprovalChecklist,
  buildMigrationExecutionPlan,
  buildMigrationRollbackChecklist,
  buildPostMigrationVerificationChecklist,
  buildPreMigrationChecklist
} from "./migration-release-checklist";
import type { EbosMigrationReleaseRunbook } from "./migration-release-types";

export const MIGRATION_RELEASE_CONFIRMATION_PHRASE = "确认执行数据库迁移";
export const DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE = "确认执行真实部署命令";
export const VALIDATION_PAGE_CONFIRMATION_PHRASE = "确认部署验证页";

export function buildMigrationReleaseRunbook(options: {
  targetDate: string | Date;
  generatedAt?: string;
}): EbosMigrationReleaseRunbook {
  return {
    runbookType: "migration_release_mode_runbook",
    targetDate: toDateKey(options.targetDate),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    migrationGuardVariable: "RUN_PRISMA_MIGRATE",
    defaultMigrationBehavior: "skip_unless_explicit",
    explicitEnableValue: "1",
    allowedUseCases: [
      "本轮有明确 Prisma migration 文件。",
      "migration 内容已 review。",
      "已确认数据库备份。",
      "已确认回滚策略。",
      "用户明确回复 migration 专用确认句：确认执行数据库迁移。",
      "生产部署确实需要 schema 变更。"
    ],
    forbiddenUseCases: [
      "EBOS 页面更新。",
      "验证页文案更新。",
      "报告脚本更新。",
      "external publishing pack 更新。",
      "synthetic report 更新。",
      "没有 migration 文件的普通发布。",
      "只是 Docker 重启。",
      "只是 Nginx reload。"
    ],
    approvalChecklist: buildMigrationApprovalChecklist(),
    preMigrationChecklist: buildPreMigrationChecklist(),
    executionPlan: buildMigrationExecutionPlan(),
    postMigrationVerification: buildPostMigrationVerificationChecklist(),
    rollbackPlan: buildMigrationRollbackChecklist(),
    warnings: [
      "This runbook does not execute migration.",
      `${DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE} does not authorize migration.`,
      `${VALIDATION_PAGE_CONFIRMATION_PHRASE} does not authorize migration.`,
      `Only ${MIGRATION_RELEASE_CONFIRMATION_PHRASE} allows entering migration release mode.`,
      "Do not print secrets, database URLs, cookies, tokens, or .env contents."
    ],
    nextActions: [
      "Keep RUN_PRISMA_MIGRATE unset or 0 for page, copy, report, and read-only EBOS releases.",
      "Before any real migration, generate risk audit and attach backup evidence.",
      "Ask for the dedicated confirmation phrase only after migration review, backup evidence, and rollback plan are ready."
    ]
  };
}

export function isMigrationReleaseConfirmation(response: string) {
  return response.trim() === MIGRATION_RELEASE_CONFIRMATION_PHRASE;
}

export function isDeploymentOnlyConfirmation(response: string) {
  const value = response.trim();
  return value === DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE
    || value === VALIDATION_PAGE_CONFIRMATION_PHRASE;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

