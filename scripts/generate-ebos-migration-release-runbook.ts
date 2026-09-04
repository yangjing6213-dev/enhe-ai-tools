import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildMigrationReleaseRunbook,
  renderMigrationReleaseRunbookMarkdown
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
  const runbook = buildMigrationReleaseRunbook({ targetDate });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "migration-release");
  const jsonPath = resolve(outputDir, `${targetDate}-migration-release-runbook.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-migration-release-runbook.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(runbook, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderMigrationReleaseRunbookMarkdown(runbook)}\n`, "utf8");

  console.log("EBOS migration release runbook generated:");
  console.log(`- migrationGuardVariable: ${runbook.migrationGuardVariable}`);
  console.log(`- defaultMigrationBehavior: ${runbook.defaultMigrationBehavior}`);
  console.log(`- explicitEnableValue: ${runbook.explicitEnableValue}`);
  console.log(`- allowedUseCases count: ${runbook.allowedUseCases.length}`);
  console.log(`- forbiddenUseCases count: ${runbook.forbiddenUseCases.length}`);
  console.log(`- approvalChecklist count: ${runbook.approvalChecklist.length}`);
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

