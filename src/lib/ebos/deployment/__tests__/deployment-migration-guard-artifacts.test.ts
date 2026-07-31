import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { detectMigrationGuard } from "../deployment-config-reader";

describe("deployment migration guard artifacts", () => {
  test("app startup never runs database migrations", async () => {
    const source = await readFile(join(process.cwd(), "deploy", "enhe-ai-tools", "scripts", "app-entrypoint.sh"), "utf8");

    expect(source).not.toContain("RUN_PRISMA_MIGRATE");
    expect(source).not.toContain("prisma migrate deploy");
  });

  test("deployment backs up and verifies before a one-shot migration", async () => {
    const source = await readFile(join(process.cwd(), "deploy.sh"), "utf8");
    const backupIndex = source.indexOf("enhe-backup-db.sh");
    const verifyIndex = source.indexOf("pg_restore --list");
    const migrateIndex = source.indexOf(
      "compose run --rm --no-deps app",
      verifyIndex,
    );

    expect(backupIndex).toBeGreaterThan(-1);
    expect(verifyIndex).toBeGreaterThan(backupIndex);
    expect(migrateIndex).toBeGreaterThan(verifyIndex);
    expect(source.slice(migrateIndex)).toContain("prisma migrate deploy");
  });

  test("deployment checker detects skip unless explicit migration guard", async () => {
    const guard = await detectMigrationGuard(process.cwd());

    expect(guard).toEqual(expect.objectContaining({
      migrationGuardDetected: true,
      guardVariable: "none",
      defaultMigrationBehavior: "skip_unless_explicit",
      migrationCommandRequiresExplicitApproval: true
    }));
  });

  test("docs and report state that no migration was executed this step", async () => {
    const doc = await readFile(join(process.cwd(), "docs", "ebos", "37-EBOS-App-Entrypoint-Migration-Guard.md"), "utf8");
    const report = JSON.parse(await readFile(
      join(process.cwd(), "reports", "ebos", "deployment", "2026-07-03-app-entrypoint-migration-guard.json"),
      "utf8"
    )) as { migrationExecutedThisStep?: boolean; defaultBehavior?: string };

    expect(doc).toContain("本阶段不执行 `prisma migrate deploy`");
    expect(report.migrationExecutedThisStep).toBe(false);
    expect(report.defaultBehavior).toBe("skip_unless_explicit");
  });
});
