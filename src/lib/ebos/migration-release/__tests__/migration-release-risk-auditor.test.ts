import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  auditMigrationReleaseReadiness,
  detectDestructiveMigrationRisks,
  detectMigrationCommandRisks,
  detectMigrationFiles
} from "../migration-release-risk-auditor";

async function fixtureRoot() {
  return mkdtemp(join(tmpdir(), "ebos-migration-release-"));
}

async function writeMigration(rootDir: string, sql: string) {
  const dir = join(rootDir, "prisma", "migrations", "20260703000000_test");
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, "migration.sql");
  await writeFile(filePath, sql, "utf8");
  return filePath;
}

describe("migration release risk auditor", () => {
  test("marks no migration files as unsafe", async () => {
    const rootDir = await fixtureRoot();
    const audit = await auditMigrationReleaseReadiness({
      targetDate: "2026-07-03",
      rootDir,
      approvalPhraseReceived: "确认执行数据库迁移"
    });

    expect(audit.safeToRunMigration).toBe(false);
    expect(audit.blockers).toContain("no migration files detected");
  });

  test("current git workspace reports no pending migration file when migrations are unchanged", async () => {
    const audit = await auditMigrationReleaseReadiness({
      targetDate: "2026-07-03",
      rootDir: process.cwd(),
      approvalPhraseReceived: "确认执行数据库迁移"
    });

    expect(audit.migrationFilesDetected).toEqual([]);
    expect(audit.safeToRunMigration).toBe(false);
    expect(audit.blockers).toContain("no migration files detected");
  });

  test("marks missing backup evidence as unsafe", async () => {
    const rootDir = await fixtureRoot();
    await writeMigration(rootDir, "CREATE TABLE Example (id TEXT PRIMARY KEY);\n");
    const audit = await auditMigrationReleaseReadiness({
      targetDate: "2026-07-03",
      rootDir,
      approvalPhraseReceived: "确认执行数据库迁移"
    });

    expect(audit.migrationFilesDetected).toHaveLength(1);
    expect(audit.safeToRunMigration).toBe(false);
    expect(audit.blockers).toContain("database backup evidence is missing");
  });

  test("detects DROP TABLE, DROP COLUMN, TRUNCATE, DELETE FROM, ALTER TYPE, and DROP INDEX", async () => {
    const rootDir = await fixtureRoot();
    await writeMigration(rootDir, [
      "DROP TABLE OldTable;",
      "ALTER TABLE Product DROP COLUMN legacyField;",
      "TRUNCATE TABLE Temp;",
      "DELETE FROM AuditLog;",
      "ALTER TYPE Status ADD VALUE 'archived';",
      "DROP INDEX OldIndex;"
    ].join("\n"));
    const files = await detectMigrationFiles(rootDir);
    const risks = detectDestructiveMigrationRisks(files);
    const keywords = risks.map((risk) => risk.keyword);

    expect(keywords).toEqual(expect.arrayContaining([
      "DROP TABLE",
      "DROP COLUMN",
      "TRUNCATE",
      "DELETE FROM",
      "ALTER TYPE",
      "DROP INDEX"
    ]));
  });

  test("detects migration commands and secret exposure commands as high risk", () => {
    const risks = detectMigrationCommandRisks([
      "npx prisma migrate deploy",
      "npx prisma migrate reset",
      "Get-Content .env"
    ]);

    expect(risks).toEqual(expect.arrayContaining([
      expect.objectContaining({ riskType: "migration_command", riskLevel: "high", requiresExplicitApproval: true }),
      expect.objectContaining({ riskType: "secret_exposure", riskLevel: "high", requiresExplicitApproval: true })
    ]));
  });

  test("can become safe only with migration file, backup evidence, and dedicated approval", async () => {
    const rootDir = await fixtureRoot();
    await writeMigration(rootDir, "CREATE TABLE Example (id TEXT PRIMARY KEY);\n");
    const backupPath = join(rootDir, "backup-evidence.txt");
    await writeFile(backupPath, "backup evidence placeholder\n", "utf8");
    const audit = await auditMigrationReleaseReadiness({
      targetDate: "2026-07-03",
      rootDir,
      backupEvidencePaths: [backupPath],
      approvalPhraseReceived: "确认执行数据库迁移"
    });

    expect(audit.safeToRunMigration).toBe(true);
    expect(audit.blockers).toEqual([]);
  });
});
