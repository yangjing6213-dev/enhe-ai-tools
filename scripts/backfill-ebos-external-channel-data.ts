import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  normalizeExternalPublishResultInput,
  validateExternalPublishResultInput,
  writeMappedExternalIntake
} from "@/lib/ebos/external-publishing";

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

function parseTargetDate() {
  const value = readArg("--date");
  if (!value) return formatDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const apply = hasFlag("--apply");
  const inputPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "external-publishing",
    "inputs",
    `${targetDate}-external-publish-result-input.json`
  );
  const externalIntakeInputPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "validation",
    "intake",
    "inputs",
    `${targetDate}-external-intake-input.json`
  );
  const input = normalizeExternalPublishResultInput(JSON.parse(await readFile(inputPath, "utf8")));
  const validation = validateExternalPublishResultInput(input);
  const report = await writeMappedExternalIntake({
    targetDate,
    inputPath,
    externalIntakeInputPath,
    apply
  });

  console.log("EBOS external channel data backfill:");
  console.log(`- input: ${inputPath}`);
  console.log(`- external intake input: ${externalIntakeInputPath}`);
  console.log(`- dryRun: ${report.dryRun}`);
  console.log(`- apply requested: ${apply}`);
  console.log(`- applied: ${report.applied}`);
  console.log(`- hasRealSignals: ${validation.hasRealSignals}`);
  console.log(`- canBackfill: ${validation.canBackfill}`);
  console.log(`- publishCoverage: ${validation.publishCoverage}`);
  console.log(`- dataCoverage: ${validation.dataCoverage}`);
  console.log(`- backupPath: ${report.backupPath ?? "none"}`);
  console.log(`- mappedRecordsCount: ${report.mappedRecordsCount}`);
  console.log(`- mergedRecordsCount: ${report.mergedRecordsCount}`);
  console.log(`- summary: ${report.summary}`);
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
