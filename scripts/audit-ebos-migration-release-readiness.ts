import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  auditMigrationReleaseReadiness,
  renderMigrationReleaseRiskAuditMarkdown
} from "@/lib/ebos/migration-release";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function readArgs(name: string) {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1] ?? null;
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${name}.`);
    }
    values.push(value);
  }
  return values;
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const audit = await auditMigrationReleaseReadiness({
    targetDate,
    rootDir: process.cwd(),
    backupEvidencePaths: readArgs("--backup-evidence"),
    approvalPhraseReceived: readArg("--approval-response")
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "migration-release");
  const jsonPath = resolve(outputDir, `${targetDate}-migration-release-risk-audit.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-migration-release-risk-audit.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderMigrationReleaseRiskAuditMarkdown(audit)}\n`, "utf8");

  console.log("EBOS migration release readiness audit generated:");
  console.log(`- migrationFilesDetected: ${audit.migrationFilesDetected.length}`);
  console.log(`- destructiveCommandRisks: ${audit.destructiveCommandRisks.length}`);
  console.log(`- secretExposureRisks: ${audit.secretExposureRisks.length}`);
  console.log(`- backupEvidenceRequired: ${audit.backupEvidenceRequired}`);
  console.log(`- approvalRequired: ${audit.approvalRequired}`);
  console.log(`- safeToRunMigration: ${audit.safeToRunMigration}`);
  console.log(`- blockers count: ${audit.blockers.length}`);
  console.log(`- warnings count: ${audit.warnings.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

