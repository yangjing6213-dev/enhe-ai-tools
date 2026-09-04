import { describe, expect, test } from "vitest";
import {
  buildMigrationApprovalChecklist,
  buildMigrationExecutionPlan,
  buildMigrationRollbackChecklist,
  buildPostMigrationVerificationChecklist,
  buildPreMigrationChecklist
} from "../migration-release-checklist";

describe("migration release checklists", () => {
  test("approval checklist requires the dedicated migration phrase", () => {
    const checklist = buildMigrationApprovalChecklist();
    const text = JSON.stringify(checklist);

    expect(checklist.every((item) => item.status === "manual_required")).toBe(true);
    expect(text).toContain("确认执行数据库迁移");
    expect(text).toContain("确认执行真实部署命令");
    expect(text).toContain("确认部署验证页");
  });

  test("pre-migration checklist covers files, review, backup, destructive SQL, window, and rollback", () => {
    const text = JSON.stringify(buildPreMigrationChecklist());

    expect(text).toContain("New Prisma migration file exists");
    expect(text).toContain("Migration file reviewed");
    expect(text).toContain("Database backup evidence confirmed");
    expect(text).toContain("No critical table or field deletion confirmed");
    expect(text).toContain("No destructive SQL confirmed");
    expect(text).toContain("Maintenance window confirmed");
    expect(text).toContain("Rollback strategy confirmed");
  });

  test("execution and verification checklist includes RUN_PRISMA_MIGRATE and smoke/business checks", () => {
    const text = JSON.stringify([
      ...buildMigrationExecutionPlan(),
      ...buildPostMigrationVerificationChecklist()
    ]);

    expect(text).toContain("RUN_PRISMA_MIGRATE=1");
    expect(text).toContain("smoke test");
    expect(text).toContain("orders, payments, login, and product pages");
  });

  test("rollback checklist requires app rollback, database restore, and user impact notes", () => {
    const text = JSON.stringify(buildMigrationRollbackChecklist());

    expect(text).toContain("Application rollback version identified");
    expect(text).toContain("Database restore criteria defined");
    expect(text).toContain("User impact and data loss window documented");
  });
});

