import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  normalizeExternalPublishResultInput,
  summarizeExternalPublishResults,
  validateExternalPublishResultInput
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
  const inputPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "external-publishing",
    "inputs",
    `${targetDate}-external-publish-result-input.json`
  );
  const input = normalizeExternalPublishResultInput(JSON.parse(await readFile(inputPath, "utf8")));
  const validation = validateExternalPublishResultInput(input);
  const summary = summarizeExternalPublishResults(input);

  console.log("EBOS external publish result check:");
  console.log(`- Input: ${inputPath}`);
  console.log(`- valid: ${validation.valid}`);
  console.log(`- publishCoverage: ${validation.publishCoverage}`);
  console.log(`- dataCoverage: ${validation.dataCoverage}`);
  console.log(`- hasRealSignals: ${validation.hasRealSignals}`);
  console.log(`- canBackfill: ${validation.canBackfill}`);
  console.log(`- publishedChannels: ${summary.publishedChannels.join(", ") || "none"}`);
  console.log(`- channelsWithData: ${summary.channelsWithData.join(", ") || "none"}`);
  console.log(`- warnings: ${validation.warnings.length}`);
  for (const warning of validation.warnings) console.log(`  - ${warning}`);
  console.log(`- blockers: ${validation.blockers.length}`);
  for (const blocker of validation.blockers) console.log(`  - ${blocker}`);
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
