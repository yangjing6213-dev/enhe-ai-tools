import { resolve } from "node:path";
import { applyExternalIntakeChanges } from "@/lib/ebos/validation-intake";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
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
  const inputArg = readArg("--input");
  const apply = hasFlag("--apply");
  const force = hasFlag("--force");
  const inputPath = resolve(process.cwd(), inputArg ?? `reports/ebos/validation/intake/inputs/${targetDate}-external-intake-input.json`);
  const validationInputPath = resolve(process.cwd(), `reports/ebos/validation/inputs/${targetDate}-validation-input.json`);
  const result = await applyExternalIntakeChanges({
    targetDate,
    inputPath,
    validationInputPath,
    reportsRoot: resolve(process.cwd(), "reports", "ebos"),
    dryRun: !apply,
    force
  });

  console.log("EBOS external intake import result:");
  console.log(`- Dry run: ${result.dryRun ? "yes" : "no"}`);
  console.log(`- Input: ${result.inputPath}`);
  console.log(`- Validation input: ${result.validationInputPath}`);
  console.log(`- Imported channels/plans: ${result.importedChannelsCount}/${result.importedPlansCount}`);
  console.log(`- Applied changes: ${result.appliedChanges.length}`);
  console.log(`- Skipped changes: ${result.skippedChanges.length}`);
  console.log(`- Validation warnings: ${result.validationWarnings.length}`);
  console.log(`- Data quality warnings: ${result.dataQualityWarnings.length}`);
  console.log(`- Summary: ${result.summary}`);
  if (result.backupPath) console.log(`- Backup: ${result.backupPath}`);
  if (result.importReportJsonPath) console.log(`- Import report JSON: ${result.importReportJsonPath}`);
  if (result.importReportMarkdownPath) console.log(`- Import report Markdown: ${result.importReportMarkdownPath}`);
  console.log("- Next suggested commands:");
  console.log(`  - npx tsx scripts/check-ebos-validation-input.ts --date ${targetDate}`);
  console.log(`  - npx tsx scripts/generate-ebos-validation-report.ts --date ${targetDate}`);
  console.log(`  - npx tsx scripts/generate-ebos-decision-report.ts --date ${targetDate}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
