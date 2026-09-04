import type { EbosMigrationReleaseChecklistItem } from "./migration-release-types";

function item(input: EbosMigrationReleaseChecklistItem): EbosMigrationReleaseChecklistItem {
  return input;
}

export function buildMigrationApprovalChecklist(): EbosMigrationReleaseChecklistItem[] {
  return [
    item({
      id: "approval-dedicated-confirmation",
      title: "Dedicated migration confirmation phrase received",
      required: true,
      status: "manual_required",
      description: "User must reply exactly: 确认执行数据库迁移.",
      evidence: "确认执行数据库迁移",
      blockerIfMissing: true
    }),
    item({
      id: "approval-not-deployment-phrase",
      title: "Deployment confirmation phrases are not reused",
      required: true,
      status: "manual_required",
      description: "确认执行真实部署命令 and 确认部署验证页 do not authorize database migration.",
      blockerIfMissing: true
    }),
    item({
      id: "approval-schema-change-required",
      title: "Production release requires a schema change",
      required: true,
      status: "manual_required",
      description: "Migration release mode is allowed only when the production release cannot work without a reviewed schema change.",
      blockerIfMissing: true
    })
  ];
}

export function buildPreMigrationChecklist(): EbosMigrationReleaseChecklistItem[] {
  return [
    item({
      id: "pre-migration-file-exists",
      title: "New Prisma migration file exists",
      required: true,
      status: "manual_required",
      description: "Confirm there is an explicit Prisma migration file for this release.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-migration-reviewed",
      title: "Migration file reviewed",
      required: true,
      status: "manual_required",
      description: "Review migration SQL and Prisma schema diff before enabling RUN_PRISMA_MIGRATE=1.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-backup-evidence",
      title: "Database backup evidence confirmed",
      required: true,
      status: "manual_required",
      description: "Record backup timestamp, location, and restore owner without printing secrets.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-no-critical-drop",
      title: "No critical table or field deletion confirmed",
      required: true,
      status: "manual_required",
      description: "Confirm the migration does not delete critical payment, order, user, product, or revenue data.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-no-destructive-sql",
      title: "No destructive SQL confirmed",
      required: true,
      status: "manual_required",
      description: "Scan for DROP TABLE, DROP COLUMN, TRUNCATE, DELETE FROM, ALTER TYPE, and DROP INDEX.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-maintenance-window",
      title: "Maintenance window confirmed",
      required: true,
      status: "manual_required",
      description: "Confirm a release window and the person responsible for monitoring production.",
      blockerIfMissing: true
    }),
    item({
      id: "pre-rollback-strategy",
      title: "Rollback strategy confirmed",
      required: true,
      status: "manual_required",
      description: "Document app rollback, data restore criteria, and stop conditions before migration.",
      blockerIfMissing: true
    })
  ];
}

export function buildMigrationExecutionPlan(): EbosMigrationReleaseChecklistItem[] {
  return [
    item({
      id: "execution-set-run-prisma-migrate",
      title: "Set RUN_PRISMA_MIGRATE=1 only for the approved migration release",
      required: true,
      status: "manual_required",
      description: "RUN_PRISMA_MIGRATE must remain unset or 0 for EBOS page, copy, report, Docker-only, or Nginx-only releases.",
      blockerIfMissing: true
    }),
    item({
      id: "execution-run-reviewed-command",
      title: "Run only the reviewed migration command",
      required: true,
      status: "manual_required",
      description: "The migration command remains high risk and must be run only after the dedicated approval phrase and backup evidence.",
      blockerIfMissing: true
    }),
    item({
      id: "execution-record-output",
      title: "Record migration result without secrets",
      required: true,
      status: "manual_required",
      description: "Record success/failure, migration names, timestamps, and errors. Do not print environment values.",
      blockerIfMissing: true
    })
  ];
}

export function buildPostMigrationVerificationChecklist(): EbosMigrationReleaseChecklistItem[] {
  return [
    item({
      id: "post-smoke-test",
      title: "Run post-migration smoke test",
      required: true,
      status: "manual_required",
      description: "Run smoke checks after migration and before marking the release healthy.",
      blockerIfMissing: true
    }),
    item({
      id: "post-order-payment-login-product",
      title: "Verify orders, payments, login, and product pages",
      required: true,
      status: "manual_required",
      description: "Confirm order creation, payment paths, login/session behavior, product detail pages, and revenue views still work.",
      blockerIfMissing: true
    }),
    item({
      id: "post-ebos-report-refresh",
      title: "Refresh EBOS reports after verification",
      required: false,
      status: "pending",
      description: "Regenerate EBOS weekly/monthly reports only after observed migration and smoke test evidence exists.",
      blockerIfMissing: false
    })
  ];
}

export function buildMigrationRollbackChecklist(): EbosMigrationReleaseChecklistItem[] {
  return [
    item({
      id: "rollback-app-version",
      title: "Application rollback version identified",
      required: true,
      status: "manual_required",
      description: "Identify the previous commit/image that can run against the current or restored database.",
      blockerIfMissing: true
    }),
    item({
      id: "rollback-database-restore",
      title: "Database restore criteria defined",
      required: true,
      status: "manual_required",
      description: "Define when to restore backup, who approves restore, and how restore success is verified.",
      blockerIfMissing: true
    }),
    item({
      id: "rollback-user-impact",
      title: "User impact and data loss window documented",
      required: true,
      status: "manual_required",
      description: "Document the possible data loss window and customer-impact notes before release.",
      blockerIfMissing: true
    })
  ];
}

