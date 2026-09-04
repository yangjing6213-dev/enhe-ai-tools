import { describe, expect, test } from "vitest";
import { buildMigrationReleaseRunbook } from "../migration-release-runbook";
import {
  renderMigrationReleaseRiskAuditMarkdown,
  renderMigrationReleaseRunbookMarkdown
} from "../migration-release-markdown";
import type { EbosMigrationReleaseRiskAudit } from "../migration-release-types";

describe("migration release markdown", () => {
  test("renders the 11 required Chinese runbook headings", () => {
    const markdown = renderMigrationReleaseRunbookMarkdown(
      buildMigrationReleaseRunbook({ targetDate: "2026-07-03" })
    );

    expect(markdown).toContain("## 1. 当前结论");
    expect(markdown).toContain("## 2. Migration Guard 规则");
    expect(markdown).toContain("## 3. 什么时候允许 RUN_PRISMA_MIGRATE=1");
    expect(markdown).toContain("## 4. 什么时候禁止运行 migration");
    expect(markdown).toContain("## 5. 专用确认句");
    expect(markdown).toContain("## 6. 迁移前检查清单");
    expect(markdown).toContain("## 7. 执行计划");
    expect(markdown).toContain("## 8. 迁移后验证");
    expect(markdown).toContain("## 9. 回滚方案");
    expect(markdown).toContain("## 10. 风险与阻塞项");
    expect(markdown).toContain("## 11. 下一步操作");
  });

  test("states runbook does not execute migration or print secrets", () => {
    const markdown = renderMigrationReleaseRunbookMarkdown(
      buildMigrationReleaseRunbook({ targetDate: "2026-07-03" })
    );

    expect(markdown).toContain("不执行 migration");
    expect(markdown).toContain("不打印 secret");
    expect(markdown).toContain("确认执行数据库迁移");
    expect(markdown).toContain("确认执行真实部署命令 不等于允许 migration");
    expect(markdown).toContain("确认部署验证页 不等于允许 migration");
  });

  test("renders blocked risk audit without claiming backup exists", () => {
    const audit: EbosMigrationReleaseRiskAudit = {
      auditType: "migration_release_risk_audit",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      migrationFilesDetected: [],
      pendingMigrationIntent: false,
      destructiveCommandRisks: [],
      secretExposureRisks: [],
      backupEvidenceRequired: true,
      approvalRequired: true,
      safeToRunMigration: false,
      blockers: ["database backup evidence is missing"],
      warnings: ["Audit is read-only and does not execute SQL or Prisma commands."]
    };
    const markdown = renderMigrationReleaseRiskAuditMarkdown(audit);

    expect(markdown).toContain("safeToRunMigration: false");
    expect(markdown).toContain("database backup evidence is missing");
    expect(markdown).toContain("does not execute migration");
    expect(markdown).toContain("No secret values or .env contents are printed.");
  });
});

