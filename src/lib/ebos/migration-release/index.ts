import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosMigrationReleaseRiskAudit,
  EbosMigrationReleaseRunbook,
  EbosMigrationReleaseStatusSummary
} from "./migration-release-types";

export * from "./migration-release-checklist";
export * from "./migration-release-markdown";
export * from "./migration-release-risk-auditor";
export * from "./migration-release-runbook";
export * from "./migration-release-types";

export async function readMigrationReleaseStatusForDate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<EbosMigrationReleaseStatusSummary> {
  const targetDate = toDateKey(options.targetDate);
  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment", "migration-release").replace(/\\/g, "/");
  const runbookPath = `${directory}/${targetDate}-migration-release-runbook.json`;
  const auditPath = `${directory}/${targetDate}-migration-release-risk-audit.json`;
  const runbook = await readRunbookFile(runbookPath);
  const audit = await readAuditFile(auditPath);

  if (runbook || audit) {
    return {
      status: audit ? "audit_generated" : "runbook_generated",
      targetDate,
      ...(runbook ? { runbookPath } : {}),
      ...(audit ? { riskAuditPath: auditPath } : {}),
      migrationGuardVariable: runbook?.migrationGuardVariable ?? "RUN_PRISMA_MIGRATE",
      defaultMigrationBehavior: runbook?.defaultMigrationBehavior ?? "skip_unless_explicit",
      explicitEnableValue: runbook?.explicitEnableValue ?? "1",
      safeToRunMigration: audit?.safeToRunMigration ?? false,
      blockers: audit?.blockers ?? [],
      warnings: [...(runbook?.warnings ?? []), ...(audit?.warnings ?? [])],
      summary: audit
        ? `Migration release risk audit exists and safeToRunMigration=${audit.safeToRunMigration}.`
        : "Migration release runbook exists; no risk audit has been applied yet."
    };
  }

  return {
    status: "not_generated",
    targetDate,
    migrationGuardVariable: "RUN_PRISMA_MIGRATE",
    defaultMigrationBehavior: "skip_unless_explicit",
    explicitEnableValue: "1",
    safeToRunMigration: false,
    blockers: ["migration release runbook is not generated"],
    warnings: [],
    summary: "Migration release mode runbook is not generated yet."
  };
}

export async function readLatestMigrationReleaseStatus(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<EbosMigrationReleaseStatusSummary> {
  if (options.targetDate) {
    return readMigrationReleaseStatusForDate({
      targetDate: options.targetDate,
      reportsRoot: options.reportsRoot
    });
  }

  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment", "migration-release").replace(/\\/g, "/");
  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-migration-release-runbook.json"))
      .sort()
      .at(-1);
    if (!fileName) {
      return readMigrationReleaseStatusForDate({
        targetDate: new Date(),
        reportsRoot: options.reportsRoot
      });
    }
    return readMigrationReleaseStatusForDate({
      targetDate: fileName.slice(0, 10),
      reportsRoot: options.reportsRoot
    });
  } catch {
    return readMigrationReleaseStatusForDate({
      targetDate: new Date(),
      reportsRoot: options.reportsRoot
    });
  }
}

async function readRunbookFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosMigrationReleaseRunbook;
    return report.runbookType === "migration_release_mode_runbook" ? report : null;
  } catch {
    return null;
  }
}

async function readAuditFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosMigrationReleaseRiskAudit;
    return report.auditType === "migration_release_risk_audit" ? report : null;
  } catch {
    return null;
  }
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

