import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateMonthlyReviewPlan } from "../../monthly/monthly-review-plan";
import { generateNextWeekPlan } from "../../weekly/weekly-report-plan";
import type { EbosMigrationReleaseStatusSummary } from "../migration-release-types";
import {
  buildMigrationReleaseRunbook,
  DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE,
  isDeploymentOnlyConfirmation,
  isMigrationReleaseConfirmation,
  MIGRATION_RELEASE_CONFIRMATION_PHRASE,
  VALIDATION_PAGE_CONFIRMATION_PHRASE
} from "../migration-release-runbook";

function migrationReleaseStatus(): EbosMigrationReleaseStatusSummary {
  return {
    status: "audit_generated",
    targetDate: "2026-07-03",
    runbookPath: "reports/ebos/deployment/migration-release/2026-07-03-migration-release-runbook.json",
    riskAuditPath: "reports/ebos/deployment/migration-release/2026-07-03-migration-release-risk-audit.json",
    migrationGuardVariable: "RUN_PRISMA_MIGRATE",
    defaultMigrationBehavior: "skip_unless_explicit",
    explicitEnableValue: "1",
    safeToRunMigration: false,
    blockers: ["database backup evidence is missing"],
    warnings: ["Audit is read-only and does not execute SQL or Prisma commands."],
    summary: "Migration release risk audit exists and safeToRunMigration=false."
  };
}

describe("migration release runbook", () => {
  test("builds a runbook that does not execute migration by default", () => {
    const runbook = buildMigrationReleaseRunbook({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z"
    });

    expect(runbook).toMatchObject({
      runbookType: "migration_release_mode_runbook",
      targetDate: "2026-07-03",
      migrationGuardVariable: "RUN_PRISMA_MIGRATE",
      defaultMigrationBehavior: "skip_unless_explicit",
      explicitEnableValue: "1"
    });
    expect(runbook.warnings.join("\n")).toContain("does not execute migration");
    expect(runbook.nextActions.join("\n")).toContain("RUN_PRISMA_MIGRATE unset or 0");
  });

  test("allowed use cases require migration files, review, backup, rollback, and dedicated approval", () => {
    const text = buildMigrationReleaseRunbook({ targetDate: "2026-07-03" }).allowedUseCases.join("\n");

    expect(text).toContain("Prisma migration");
    expect(text).toContain("review");
    expect(text).toContain("数据库备份");
    expect(text).toContain("回滚策略");
    expect(text).toContain(MIGRATION_RELEASE_CONFIRMATION_PHRASE);
    expect(text).toContain("schema");
  });

  test("forbidden use cases include page, copy, report, pack, synthetic, no-migration, Docker, and Nginx updates", () => {
    const text = buildMigrationReleaseRunbook({ targetDate: "2026-07-03" }).forbiddenUseCases.join("\n");

    expect(text).toContain("EBOS 页面更新");
    expect(text).toContain("验证页文案更新");
    expect(text).toContain("报告脚本更新");
    expect(text).toContain("external publishing pack");
    expect(text).toContain("synthetic report");
    expect(text).toContain("没有 migration 文件");
    expect(text).toContain("Docker");
    expect(text).toContain("Nginx");
  });

  test("deployment confirmation phrases cannot authorize migration", () => {
    expect(isDeploymentOnlyConfirmation(DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE)).toBe(true);
    expect(isDeploymentOnlyConfirmation(VALIDATION_PAGE_CONFIRMATION_PHRASE)).toBe(true);
    expect(isMigrationReleaseConfirmation(DEPLOYMENT_EXECUTION_CONFIRMATION_PHRASE)).toBe(false);
    expect(isMigrationReleaseConfirmation(VALIDATION_PAGE_CONFIRMATION_PHRASE)).toBe(false);
    expect(isMigrationReleaseConfirmation(MIGRATION_RELEASE_CONFIRMATION_PHRASE)).toBe(true);
  });

  test("weekly plan references runbook without recommending migration while audit is blocked", () => {
    const plan = generateNextWeekPlan(
      createEmptyEbosReport("weekly", new Date("2026-07-03T12:00:00")),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      migrationReleaseStatus()
    );
    const text = JSON.stringify(plan);

    expect(text).toContain("migration skipped");
    expect(text).toContain("safeToRunMigration=false");
    expect(text).not.toContain("Execute migration");
  });

  test("monthly plan references runbook without recommending migration while audit is blocked", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      migrationReleaseStatus: migrationReleaseStatus()
    });
    const text = JSON.stringify(plan);

    expect(text).toContain("migration skipped");
    expect(text).toContain("safeToRunMigration=false");
    expect(text).not.toContain("Execute migration");
  });
});

