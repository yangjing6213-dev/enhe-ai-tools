import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import type {
  EbosMigrationReleaseCommandRisk,
  EbosMigrationReleaseFile,
  EbosMigrationReleaseFileRisk,
  EbosMigrationReleaseRiskAudit
} from "./migration-release-types";

const HIGH_RISK_SQL_KEYWORDS = [
  "DROP TABLE",
  "DROP COLUMN",
  "TRUNCATE",
  "DELETE FROM",
  "ALTER TYPE",
  "DROP INDEX"
] as const;
const execFileAsync = promisify(execFile);

export async function auditMigrationReleaseReadiness(options: {
  targetDate: string | Date;
  rootDir?: string;
  generatedAt?: string;
  backupEvidencePaths?: string[];
  approvalPhraseReceived?: string | null;
  commands?: string[];
  migrationFileDetectionMode?: "git_changed" | "all";
}): Promise<EbosMigrationReleaseRiskAudit> {
  const rootDir = options.rootDir ?? process.cwd();
  const migrationFilesDetected = options.migrationFileDetectionMode === "all"
    ? await detectMigrationFiles(rootDir)
    : await detectChangedMigrationFiles(rootDir);
  const destructiveCommandRisks = detectMigrationCommandRisks(options.commands ?? []);
  const secretExposureRisks = destructiveCommandRisks
    .filter((risk) => risk.riskType === "secret_exposure")
    .map((risk) => risk.command);
  const backupEvidenceFound = await hasBackupEvidence(options.backupEvidencePaths ?? []);
  const hasDedicatedApproval = options.approvalPhraseReceived?.trim() === "确认执行数据库迁移";
  const fileRisks = detectDestructiveMigrationRisks(migrationFilesDetected);
  const blockers = [
    ...(migrationFilesDetected.length === 0 ? ["no migration files detected"] : []),
    ...(!backupEvidenceFound ? ["database backup evidence is missing"] : []),
    ...(!hasDedicatedApproval ? ["dedicated migration confirmation phrase is missing"] : []),
    ...(fileRisks.length > 0 ? [`destructive migration SQL risks detected: ${fileRisks.length}`] : []),
    ...(destructiveCommandRisks.length > 0 ? [`high-risk migration command risks detected: ${destructiveCommandRisks.length}`] : [])
  ];
  const warnings = [
    "Audit is read-only and does not execute SQL or Prisma commands.",
    "Do not treat deployment confirmation phrases as migration approval.",
    ...(migrationFilesDetected.length > 0 ? [`migration SQL files scanned: ${migrationFilesDetected.length}`] : []),
    ...(!backupEvidenceFound ? ["Backup evidence must be attached before any migration release."] : [])
  ];

  return {
    auditType: "migration_release_risk_audit",
    targetDate: toDateKey(options.targetDate),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    migrationFilesDetected,
    pendingMigrationIntent: migrationFilesDetected.length > 0 && hasDedicatedApproval,
    destructiveCommandRisks,
    secretExposureRisks,
    backupEvidenceRequired: true,
    approvalRequired: true,
    safeToRunMigration: blockers.length === 0,
    blockers,
    warnings
  };
}

export async function detectMigrationFiles(rootDir: string): Promise<EbosMigrationReleaseFile[]> {
  const migrationsDir = join(rootDir, "prisma", "migrations");
  const files: EbosMigrationReleaseFile[] = [];
  await walk(migrationsDir);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".sql")) continue;
      const source = await readFile(fullPath, "utf8");
      files.push({
        filePath: fullPath,
        relativePath: relative(rootDir, fullPath).replace(/\\/g, "/"),
        destructiveRisks: scanSqlRisks(source)
      });
    }
  }
}

async function detectChangedMigrationFiles(rootDir: string) {
  const changedPaths = await readGitChangedMigrationSqlPaths(rootDir);
  if (changedPaths === null) {
    return detectMigrationFiles(rootDir);
  }

  const files: EbosMigrationReleaseFile[] = [];
  for (const relativePath of changedPaths) {
    const filePath = join(rootDir, relativePath);
    try {
      const source = await readFile(filePath, "utf8");
      files.push({
        filePath,
        relativePath: relativePath.replace(/\\/g, "/"),
        destructiveRisks: scanSqlRisks(source)
      });
    } catch {
      // Deleted or moved migration files are not executable migration input for this runbook.
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function readGitChangedMigrationSqlPaths(rootDir: string): Promise<string[] | null> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "--", "prisma/migrations"], {
      cwd: rootDir,
      windowsHide: true
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.slice(3).trim())
      .map((line) => line.replace(/^"|"$/g, ""))
      .filter((filePath) => filePath.replace(/\\/g, "/").endsWith(".sql"));
  } catch {
    return null;
  }
}

export function detectDestructiveMigrationRisks(
  migrationFiles: EbosMigrationReleaseFile[]
): EbosMigrationReleaseFileRisk[] {
  return migrationFiles.flatMap((file) => file.destructiveRisks);
}

export function detectMigrationCommandRisks(commands: string[]): EbosMigrationReleaseCommandRisk[] {
  return commands.flatMap((command): EbosMigrationReleaseCommandRisk[] => {
    const risks: EbosMigrationReleaseCommandRisk[] = [];
    if (/prisma\s+migrate\s+(deploy|reset|dev)/i.test(command)) {
      risks.push({
        command,
        riskType: "migration_command",
        riskLevel: "high",
        requiresExplicitApproval: true,
        message: "Prisma migration command requires dedicated migration approval and backup evidence."
      });
    }
    if (/\b(drop\s+database|drop\s+table|truncate|delete\s+from)\b/i.test(command)) {
      risks.push({
        command,
        riskType: "destructive_database_command",
        riskLevel: "high",
        requiresExplicitApproval: true,
        message: "Destructive database command is forbidden unless separately reviewed and approved."
      });
    }
    if (/\b(cat|type|get-content)\s+\.env\b/i.test(command) || /^env$/i.test(command.trim()) || /^printenv\b/i.test(command.trim())) {
      risks.push({
        command,
        riskType: "secret_exposure",
        riskLevel: "high",
        requiresExplicitApproval: true,
        message: "Command may expose secrets and must not be run or printed by EBOS."
      });
    }
    return risks;
  });
}

function scanSqlRisks(source: string): EbosMigrationReleaseFileRisk[] {
  const risks: EbosMigrationReleaseFileRisk[] = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const keyword of HIGH_RISK_SQL_KEYWORDS) {
      const pattern = keyword.split(/\s+/).map(escapeRegExp).join("\\s+");
      if (new RegExp(`\\b${pattern}\\b`, "i").test(line)) {
        risks.push({
          keyword,
          line: index + 1,
          text: line.trim().slice(0, 200),
          severity: "high"
        });
      }
    }
  });

  return risks;
}

async function hasBackupEvidence(paths: string[]) {
  for (const filePath of paths) {
    try {
      await access(filePath);
      return true;
    } catch {
      // Missing backup evidence keeps the audit blocked.
    }
  }
  return false;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
